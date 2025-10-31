// supabase/functions/auth-guard-register/index.ts
// POST: validates hCaptcha, enforces 5-attempt lockout using Upstash REST (registration path)
// Returns { ok: true } when client can proceed to call supabase.auth.signUp
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { redisGet, redisIncr, redisExpire, redisSet } from "../_shared/redis.ts";
const HCAPTCHA_SECRET = Deno.env.get("HCAPTCHA_SECRET") || Deno.env.get("HCAPTCHA_SECRET_KEY");
const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 60 * 15; // 15 minutes
async function verifyHCaptcha(token, remoteip) {
  if (!HCAPTCHA_SECRET) return {
    success: false,
    error: "HCaptcha secret not configured"
  };
  try {
    const resp = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        secret: HCAPTCHA_SECRET,
        response: token,
        remoteip: remoteip ?? ""
      })
    });
    const data = await resp.json();
    return data.success ? {
      success: true
    } : {
      success: false,
      error: "HCaptcha failed"
    };
  } catch (_e) {
    return {
      success: false,
      error: "HCaptcha error"
    };
  }
}
function attemptsKey(email) {
  return `register:attempts:${email.toLowerCase()}`;
}
function lockKey(email) {
  return `register:lock:${email.toLowerCase()}`;
}
serve(async (req)=>{
  const origin = req.headers.get('origin') ?? '*';
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey'
  };
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: corsHeaders
    });
  }
  try {
    const { email, hcaptchaToken } = await req.json();
    if (!email || !hcaptchaToken) {
      return new Response(JSON.stringify({
        error: 'Missing email or hcaptchaToken'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const remoteip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const cap = await verifyHCaptcha(hcaptchaToken, remoteip);
    if (!cap.success) {
      return new Response(JSON.stringify({
        error: 'Captcha validation failed'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    // check lock
    const lKey = lockKey(email);
    const locked = await redisGet(lKey);
    if (locked) {
      return new Response(JSON.stringify({
        error: 'Account locked. Try again later.'
      }), {
        status: 423,
        headers: corsHeaders
      });
    }
    // increment attempts within window
    const aKey = attemptsKey(email);
    const attempts = await redisIncr(aKey) ?? 1;
    if (attempts === 1) {
      await redisExpire(aKey, WINDOW_SECONDS);
    }
    if (attempts > MAX_ATTEMPTS) {
      await redisSet(lKey, '1');
      await redisExpire(lKey, WINDOW_SECONDS);
      return new Response(JSON.stringify({
        error: 'Too many attempts. Locked for 15 minutes.'
      }), {
        status: 429,
        headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      attempts
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (e) {
    console.error('auth-guard-register error', e);
    return new Response(JSON.stringify({
      error: 'Internal error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
