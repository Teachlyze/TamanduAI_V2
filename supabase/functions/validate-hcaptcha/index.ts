// supabase/functions/validate-hcaptcha/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const HCAPTCHA_SECRET = Deno.env.get("HCAPTCHA_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
// ✅ Nova nomenclatura: SUPABASE_SECRET_KEY (não SERVICE_ROLE_KEY)
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY") || (Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")); // fallback para compatibilidade

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_ATTEMPTS_PER_HOUR: 10,
  MAX_ATTEMPTS_PER_DAY: 50,
  BLOCK_DURATION_MINUTES: 60
};

// In-memory rate limit (considera usar Redis em produção)
const rateLimitMap = new Map<string, { attempts: number; lastAttempt: number; blocked: boolean }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0].trim() || realIp || 'unknown';
}

function checkRateLimit(clientId: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId);

  if (!clientData) {
    rateLimitMap.set(clientId, { attempts: 1, lastAttempt: now, blocked: false });
    return { allowed: true };
  }

  // Check if blocked
  if (clientData.blocked) {
    const blockExpiry = clientData.lastAttempt + (RATE_LIMIT.BLOCK_DURATION_MINUTES * 60 * 1000);
    if (now < blockExpiry) {
      return { allowed: false, reason: 'Bloqueado temporariamente. Tente novamente mais tarde.' };
    }
    // Unblock
    clientData.blocked = false;
    clientData.attempts = 0;
  }

  // Check hourly limit
  const oneHourAgo = now - (60 * 60 * 1000);
  if (clientData.lastAttempt > oneHourAgo && clientData.attempts >= RATE_LIMIT.MAX_ATTEMPTS_PER_HOUR) {
    clientData.blocked = true;
    clientData.lastAttempt = now;
    return { allowed: false, reason: 'Muitas tentativas. Aguarde 1 hora.' };
  }

  // Update attempts
  if (clientData.lastAttempt < oneHourAgo) {
    clientData.attempts = 1;
  } else {
    clientData.attempts++;
  }
  clientData.lastAttempt = now;

  return { allowed: true };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Método não permitido'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const clientId = getClientIdentifier(req);

  // Check rate limit
  const rateLimitCheck = checkRateLimit(clientId);
  if (!rateLimitCheck.allowed) {
    return new Response(JSON.stringify({
      success: false,
      error: rateLimitCheck.reason
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  let token;
  try {
    const body = await req.json();
    token = body['hcaptchaToken'] || body['token'] || body['hcaptcha_token'];
    if (!token) {
      return new Response(JSON.stringify({
        error: 'Token do hCaptcha não enviado.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error('[hCaptcha] Erro ao ler corpo da requisição:', err);
    return new Response(JSON.stringify({
      error: 'Erro ao ler o corpo da requisição.'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Verifica o token no endpoint oficial do hCaptcha
    const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        secret: HCAPTCHA_SECRET!,
        response: token
      })
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      console.warn('[hCaptcha] Falha na verificação:', {
        clientId,
        errors: verifyData['error-codes']
      });

      return new Response(JSON.stringify({
        success: false,
        error: verifyData['error-codes'] || 'Verificação falhou'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log de sucesso
    console.log('[hCaptcha] Verificação bem-sucedida:', {
      clientId,
      timestamp: new Date().toISOString()
    });

    // Opcional: salvar no banco para auditoria
    if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
      
      await supabase.from('hcaptcha_verifications').insert({
        client_id: clientId,
        success: true,
        timestamp: new Date().toISOString(),
        challenge_ts: verifyData.challenge_ts,
        hostname: verifyData.hostname
      }).catch(err => console.error('[hCaptcha] Erro ao salvar auditoria:', err));
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[hCaptcha] Erro ao verificar token:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno ao verificar captcha'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
