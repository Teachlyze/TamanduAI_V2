import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const subjectTranslations: { [key: string]: string } = {
  support: 'Suporte Técnico',
  pricing: 'Dúvidas sobre Planos',
  partnership: 'Parceria',
  suggestion: 'Sugestão',
  feedback: 'Feedback',
  other: 'Outro'
}

const userTypeTranslations: { [key: string]: string } = {
  student: 'Aluno',
  teacher: 'Professor',
  school: 'Instituição de Ensino',
  partner: 'Parceiro/Fornecedor',
  other: 'Outro'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fullName, email, phone, userType, subject, company, message } = await req.json()

    // Validações básicas
    if (!fullName || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios faltando' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Salvar mensagem no banco de dados
    const { data, error } = await supabaseClient
      .from('contact_messages')
      .insert([
        {
          full_name: fullName,
          email: email,
          phone: phone || null,
          user_type: userType,
          subject: subject,
          company: company || null,
          message: message,
          status: 'pending'
        }
      ])
      .select()

    if (error) {
      console.error('Erro ao salvar mensagem:', error)
      return new Response(
        JSON.stringify({ error: 'Erro ao processar mensagem' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('✅ Mensagem salva no banco:', data[0])

    // Enviar email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || 're_cEXFTxaH_CVyoV1cGc2N1HVTD8x9yrG9x'
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'contato@tamanduai.com'

    const subjectLabel = subjectTranslations[subject] || subject
    const userTypeLabel = userTypeTranslations[userType] || userType

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #1e40af 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📧 Nova Mensagem de Contato</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b; margin-top: 0;">Informações do Contato</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; font-weight: bold; color: #475569; width: 150px;">Nome:</td>
              <td style="padding: 12px 0; color: #1e293b;">${fullName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; font-weight: bold; color: #475569;">Email:</td>
              <td style="padding: 12px 0; color: #0891b2;"><a href="mailto:${email}" style="color: #0891b2; text-decoration: none;">${email}</a></td>
            </tr>
            ${phone ? `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; font-weight: bold; color: #475569;">Telefone:</td>
              <td style="padding: 12px 0; color: #1e293b;">${phone}</td>
            </tr>
            ` : ''}
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; font-weight: bold; color: #475569;">Tipo:</td>
              <td style="padding: 12px 0; color: #1e293b;">${userTypeLabel}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; font-weight: bold; color: #475569;">Assunto:</td>
              <td style="padding: 12px 0; color: #1e293b;">${subjectLabel}</td>
            </tr>
            ${company ? `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; font-weight: bold; color: #475569;">Empresa:</td>
              <td style="padding: 12px 0; color: #1e293b;">${company}</td>
            </tr>
            ` : ''}
          </table>

          <div style="margin-top: 30px;">
            <h3 style="color: #1e293b; margin-bottom: 10px;">Mensagem:</h3>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; color: #334155; line-height: 1.6;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
            <p>Recebido em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            <p style="margin-top: 10px;">TamanduAI - Plataforma Educacional com IA</p>
          </div>
        </div>
      </div>
    `

    console.log('📨 Enviando email via Resend...')

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'TamanduAI <contato@tamanduai.com>',
        to: [adminEmail],
        reply_to: email,
        subject: `[TamanduAI] ${subjectLabel} - ${fullName}`,
        html: emailHtml
      })
    })

    const emailData = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('❌ Erro ao enviar email:', emailData)
      // Mesmo com erro no email, retorna sucesso pois salvou no banco
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Mensagem salva com sucesso! (Email pode ter falhado)',
          data: data[0],
          emailError: emailData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log('✅ Email enviado com sucesso! ID:', emailData.id)

    // Atualizar status no banco
    await supabaseClient
      .from('contact_messages')
      .update({ status: 'sent', email_sent_at: new Date().toISOString() })
      .eq('id', data[0].id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mensagem enviada e email notificado com sucesso!',
        data: data[0],
        emailId: emailData.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
