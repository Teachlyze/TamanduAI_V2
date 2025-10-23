// supabase/functions/validate-hcaptcha/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const HCAPTCHA_SECRET = Deno.env.get("HCAPTCHA_SECRET");
serve(async (req)=>{
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Método não permitido'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json'
      }
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
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'Erro ao ler o corpo da requisição.'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  // Verifica o token no endpoint oficial do hCaptcha
  const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      secret: HCAPTCHA_SECRET,
      response: token
    })
  });
  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    return new Response(JSON.stringify({
      success: false,
      error: verifyData['error-codes'] || 'Verificação falhou'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  // Opcional: validar score, hostname, etc
  return new Response(JSON.stringify({
    success: true
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
});
