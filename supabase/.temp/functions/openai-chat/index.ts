// Supabase Edge Function: openai-chat
// Runtime: Deno
// Purpose: Proxy to OpenAI Chat Completions API with proper CORS and secret handling

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
];

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "*";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } as Record<string, string>;
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    // Optional: Enforce JWT in production (enable verify_jwt on deploy)
    // const auth = req.headers.get("Authorization");
    // if (!auth) return new Response("Unauthorized", { status: 401, headers });

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response("Missing OPENAI_API_KEY", { status: 500, headers });
    }

    const payload = await req.json();

    // Basic validation
    if (!payload || typeof payload !== "object") {
      return new Response("Invalid JSON body", { status: 400, headers });
    }

    // Forward to OpenAI Chat Completions (non-streamed)
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...headers,
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
