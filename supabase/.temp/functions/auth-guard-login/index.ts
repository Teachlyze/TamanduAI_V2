// supabase/functions/auth-guard-login/index.ts
// POST: validates hCaptcha, enforces 5-attempt lockout using Upstash REST
// Returns { ok: true } when client can proceed to call supabase.auth.signInWithPassword

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { redisAvailable, redisGet, redisIncr, redisExpire, redisSet } from "../_shared/redis.ts";

const HCAPTCHA_SECRET = Deno.env.get("HCAPTCHA_SECRET") || Deno.env.get("HCAPTCHA_SECRET_KEY");

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 60 * 15; // 15 minutes

async function verifyHCaptcha(token: string, remoteip?: string) {
  if (!HCAPTCHA_SECRET) return { success: false, error: "HCaptcha secret not configured" };
  try {
    const resp = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: HCAPTCHA_SECRET, response: token, remoteip: remoteip ?? "" }),
    });
    const data = await resp.json();
    return data.success ? { success: true } : { success: false, error: "HCaptcha failed" };
  } catch (e) {
    return { success: false, error: "HCaptcha error" };
  }
}

async function getAttemptsKey(email: string) { return `auth:attempts:${email.toLowerCase()}` }
async function getLockKey(email: string) { return `auth:lock:${email.toLowerCase()}` }

serve(async (req) => {
  const origin = req.headers.get('origin') ?? '*';
  const corsHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  }

  try {
    const { email, hcaptchaToken } = await req.json();
    if (!email || !hcaptchaToken) {
      return new Response(JSON.stringify({ error: 'Missing email or hcaptchaToken' }), { status: 400, headers: corsHeaders })
    }

    // verify captcha
    const remoteip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const cap = await verifyHCaptcha(hcaptchaToken, remoteip);
    if (!cap.success) {
      return new Response(JSON.stringify({ error: 'Captcha validation failed' }), { status: 400, headers: corsHeaders })
    }

    // check lock
    const lockKey = await getLockKey(email);
    const lockVal = await redisGet<string>(lockKey);
    if (lockVal) {
      return new Response(JSON.stringify({ error: 'Account locked. Try again later.' }), { status: 423, headers: corsHeaders })
    }

    // increment attempt counter with TTL window
    const attemptsKey = await getAttemptsKey(email);
    const attempts = (await redisIncr(attemptsKey)) ?? 1;

    // set TTL if first increment
    if (attempts === 1) {
      await redisExpire(attemptsKey, WINDOW_SECONDS);
    }

    if (attempts > MAX_ATTEMPTS) {
      // set lock for window
      await redisSet(lockKey, '1');
      await redisExpire(lockKey, WINDOW_SECONDS);
      return new Response(JSON.stringify({ error: 'Too many attempts. Locked for 15 minutes.' }), { status: 429, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true, attempts }), { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('auth-guard-login error', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: corsHeaders })
  }
});
