// supabase/functions/terms-acceptance-audit/index.ts
// POST { user_id, terms_version, privacy_version, ip_address?, user_agent?, acceptance_method? }
// Logs terms acceptance with real server-side IP detection and comprehensive audit trail
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
serve(async (req)=>{
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), {
      status: 405,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { user_id, terms_version, privacy_version, acceptance_method = "web", metadata = {} } = body;
    if (!user_id || !terms_version || !privacy_version) {
      return new Response(JSON.stringify({
        error: "Missing required fields: user_id, terms_version, privacy_version"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Get real client IP from headers (set by proxy/CDN)
    const realIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip") || "unknown";
    // Get user agent
    const userAgent = req.headers.get("user-agent") || "unknown";
    // Check if user already accepted these versions
    const { data: existing } = await admin.from("terms_acceptance").select("id").eq("user_id", user_id).eq("terms_version", terms_version).eq("privacy_version", privacy_version).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({
        success: true,
        message: "Terms already accepted",
        already_accepted: true
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Log acceptance
    const { data: logEntry, error: logErr } = await admin.from("terms_acceptance").insert([
      {
        user_id,
        terms_version,
        privacy_version,
        ip_address: realIP,
        user_agent: userAgent,
        acceptance_method,
        metadata: {
          ...metadata,
          logged_at: new Date().toISOString(),
          server_ip_logged: true
        },
        accepted_at: new Date().toISOString()
      }
    ]).select().single();
    if (logErr) throw logErr;
    return new Response(JSON.stringify({
      success: true,
      log_id: logEntry.id,
      accepted_at: logEntry.accepted_at,
      ip_logged: realIP,
      user_agent_logged: userAgent
    }), {
      status: 201,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("terms-acceptance-audit error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
