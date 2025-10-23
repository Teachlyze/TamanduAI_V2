import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Template cache para performance
const templateCache = new Map<string, string>()
const CACHE_TTL = 3600000 // 1 hora

interface EmailRequest {
  templateId: string
  to: string | string[]
  variables?: Record<string, any>
  language?: 'pt' | 'en' | 'es'
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: string
    type: string
  }>
  tracking?: boolean
}

interface EmailTemplate {
  subject: Record<string, string>
  html: string
  text?: string
}

// Templates registry
const templates: Record<string, EmailTemplate> = {
  // Authentication
  welcome: {
    subject: {
      pt: 'Bem-vindo(a) ao TamanduAI! Confirme seu email',
      en: 'Welcome to TamanduAI! Confirm your email',
      es: 'Bienvenido(a) a TamanduAI! Confirma tu email'
    },
    html: `
      <h2 style="color: #22c55e;">{{greeting}} 🎓</h2>
      <p>{{welcomeMessage}}</p>
      <p><strong>{{userName}}</strong>, {{accountCreated}}</p>
      <div style="margin: 30px 0;">
        <a href="{{confirmationUrl}}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          {{confirmButton}}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">{{expiryNote}}</p>
    `
  },
  'login-new-device': {
    subject: {
      pt: 'Novo acesso detectado',
      en: 'New login detected',
      es: 'Nuevo acceso detectado'
    },
    html: `
      <h2>{{title}}</h2>
      <p>{{message}}</p>
      <ul>
        <li><strong>{{deviceLabel}}:</strong> {{device}}</li>
        <li><strong>{{timeLabel}}:</strong> {{time}}</li>
        <li><strong>{{locationLabel}}:</strong> {{location}}</li>
      </ul>
      <p>{{securityNote}}</p>
    `
  },
  'password-recovery': {
    subject: {
      pt: 'Recuperação de senha - TamanduAI',
      en: 'Password recovery - TamanduAI',
      es: 'Recuperación de contraseña - TamanduAI'
    },
    html: `
      <h2>{{title}}</h2>
      <p>{{greeting}} <strong>{{userName}}</strong>,</p>
      <p>{{message}}</p>
      <div style="margin: 30px 0;">
        <a href="{{resetUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          {{resetButton}}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">{{expiryNote}}</p>
      <p style="color: #ef4444; font-size: 14px;">{{securityNote}}</p>
    `
  },
  'password-changed': {
    subject: {
      pt: 'Senha alterada com sucesso',
      en: 'Password changed successfully',
      es: 'Contraseña cambiada exitosamente'
    },
    html: `
      <h2>{{title}}</h2>
      <p>{{message}}</p>
      <p><strong>{{timeLabel}}:</strong> {{time}}</p>
      <p style="color: #666;">{{securityNote}}</p>
    `
  },
  'account-confirmed': {
    subject: {
      pt: 'Sua conta foi confirmada! ✅',
      en: 'Your account has been confirmed! ✅',
      es: '¡Tu cuenta ha sido confirmada! ✅'
    },
    html: `
      <h2 style="color: #22c55e;">{{title}} ✅</h2>
      <p>{{greeting}} <strong>{{userName}}</strong>,</p>
      <p>{{message}}</p>
      <div style="margin: 30px 0;">
        <a href="{{dashboardUrl}}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          {{dashboardButton}}
        </a>
      </div>
    `
  },
  // Classes
  'class-invite': {
    subject: {
      pt: 'Convite para a turma {{className}}',
      en: 'Invitation to class {{className}}',
      es: 'Invitación a la clase {{className}}'
    },
    html: `
      <h2>{{title}}</h2>
      <p>{{message}}</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0;">{{className}}</h3>
        <p style="margin: 0; color: #666;">{{teacherLabel}}: {{teacherName}}</p>
      </div>
      <div style="margin: 30px 0;">
        <a href="{{acceptUrl}}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          {{acceptButton}}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">{{expiryNote}}</p>
    `
  },
  'class-invite-accepted': {
    subject: {
      pt: '{{studentName}} entrou na turma {{className}}',
      en: '{{studentName}} joined class {{className}}',
      es: '{{studentName}} se unió a la clase {{className}}'
    },
    html: `
      <h2>{{title}}</h2>
      <p>{{message}}</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>{{studentLabel}}:</strong> {{studentName}}</p>
        <p><strong>{{classLabel}}:</strong> {{className}}</p>
        <p><strong>{{timeLabel}}:</strong> {{time}}</p>
      </div>
    `
  },
  'student-added': {
    subject: {
      pt: 'Você foi adicionado à turma {{className}}',
      en: 'You were added to class {{className}}',
      es: 'Fuiste agregado a la clase {{className}}'
    },
    html: `
      <h2>{{title}}</h2>
      <p>{{greeting}} <strong>{{studentName}}</strong>,</p>
      <p>{{message}}</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0;">{{className}}</h3>
        <p style="margin: 0; color: #666;">{{teacherLabel}}: {{teacherName}}</p>
      </div>
      <div style="margin: 30px 0;">
        <a href="{{classUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          {{viewClassButton}}
        </a>
      </div>
    `
  },
  'student-removed': {
    subject: {
      pt: 'Você foi removido da turma {{className}}',
      en: 'You were removed from class {{className}}',
      es: 'Fuiste removido de la clase {{className}}'
    },
    html: `
      <h2>{{title}}</h2>
      <p>{{message}}</p>
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <p><strong>{{classLabel}}:</strong> {{className}}</p>
        <p><strong>{{timeLabel}}:</strong> {{time}}</p>
      </div>
      <p style="color: #666;">{{contactNote}}</p>
    `
  },
  'class-created': {
    subject: {
      pt: 'Turma {{className}} criada com sucesso',
      en: 'Class {{className}} created successfully',
      es: 'Clase {{className}} creada exitosamente'
    },
    html: `
      <h2 style="color: #22c55e;">{{title}} ✅</h2>
      <p>{{message}}</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0;">{{className}}</h3>
        <p style="margin: 0; color: #666;">{{codeLabel}}: <strong>{{classCode}}</strong></p>
      </div>
      <div style="margin: 30px 0;">
        <a href="{{classUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          {{manageButton}}
        </a>
      </div>
    `
  },
  // Activities
  'new-activity': {
    subject: {
      pt: 'Nova atividade em {{className}}: {{activityName}}',
      en: 'New activity in {{className}}: {{activityName}}',
      es: 'Nueva actividad en {{className}}: {{activityName}}'
    },
    html: `
      <h2>📝 {{title}}</h2>
      <p>{{greeting}} <strong>{{studentName}}</strong>,</p>
      <p>{{message}}</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0;">{{activityName}}</h3>
        <p style="margin: 5px 0;"><strong>{{classLabel}}:</strong> {{className}}</p>
        <p style="margin: 5px 0;"><strong>{{deadlineLabel}}:</strong> {{deadline}}</p>
        <p style="margin: 5px 0;"><strong>{{pointsLabel}}:</strong> {{points}}</p>
      </div>
      <div style="margin: 30px 0;">
        <a href="{{activityUrl}}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          {{viewButton}}
        </a>
      </div>
    `
  },
  'deadline-warning': {
    subject: {
      pt: '⏰ Prazo em 24 horas: {{activityName}}',
      en: '⏰ Deadline in 24 hours: {{activityName}}',
      es: '⏰ Plazo en 24 horas: {{activityName}}'
    },
    html: `
      <h2 style="color: #f97316;">⏰ {{title}}</h2>
      <p>{{message}}</p>
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 10px 0;">{{activityName}}</h3>
        <p style="margin: 5px 0;"><strong>{{deadlineLabel}}:</strong> {{deadline}}</p>
        <p style="margin: 5px 0;"><strong>{{timeLeftLabel}}:</strong> {{timeLeft}}</p>
      </div>
      <div style="margin: 30px 0;">
        <a href="{{activityUrl}}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          {{submitButton}}
        </a>
      </div>
    `
  },
  'activity-corrected': {
    subject: {
      pt: '✅ Correção disponível: {{activityName}}',
      en: '✅ Correction available: {{activityName}}',
      es: '✅ Corrección disponible: {{activityName}}'
    },
    html: `
      <h2 style="color: #22c55e;">✅ {{title}}</h2>
      <p>{{message}}</p>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
        <h3 style="margin: 0 0 10px 0;">{{activityName}}</h3>
        <p style="margin: 5px 0; font-size: 24px;"><strong>{{gradeLabel}}:</strong> <span style="color: #22c55e;">{{grade}}/{{maxGrade}}</span></p>
      </div>
      <div style="margin: 30px 0;">
        <a href="{{viewUrl}}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          {{viewDetailsButton}}
        </a>
      </div>
    `
  },
  // System
  'plagiarism-alert': {
    subject: {
      pt: '🚨 Alerta de Plágio: {{activityName}}',
      en: '🚨 Plagiarism Alert: {{activityName}}',
      es: '🚨 Alerta de Plagio: {{activityName}}'
    },
    html: `
      <h2 style="color: #ef4444;">🚨 {{title}}</h2>
      <p>{{message}}</p>
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <p><strong>{{studentLabel}}:</strong> {{studentName}}</p>
        <p><strong>{{activityLabel}}:</strong> {{activityName}}</p>
        <p><strong>{{similarityLabel}}:</strong> <span style="color: #ef4444; font-size: 20px;">{{percentage}}%</span></p>
        <p><strong>{{severityLabel}}:</strong> {{severity}}</p>
      </div>
      <div style="margin: 30px 0;">
        <a href="{{reviewUrl}}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          {{reviewButton}}
        </a>
      </div>
    `
  },
  'monthly-report': {
    subject: {
      pt: 'Relatório mensal - {{monthYear}}',
      en: 'Monthly report - {{monthYear}}',
      es: 'Informe mensual - {{monthYear}}'
    },
    html: `
      <h2>📊 {{title}}</h2>
      <p>{{greeting}} <strong>{{userName}}</strong>,</p>
      <p>{{message}}</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0;">{{statsTitle}}</h3>
        <p style="margin: 5px 0;"><strong>{{activitiesLabel}}:</strong> {{activitiesCount}}</p>
        <p style="margin: 5px 0;"><strong>{{averageLabel}}:</strong> {{averageGrade}}</p>
        <p style="margin: 5px 0;"><strong>{{completionLabel}}:</strong> {{completionRate}}%</p>
      </div>
      <div style="margin: 30px 0;">
        <a href="{{reportUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          {{viewReportButton}}
        </a>
      </div>
    `
  }
}

