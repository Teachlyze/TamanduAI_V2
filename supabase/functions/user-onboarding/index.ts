// supabase/functions/user-onboarding/index.ts
// POST: updates onboarding data in profiles (full_name, role, terms/privacy, optional age, cpf)
// Also writes an audit_log entry. Returns minimal updated user payload.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
serve(async (req)=>{
  if (req.method !== 'POST') {
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
    const body = await req.json().catch(()=>({}));
    const { full_name, role, terms_accepted, privacy_accepted, age, cpf } = body || {};
    if (!full_name || !role || typeof terms_accepted !== 'boolean' || typeof privacy_accepted !== 'boolean') {
      return new Response(JSON.stringify({
        error: 'Missing required fields: full_name, role, terms_accepted, privacy_accepted'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
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
    const userId = userRes.user.id;
    // Update DB: profiles
    const updatePayload = {
      full_name,
      role,
      terms_accepted,
      privacy_accepted,
      updated_at: new Date().toISOString()
    };
    if (typeof age === 'number') updatePayload.age = age;
    if (typeof cpf === 'string') updatePayload.cpf = cpf;
    const { error: updErr } = await admin.from('profiles').update(updatePayload).eq('id', userId);
    if (updErr) {
      console.error('onboarding update error', updErr);
      return new Response(JSON.stringify({
        error: 'Failed to update onboarding'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Audit log
    await admin.from('audit_log').insert({
      user_id: userId,
      action_type: 'user_onboarding_update',
      target_table: 'profiles',
      target_id: userId,
      new_data: updatePayload,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      user_agent: req.headers.get('user-agent') || null
    });
    // Return minimal user payload
    const userPayload = {
      id: userId,
      name: full_name,
      email: userRes.user.email,
      role,
      terms_accepted: !!terms_accepted,
      privacy_accepted: !!privacy_accepted
    };
    return new Response(JSON.stringify({
      user: userPayload
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (e) {
    console.error('user-onboarding error', e);
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
