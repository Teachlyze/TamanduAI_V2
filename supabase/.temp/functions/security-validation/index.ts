// supabase/functions/security-validation/index.ts
// POST { action, data, user_id?, ip_address?, user_agent? }
// Server-side security validations for sensitive operations

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Rate limiting configuration (server-side)
const RATE_LIMITS = {
  login: { max: 5, window: 300 }, // 5 attempts per 5 minutes
  registration: { max: 3, window: 3600 }, // 3 attempts per hour
  password_reset: { max: 3, window: 3600 }, // 3 attempts per hour
  file_upload: { max: 10, window: 60 }, // 10 uploads per minute
  api_call: { max: 100, window: 60 }, // 100 API calls per minute
};

// Suspicious patterns
const SUSPICIOUS_PATTERNS = {
  sql_injection: /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
  xss: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  path_traversal: /(\.\.|\/etc\/|\/proc\/|\/sys\/)/i,
  command_injection: /(\||;|&|\$\(|\`)/,
};

async function checkRateLimit(key: string, action: string) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const limit = RATE_LIMITS[action];
  if (!limit) return { allowed: true };

  const windowStart = new Date(Date.now() - limit.window * 1000);

  const { data: attempts, error } = await admin
    .from("security_logs")
    .select("id")
    .eq("key", key)
    .eq("action", action)
    .gte("created_at", windowStart.toISOString());

  if (error && error.code !== "PGRST116") throw error;

  if ((attempts?.length || 0) >= limit.max) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(windowStart.getTime() + limit.window * 1000),
      reason: "Rate limit exceeded",
    };
  }

  return { allowed: true };
}

async function logSecurityEvent(key: string, action: string, status: string, metadata: any = {}) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  await admin.from("security_logs").insert([
    {
      key,
      action,
      status,
      metadata,
      created_at: new Date().toISOString(),
    },
  ]);
}

function validateInput(input: string, rules: any = {}) {
  const issues = [];

  if (rules.maxLength && input.length > rules.maxLength) {
    issues.push(`Input too long (max ${rules.maxLength} characters)`);
  }

  if (rules.minLength && input.length < rules.minLength) {
    issues.push(`Input too short (min ${rules.minLength} characters)`);
  }

  if (rules.pattern && !rules.pattern.test(input)) {
    issues.push("Input format invalid");
  }

  // Check for suspicious patterns
  for (const [pattern, regex] of Object.entries(SUSPICIOUS_PATTERNS)) {
    if (regex.test(input)) {
      issues.push(`Suspicious pattern detected: ${pattern}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

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
      action,
      data,
      user_id,
      validation_rules = {}
    } = body;

    if (!action || !data) {
      return new Response(JSON.stringify({
        error: "Missing required fields: action, data"
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

    // Create rate limit key
    const rateLimitKey = user_id ? `${action}:${user_id}` : `${action}:${clientIP}`;

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(rateLimitKey, action);
    if (!rateLimitResult.allowed) {
      await logSecurityEvent(rateLimitKey, action, "blocked", {
        reason: "rate_limit",
        client_ip: clientIP,
      });

      return new Response(JSON.stringify({
        error: "Rate limit exceeded",
        ...rateLimitResult,
      }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate input based on action
    const validation = validateInput(data, validation_rules);

    if (!validation.valid) {
      await logSecurityEvent(rateLimitKey, action, "blocked", {
        reason: "invalid_input",
        issues: validation.issues,
        client_ip: clientIP,
      });

      return new Response(JSON.stringify({
        error: "Invalid input",
        issues: validation.issues,
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Log successful validation
    await logSecurityEvent(rateLimitKey, action, "allowed", {
      client_ip: clientIP,
      data_length: data.length,
    });

    return new Response(JSON.stringify({
      success: true,
      validated: true,
      client_ip: clientIP,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("security-validation error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error.message,
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
