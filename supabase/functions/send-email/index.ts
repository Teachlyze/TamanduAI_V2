import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }
  try {
    const { to, subject, html, text, from } = await req.json();
    const fromEmail = from || Deno.env.get('FROM_EMAIL') || 'contato@tamanduai.com';
    // Validação
    if (!to || !subject || !html && !text) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Campos obrigatórios: to, subject, e pelo menos html ou text'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Sua chave do Resend (melhor usar como variável de ambiente)
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || 're_cEXFTxaH_CVyoV1cGc2N1HVTD8x9yrG9x';
    console.log('Enviando email via Resend...');
    console.log('Para:', to);
    console.log('Assunto:', subject);
    // Chamada para a API do Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [
          to
        ],
        subject: subject,
        html: html || `<p>${text}</p>`,
        text: text || html?.replace(/<[^>]*>/g, '')
      })
    });
    const responseData = await response.json();
    if (!response.ok) {
      console.error('Erro do Resend:', responseData);
      throw new Error(`Erro do Resend: ${JSON.stringify(responseData)}`);
    }
    console.log('✅ Email enviado com sucesso! ID:', responseData.id);
    return new Response(JSON.stringify({
      success: true,
      message: 'Email enviado com sucesso!',
      emailId: responseData.id
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