// Translations for common terms
const translations = {
  pt: {
    greeting: 'Olá',
    welcomeMessage: 'Bem-vindo(a) ao TamanduAI!',
    accountCreated: 'sua conta foi criada com sucesso.',
    confirmButton: 'Confirmar Email',
    expiryNote: 'Este link expira em 24 horas.',
    securityNote: 'Se você não solicitou esta ação, ignore este email.',
    title: 'Notificação',
    message: 'Você recebeu uma nova notificação.',
    deviceLabel: 'Dispositivo',
    timeLabel: 'Horário',
    locationLabel: 'Localização',
    resetButton: 'Redefinir Senha',
    dashboardButton: 'Acessar Dashboard',
    teacherLabel: 'Professor',
    acceptButton: 'Aceitar Convite',
    studentLabel: 'Aluno',
    classLabel: 'Turma',
    viewClassButton: 'Ver Turma',
    contactNote: 'Se você acredita que isso é um erro, entre em contato com o professor.',
    codeLabel: 'Código',
    manageButton: 'Gerenciar Turma',
    deadlineLabel: 'Prazo',
    pointsLabel: 'Pontos',
    viewButton: 'Ver Atividade',
    timeLeftLabel: 'Tempo restante',
    submitButton: 'Entregar Agora',
    gradeLabel: 'Nota',
    viewDetailsButton: 'Ver Detalhes',
    similarityLabel: 'Similaridade',
    severityLabel: 'Gravidade',
    reviewButton: 'Revisar Submissão',
    statsTitle: 'Estatísticas do Mês',
    activitiesLabel: 'Atividades',
    averageLabel: 'Média',
    completionLabel: 'Taxa de Conclusão',
    viewReportButton: 'Ver Relatório Completo',
    activityLabel: 'Atividade'
  },
  en: {
    greeting: 'Hello',
    welcomeMessage: 'Welcome to TamanduAI!',
    accountCreated: 'your account has been created successfully.',
    confirmButton: 'Confirm Email',
    expiryNote: 'This link expires in 24 hours.',
    securityNote: 'If you did not request this action, please ignore this email.',
    title: 'Notification',
    message: 'You have received a new notification.',
    deviceLabel: 'Device',
    timeLabel: 'Time',
    locationLabel: 'Location',
    resetButton: 'Reset Password',
    dashboardButton: 'Access Dashboard',
    teacherLabel: 'Teacher',
    acceptButton: 'Accept Invitation',
    studentLabel: 'Student',
    classLabel: 'Class',
    viewClassButton: 'View Class',
    contactNote: 'If you believe this is an error, please contact the teacher.',
    codeLabel: 'Code',
    manageButton: 'Manage Class',
    deadlineLabel: 'Deadline',
    pointsLabel: 'Points',
    viewButton: 'View Activity',
    timeLeftLabel: 'Time left',
    submitButton: 'Submit Now',
    gradeLabel: 'Grade',
    viewDetailsButton: 'View Details',
    similarityLabel: 'Similarity',
    severityLabel: 'Severity',
    reviewButton: 'Review Submission',
    statsTitle: 'Monthly Statistics',
    activitiesLabel: 'Activities',
    averageLabel: 'Average',
    completionLabel: 'Completion Rate',
    viewReportButton: 'View Full Report',
    activityLabel: 'Activity'
  },
  es: {
    greeting: 'Hola',
    welcomeMessage: '¡Bienvenido(a) a TamanduAI!',
    accountCreated: 'tu cuenta ha sido creada exitosamente.',
    confirmButton: 'Confirmar Email',
    expiryNote: 'Este enlace expira en 24 horas.',
    securityNote: 'Si no solicitaste esta acción, ignora este email.',
    title: 'Notificación',
    message: 'Has recibido una nueva notificación.',
    deviceLabel: 'Dispositivo',
    timeLabel: 'Hora',
    locationLabel: 'Ubicación',
    resetButton: 'Restablecer Contraseña',
    dashboardButton: 'Acceder al Dashboard',
    teacherLabel: 'Profesor',
    acceptButton: 'Aceptar Invitación',
    studentLabel: 'Estudiante',
    classLabel: 'Clase',
    viewClassButton: 'Ver Clase',
    contactNote: 'Si crees que esto es un error, contacta al profesor.',
    codeLabel: 'Código',
    manageButton: 'Gestionar Clase',
    deadlineLabel: 'Plazo',
    pointsLabel: 'Puntos',
    viewButton: 'Ver Actividad',
    timeLeftLabel: 'Tiempo restante',
    submitButton: 'Entregar Ahora',
    gradeLabel: 'Nota',
    viewDetailsButton: 'Ver Detalles',
    similarityLabel: 'Similitud',
    severityLabel: 'Gravedad',
    reviewButton: 'Revisar Envío',
    statsTitle: 'Estadísticas del Mes',
    activitiesLabel: 'Actividades',
    averageLabel: 'Promedio',
    completionLabel: 'Tasa de Finalización',
    viewReportButton: 'Ver Informe Completo',
    activityLabel: 'Actividad'
  }
}

