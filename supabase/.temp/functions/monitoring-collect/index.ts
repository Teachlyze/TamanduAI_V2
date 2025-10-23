// supabase/functions/monitoring-collect/index.ts
// POST { metrics, timestamp?, user_id?, metadata? }
// Collects server-side metrics for monitoring dashboard

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const {
      metrics,
      timestamp = new Date().toISOString(),
      user_id,
      metadata = {}
    } = body;

    if (!metrics || typeof metrics !== "object") {
      return new Response(JSON.stringify({
        error: "Missing or invalid metrics data"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get real client IP
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("x-real-ip") ||
                     req.headers.get("cf-connecting-ip") ||
                     "unknown";

    // Collect server metrics
    const serverMetrics = {
      timestamp,
      client_ip: clientIP,
      user_agent: req.headers.get("user-agent") || "unknown",
      request_size: req.headers.get("content-length") || "0",
      response_time: Date.now(),
      memory_usage: Deno.memoryUsage?.() || {},
      ...metadata,
    };

    // Store metrics in database
    const { data: metricsRecord, error: metricsErr } = await admin
      .from("system_metrics")
      .insert([
        {
          metric_type: "client_metrics",
          metric_data: {
            client_metrics: metrics,
            server_metrics: serverMetrics,
          },
          user_id,
          client_ip: clientIP,
          created_at: timestamp,
        },
      ])
      .select()
      .single();

    if (metricsErr) {
      console.error("Error storing metrics:", metricsErr);
      // Don't fail the request for metrics errors
    }

    // Also store in cache for quick access
    const cacheKey = `metrics:${Date.now()}`;
    // Note: In production, you might want to use Redis or another cache

    return new Response(JSON.stringify({
      success: true,
      metrics_id: metricsRecord?.id,
      collected_at: timestamp,
      server_metrics: serverMetrics,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("monitoring-collect error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error.message,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
