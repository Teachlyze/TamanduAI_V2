// supabase/functions/auth-me/index.ts
// GET: returns user data from Redis cache (or DB fallback) based on Supabase access token
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { redisGet, redisSetEx, SESSION_TTL_SECONDS, sessKey } from "../_shared/redis.ts";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
serve(async (req)=>{
  // Support GET and POST (invoke uses POST)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({
        error: 'Missing token'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Validate token and get user via service role key
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({
        error: 'Invalid token'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Try cache first
    const key = sessKey(token);
    const cached = await redisGet(key);
    if (cached) {
      // Optionally refresh TTL by writing again
      await redisSetEx(key, cached, SESSION_TTL_SECONDS);
      return new Response(JSON.stringify({
        user: cached
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Fallback to DB: load minimal user profile
    const userId = userRes.user.id;
    const { data: profile, error: profErr } = await admin.from('profiles').select('id, full_name, avatar_url, role, email_confirmed, terms_accepted, privacy_accepted').eq('id', userId).single();
    if (profErr) {
      // If profiles table not available, build minimal payload from auth user
      const userData = {
        id: userId,
        name: userRes.user.user_metadata?.full_name || userRes.user.email?.split('@')[0] || 'Usuário',
        email: userRes.user.email,
        avatar_url: userRes.user.user_metadata?.avatar_url || null,
        role: userRes.user.user_metadata?.role || null,
        email_confirmed: !!userRes.user.email_confirmed_at,
        terms_accepted: false,
        privacy_accepted: false
      };
      await redisSetEx(key, userData, SESSION_TTL_SECONDS);
      return new Response(JSON.stringify({
        user: userData
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const userData = {
      id: profile.id,
      name: profile.full_name || userRes.user.user_metadata?.full_name || 'Usuário',
      email: userRes.user.email,
      avatar_url: profile.avatar_url || userRes.user.user_metadata?.avatar_url || null,
      role: profile.role || null,
      email_confirmed: !!profile.email_confirmed || !!userRes.user.email_confirmed_at,
      terms_accepted: !!profile.terms_accepted,
      privacy_accepted: !!profile.privacy_accepted
    };
    await redisSetEx(key, userData, SESSION_TTL_SECONDS);
    return new Response(JSON.stringify({
      user: userData
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (e) {
    console.error('auth-me error', e);
    return new Response(JSON.stringify({
      error: 'Internal error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
