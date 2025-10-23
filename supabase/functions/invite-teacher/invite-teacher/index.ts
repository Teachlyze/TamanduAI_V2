// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
function renderEmailHTML(params) {
  const { inviterName = "Equipe", schoolName = "sua escola", inviteLink = "#", customMessage = "" } = params;
  return `
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <tr>
      <td align="center">
        <table width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;color:#fff">
              <h1 style="margin:0;font-size:22px;">Convite para ser Professor</h1>
              <p style="margin:6px 0 0 0;opacity:.9">${schoolName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px">
              <p style="margin:0 0 12px 0">Olá,</p>
              <p style="margin:0 0 16px 0;line-height:1.6">
                ${inviterName} convidou você para se juntar como <strong>Professor</strong> em <strong>${schoolName}</strong>.
              </p>
              ${customMessage ? `<div style="margin:0 0 16px 0;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#334155">${customMessage}</div>` : ''}
              <p style="margin:0 0 16px 0">Clique no botão abaixo para aceitar o convite e criar seu acesso:</p>
              <p style="margin:0 0 24px 0">
                <a href="${inviteLink}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">Aceitar Convite</a>
              </p>
              <p style="margin:0;color:#64748b;font-size:13px">Se o botão não funcionar, copie e cole este link no navegador:<br/>
                <span style="color:#334155;word-break:break-all">${inviteLink}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px">
              Este convite foi enviado automaticamente pelo sistema. Se você não esperava por este e-mail, ignore-o com segurança.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Method not allowed"
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({
        error: "Missing service credentials"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json();
    const email = (body?.email || "").toString().trim();
    const schoolId = (body?.schoolId || "").toString().trim();
    const schoolName = body?.schoolName;
    const inviterName = body?.inviterName;
    const message = body?.message;
    const inviteRedirectTo = body?.inviteRedirectTo; // opcional: URL onde o usuário deve ser redirecionado após aceitar
    if (!email || !schoolId) {
      return new Response(JSON.stringify({
        error: "email and schoolId are required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // 1) Criar convite via Admin API (gera email padrão do Supabase também, se SMTP do Auth estiver ativo)
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        role: 'teacher',
        school_id: schoolId,
        invited_by: inviterName || 'system'
      },
      redirectTo: inviteRedirectTo
    });
    if (inviteError) {
      return new Response(JSON.stringify({
        error: inviteError.message || String(inviteError)
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // 2) Enviar e-mail customizado via Resend (se houver RESEND_API_KEY)
    let emailSent = false;
    let emailError = null;
    if (RESEND_API_KEY) {
      try {
        // Tentar montar link de aceite usando redirectTo se fornecido; senão usar link do e-mail do Supabase (não exposto)
        // Como fallback, apontamos para página de login/cadastro com query param.
        const baseUrl = new URL(inviteRedirectTo || Deno.env.get("PUBLIC_SITE_URL") || "");
        if (!baseUrl.href) {
          // caso não haja PUBLIC_SITE_URL, apenas usa uma string segura
          baseUrl.href = "https://" + new Date().getTime() + ".example.com";
        }
        const inviteLink = inviteRedirectTo || baseUrl.href;
        const html = renderEmailHTML({
          inviterName,
          schoolName,
          inviteLink,
          customMessage: message
        });
        const from = Deno.env.get("RESEND_FROM") || "convites@mailer.tamanduai.com";
        const subject = Deno.env.get("RESEND_INVITE_SUBJECT") || `Convite para ser Professor${schoolName ? ` - ${schoolName}` : ''}`;
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from,
            to: [
              email
            ],
            subject,
            html
          })
        });
        if (!resp.ok) {
          const detail = await resp.text();
          throw new Error(detail);
        }
        emailSent = true;
      } catch (e) {
        emailError = String(e);
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      invited: true,
      emailSent,
      inviteData,
      emailError
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: "internal_error",
      detail: String(e)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
