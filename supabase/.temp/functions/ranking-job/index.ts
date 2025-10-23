// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    const useService = !!SERVICE_KEY;
    const supabase = createClient(SUPABASE_URL!, (useService ? SERVICE_KEY! : ANON_KEY!), {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    if (req.method !== "POST" && req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenta executar RPC se existir
    let result: any = null;
    let rpcError: any = null;
    try {
      const { data, error } = await supabase.rpc("compute_leaderboard");
      if (error) rpcError = error; else result = data;
    } catch (e) {
      rpcError = e;
    }

    // Fallback no-op (pode ser substituído por lógica inline futuramente)
    if (rpcError) {
      // Exemplo: recalcular pontos com base em submissions (pseudo)
      // Aqui mantemos no-op para evitar risco sem schema confirmado.
      return new Response(
        JSON.stringify({ status: "ok", mode: useService ? "service" : "anon", rpc: "failed", detail: String(rpcError) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ status: "ok", mode: useService ? "service" : "anon", rpc: "compute_leaderboard", result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: "internal_error", detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
