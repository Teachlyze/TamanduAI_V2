import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { submissionId, studentId, activityTitle, grade, maxScore } = await req.json()

    if (!submissionId || !studentId || !activityTitle) {
      return new Response(
        JSON.stringify({ error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inicializar Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Buscar dados do aluno
    const { data: student, error: studentError } = await supabaseClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      throw new Error('Aluno não encontrado')
    }

    // Criar notificação in-app
    const { error: notifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: studentId,
        title: 'Atividade Corrigida',
        message: `Sua atividade "${activityTitle}" foi corrigida. Nota: ${grade}/${maxScore}`,
        type: 'correction',
        read: false,
        data: {
          submission_id: submissionId,
          grade: grade,
          max_score: maxScore,
          activity_title: activityTitle,
        },
      })

    if (notifError) {
      console.error('Erro ao criar notificação:', notifError)
    }

    // Enviar email (opcional - configurar SMTP)
    const sendEmail = Deno.env.get('SEND_EMAIL_NOTIFICATIONS') === 'true'
    
    if (sendEmail && student.email) {
      try {
        const emailSubject = `Atividade "${activityTitle}" Corrigida`
        const emailBody = `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Olá, ${student.full_name}!</h2>
              <p>Sua atividade foi corrigida.</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">📚 ${activityTitle}</h3>
                <p style="font-size: 24px; margin: 10px 0;">
                  <strong>Nota: ${grade}/${maxScore}</strong>
                </p>
              </div>
              
              <p>Acesse a plataforma para ver o feedback completo do professor.</p>
              
              <a href="${Deno.env.get('APP_URL')}/students/activities" 
                 style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                Ver Feedback
              </a>
              
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                TamanduAI - Plataforma EdTech Inteligente
              </p>
            </body>
          </html>
        `

        // Usar serviço de email configurado (SendGrid, Resend, etc)
        // Exemplo com Resend
        const resendKey = Deno.env.get('RESEND_API_KEY')
        
        if (resendKey) {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'TamanduAI <noreply@tamanduai.com>',
              to: [student.email],
              subject: emailSubject,
              html: emailBody,
            }),
          })

          if (!emailResponse.ok) {
            console.error('Erro ao enviar email:', await emailResponse.text())
          }
        }
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError)
        // Não falhar a requisição se email falhar
      }
    }

    // Push notification (Web Push) - opcional
    const sendPush = Deno.env.get('SEND_PUSH_NOTIFICATIONS') === 'true'
    
    if (sendPush) {
      try {
        // Buscar tokens de push do usuário (implementar tabela push_subscriptions)
        const { data: subscriptions } = await supabaseClient
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', studentId)

        if (subscriptions && subscriptions.length > 0) {
          const webPushKey = Deno.env.get('WEB_PUSH_PRIVATE_KEY')
          
          // Implementar envio de push notifications
          // Usar biblioteca web-push ou similar
          console.log('Push notifications não implementado ainda')
        }
      } catch (pushError) {
        console.error('Erro ao enviar push:', pushError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationSent: true,
        emailSent: sendEmail,
        pushSent: false, // Implementar quando necessário
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Erro ao enviar notificação:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
