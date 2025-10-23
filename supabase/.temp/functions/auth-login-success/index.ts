// supabase/functions/auth-login-success/index.ts
// POST: clears attempt counters and lock using Upstash REST after successful login

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { redisDel } from "../_shared/redis.ts";

function attemptsKey(email: string) { return `auth:attempts:${email.toLowerCase()}` }
function lockKey(email: string) { return `auth:lock:${email.toLowerCase()}` }

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
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400, headers: corsHeaders })
    }

    const aKey = attemptsKey(email);
    const lKey = lockKey(email);
    await redisDel(aKey);
    await redisDel(lKey);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('auth-login-success error', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: corsHeaders })
  }
});