// Base HTML template
function getBaseTemplate(content: string, language: string = 'pt'): string {
  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TamanduAI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      margin: 20px;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #22c55e;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #22c55e;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .footer a {
      color: #22c55e;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 10px;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🐜 TamanduAI</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TamanduAI. Todos os direitos reservados.</p>
      <p>
        <a href="https://tamanduai.com">Website</a> | 
        <a href="https://tamanduai.com/privacy">Privacidade</a> | 
        <a href="{{unsubscribeUrl}}">Descadastrar</a>
      </p>
      <p style="color: #999; margin-top: 10px;">
        Este é um email automático, por favor não responda.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

// Render template with variables
function renderTemplate(template: string, variables: Record<string, any>, language: string = 'pt'): string {
  let rendered = template
  
  // Add translations
  const trans = translations[language as keyof typeof translations] || translations.pt
  const allVars = { ...trans, ...variables }
  
  // Replace variables
  Object.entries(allVars).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    rendered = rendered.replace(regex, String(value || ''))
  })
  
  return rendered
}

// Generate text version from HTML
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gs, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Validate email
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    const body: EmailRequest = await req.json()
    const { templateId, to, variables = {}, language = 'pt', from, replyTo, attachments, tracking = false } = body

    // Validation
    if (!templateId || !to) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: templateId and to' 
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email addresses
    const emails = Array.isArray(to) ? to : [to]
    for (const email of emails) {
      if (!isValidEmail(email)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Invalid email address: ${email}` 
          }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get template
    const template = templates[templateId]
    if (!template) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Template not found: ${templateId}` 
        }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Render template
    const subject = renderTemplate(template.subject[language] || template.subject.pt, variables, language)
    const contentHtml = renderTemplate(template.html, variables, language)
    const html = getBaseTemplate(contentHtml, language)
    const text = template.text ? renderTemplate(template.text, variables, language) : htmlToText(html)

    // Add unsubscribe URL if not provided
    if (!variables.unsubscribeUrl) {
      variables.unsubscribeUrl = `${Deno.env.get('VITE_APP_URL') || 'https://tamanduai.com'}/unsubscribe`
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const fromEmail = from || Deno.env.get('FROM_EMAIL') || 'contato@tamanduai.com'

    console.log('Sending email via Resend...')
    console.log('Template:', templateId)
    console.log('To:', emails)
    console.log('Language:', language)

    // Prepare email payload
    const emailPayload: any = {
      from: fromEmail,
      to: emails,
      subject: subject,
      html: html,
      text: text,
    }

    if (replyTo) {
      emailPayload.reply_to = replyTo
    }

    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments
    }

    if (tracking) {
      emailPayload.tags = [
        { name: 'template', value: templateId },
        { name: 'language', value: language }
      ]
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    const responseData = await response.json()
    
    if (!response.ok) {
      console.error('Resend API error:', responseData)
      throw new Error(`Resend API error: ${JSON.stringify(responseData)}`)
    }

    console.log('✅ Email sent successfully! ID:', responseData.id)

    // Log to database (optional)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      await supabase.from('email_logs').insert({
        template_id: templateId,
        recipient: emails[0],
        subject: subject,
        status: 'sent',
        email_id: responseData.id,
        language: language,
        sent_at: new Date().toISOString()
      })
    } catch (logError) {
      console.error('Failed to log email:', logError)
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        emailId: responseData.id,
        template: templateId
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error sending email:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
