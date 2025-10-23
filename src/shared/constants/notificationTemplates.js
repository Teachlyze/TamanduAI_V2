// Central registry of notification templates (push + email)
// Each template defines default channels/priority and message structures

import { NotificationType, NotificationPriority, DeliveryChannel } from './notificationRules';

export const notificationTemplates = {
  // Authentication
  accountCreated: {
    id: 'accountCreated',
    type: NotificationType.AUTHENTICATION,
    channel: DeliveryChannel.EMAIL,
    priority: NotificationPriority.CRITICAL,
    title: 'Conta criada com sucesso! 🎉',
    message: 'Bem-vindo(a) ao TamanduAI! Confirme seu email para começar.',
    emailSubject: 'Bem-vindo(a) ao TamanduAI! Confirme seu email',
    emailHtml: `
      <h2>Bem-vindo(a) ao TamanduAI! 🎓</h2>
      <p>Olá <strong>{{userName}}</strong>, sua conta foi criada com sucesso.</p>
      <p>Clique no botão para confirmar seu email:</p>
      <p><a href="{{confirmationUrl}}">Confirmar Email</a></p>
      <small>Este link expira em 24 horas.</small>
    `,
    variables: ['userName', 'confirmationUrl']
  },
  // Auth & Security
  loginNewDevice: {
    id: 'loginNewDevice',
    type: NotificationType.SYSTEM,
    channel: DeliveryChannel.EMAIL,
    priority: NotificationPriority.MEDIUM,
    title: 'Novo acesso detectado',
    message: 'Login realizado em {device} às {time}. Foi você?',
    emailSubject: 'Novo acesso detectado',
    emailHtml: `<h2>Novo acesso detectado</h2><p>Dispositivo: {{device}} às {{time}}</p>`,
    variables: ['device','time']
  },
  passwordRecoveryRequested: {
    id: 'passwordRecoveryRequested',
    type: NotificationType.AUTHENTICATION,
    channel: DeliveryChannel.EMAIL,
    priority: NotificationPriority.CRITICAL,
    title: 'Recuperação de senha solicitada',
    message: 'Use o código enviado para redefinir sua senha.',
    emailSubject: 'Recuperação de senha',
    emailHtml: `<h2>Recuperação de senha</h2><p>Olá {{userName}}, utilize o código enviado para redefinir sua senha.</p>`,
    variables: ['userName']
  },
  passwordChanged: {
    id: 'passwordChanged',
    type: NotificationType.AUTHENTICATION,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.HIGH,
    title: 'Senha alterada',
    message: 'Sua senha foi alterada com sucesso às {time}.',
    emailSubject: 'Senha alterada com sucesso',
    emailHtml: `<h2>Senha alterada</h2><p>Sua senha foi alterada às {{time}}</p>`,
    variables: ['time']
  },
  profileCompleted: {
    id: 'profileCompleted',
    type: NotificationType.SYSTEM,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.MEDIUM,
    title: 'Perfil completo!',
    message: 'Agora você pode explorar todas as funcionalidades.',
    variables: []
  },

  // Class management
  classInviteSent: {
    id: 'classInviteSent',
    type: NotificationType.SYSTEM,
    channel: DeliveryChannel.EMAIL,
    priority: NotificationPriority.HIGH,
    title: 'Convite para turma',
    message: 'Você foi convidado(a) para a turma {{className}}',
    emailSubject: 'Convite para a turma {{className}}',
    emailHtml: `<h2>Convite para turma</h2><p>Você foi convidado(a) para a turma <strong>{{className}}</strong>.</p><p>Clique para aceitar: <a href="{{acceptUrl}}">Aceitar convite</a></p>`,
    variables: ['className', 'acceptUrl']
  },
  classInviteAccepted: {
    id: 'classInviteAccepted',
    type: NotificationType.SYSTEM,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.MEDIUM,
    title: 'Convite aceito',
    message: '{{studentName}} entrou na turma {{className}}',
    variables: ['studentName','className']
  },
  studentAddedToClass: {
    id: 'studentAddedToClass',
    type: NotificationType.SYSTEM,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.MEDIUM,
    title: 'Aluno adicionado',
    message: '{{studentName}} foi adicionado na turma {{className}}',
    variables: ['studentName','className']
  },
  studentRemovedFromClass: {
    id: 'studentRemovedFromClass',
    type: NotificationType.SYSTEM,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.HIGH,
    title: 'Você foi removido da turma',
    message: 'Turma: {{className}}',
    emailSubject: 'Remoção da turma {{className}}',
    emailHtml: `<h2>Remoção da turma</h2><p>Você foi removido da turma {{className}}</p>`,
    variables: ['className']
  },
  classCreated: {
    id: 'classCreated',
    type: NotificationType.SYSTEM,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.LOW,
    title: 'Nova turma criada',
    message: '{{className}} foi criada com sucesso',
    variables: ['className']
  },
  accountConfirmed: {
    id: 'accountConfirmed',
    type: NotificationType.AUTHENTICATION,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.HIGH,
    title: 'Email confirmado! ✅',
    message: 'Sua conta está ativa. Complete seu perfil para começar.',
    emailSubject: 'Sua conta foi confirmada',
    emailHtml: `
      <h2>Conta confirmada</h2>
      <p>Olá <strong>{{userName}}</strong>, sua conta foi confirmada com sucesso.</p>
    `,
    variables: ['userName']
  },


  // Activities
  newActivity: {
    id: 'newActivity',
    type: NotificationType.ACTIVITY,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.HIGH,
    title: 'Nova atividade: {{activityName}}',
    message: 'Prazo: {{deadline}} • Pontuação: {{points}} pts',
    emailSubject: 'Nova atividade em {{className}}: {{activityName}}',
    emailHtml: `
      <h2>📝 Nova Atividade Disponível</h2>
      <p>Olá <strong>{{studentName}}</strong>,</p>
      <p>Uma nova atividade foi publicada na turma <strong>{{className}}</strong>:</p>
      <p><strong>{{activityName}}</strong></p>
      <p>Prazo: {{deadline}} | Pontos: {{points}}</p>
      <p><a href="{{activityUrl}}">Ver Atividade</a></p>
    `,
    variables: ['studentName','className','activityName','deadline','points','activityUrl']
  },
  deadlineWarning24h: {
    id: 'deadlineWarning24h',
    type: NotificationType.ACTIVITY,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.CRITICAL,
    title: '⏰ Prazo em 24 horas!',
    message: '{{activityName}} vence amanhã às {{time}}',
    emailSubject: 'Lembrete: {{activityName}} vence em 24 horas',
    emailHtml: `
      <h2>⏰ Prazo em 24 horas</h2>
      <p>Atividade: {{activityName}}</p>
      <p>Vence em: {{deadline}}</p>
      <p><a href="{{activityUrl}}">Entregar agora</a></p>
    `,
    variables: ['activityName','deadline','time','activityUrl']
  },
  activityCorrected: {
    id: 'activityCorrected',
    type: NotificationType.CORRECTION,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.HIGH,
    title: 'Atividade corrigida! 🎉',
    message: '{{activityName}} • Nota: {{grade}}/{{maxGrade}}',
    emailSubject: 'Correção disponível: {{activityName}}',
    emailHtml: `
      <h2>✅ Atividade Corrigida</h2>
      <p>{{activityName}} — Nota: {{grade}}/{{maxGrade}}</p>
      <p><a href="{{viewUrl}}">Ver detalhes</a></p>
    `,
    variables: ['activityName','grade','maxGrade','viewUrl']
  },

  // Plagiarism
  plagiarismDetected: {
    id: 'plagiarismDetected',
    type: NotificationType.PLAGIARISM,
    channel: DeliveryChannel.EMAIL,
    priority: NotificationPriority.CRITICAL,
    title: '🚨 Plágio detectado',
    message: '{{studentName}} • {{percentage}}% similaridade • {{activityName}}',
    emailSubject: 'Alerta de Plágio: {{activityName}}',
    emailHtml: `
      <h2>🚨 Alerta de Plágio</h2>
      <p>Aluno: {{studentName}}</p>
      <p>Atividade: {{activityName}}</p>
      <p>Similaridade: {{percentage}}%</p>
      <p><a href="{{reviewUrl}}">Revisar submissão</a></p>
    `,
    variables: ['studentName','activityName','percentage','reviewUrl']
  }
  ,
  analysisStarted: {
    id: 'analysisStarted',
    type: NotificationType.PLAGIARISM,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.LOW,
    title: 'Análise anti-plágio iniciada',
    message: 'Verificando {{activityName}}...'
  },
  falsePositiveMarked: {
    id: 'falsePositiveMarked',
    type: NotificationType.PLAGIARISM,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.LOW,
    title: 'Falso positivo marcado',
    message: 'Análise de plágio atualizada para {{activityName}}'
  },

  // Chatbot
  chatbotTrainingComplete: {
    id: 'chatbotTrainingComplete',
    type: NotificationType.CHATBOT,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.MEDIUM,
    title: 'Chatbot treinado com sucesso!',
    message: 'Base atualizada com {{filesCount}} arquivos',
    variables: ['filesCount']
  },
  chatbotTrainingError: {
    id: 'chatbotTrainingError',
    type: NotificationType.CHATBOT,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.HIGH,
    title: 'Erro no treinamento',
    message: 'Falha ao processar {{fileName}}',
    variables: ['fileName']
  },
  newMaterialProcessed: {
    id: 'newMaterialProcessed',
    type: NotificationType.CHATBOT,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.LOW,
    title: 'Material processado',
    message: '{{fileName}} adicionado à base',
    variables: ['fileName']
  },
  outOfScopeInteraction: {
    id: 'outOfScopeInteraction',
    type: NotificationType.CHATBOT,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.LOW,
    title: 'Pergunta fora do escopo',
    message: 'Aluno perguntou sobre: {{topic}}',
    variables: ['topic']
  },

  // Analytics
  monthlyReportGenerated: {
    id: 'monthlyReportGenerated',
    type: NotificationType.ANALYTICS,
    channel: DeliveryChannel.EMAIL,
    priority: NotificationPriority.MEDIUM,
    title: 'Relatório mensal gerado',
    message: 'Seu relatório de {{monthYear}} está pronto',
    emailSubject: 'Relatório mensal - {{monthYear}}',
    emailHtml: `<h2>Relatório mensal</h2><p>Seu relatório de {{monthYear}} está pronto.</p>`,
    variables: ['monthYear']
  },
  performanceGoalAchieved: {
    id: 'performanceGoalAchieved',
    type: NotificationType.ANALYTICS,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.MEDIUM,
    title: 'Meta de desempenho atingida',
    message: 'Parabéns! Você atingiu sua meta',
    emailSubject: 'Meta de desempenho atingida',
    emailHtml: `<h2>Meta de desempenho atingida</h2><p>Parabéns!</p>`,
    variables: []
  },
  lowPerformanceDetected: {
    id: 'lowPerformanceDetected',
    type: NotificationType.ANALYTICS,
    channel: DeliveryChannel.EMAIL,
    priority: NotificationPriority.HIGH,
    title: 'Baixo desempenho detectado',
    message: 'Identificamos baixo desempenho em {{subject}}',
    emailSubject: 'Baixo desempenho detectado',
    emailHtml: `<h2>Baixo desempenho detectado</h2><p>Área: {{subject}}</p>`,
    variables: ['subject']
  },
  classReportAvailable: {
    id: 'classReportAvailable',
    type: NotificationType.ANALYTICS,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.LOW,
    title: 'Relatório de turma disponível',
    message: 'O relatório da turma {{className}} está disponível',
    variables: ['className']
  },

  // Gamification
  xpEarned: {
    id: 'xpEarned',
    type: NotificationType.GAMIFICATION,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.LOW,
    title: '🌟 +{{xp}} XP ganho!',
    message: '{{reason}} • Total: {{totalXP}} XP',
    variables: ['xp', 'reason', 'totalXP']
  },
  badgeEarned: {
    id: 'badgeEarned',
    type: NotificationType.GAMIFICATION,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.MEDIUM,
    title: '🏆 Nova badge desbloqueada!',
    message: '{{badgeName}} - {{badgeDescription}}',
    emailSubject: 'Você desbloqueou: {{badgeName}}',
    emailHtml: `
      <h2>🏆 Nova Badge Desbloqueada!</h2>
      <p><strong>{{badgeName}}</strong></p>
      <p>{{badgeDescription}}</p>
      <p><a href="{{profileUrl}}">Ver seu perfil</a></p>
    `,
    variables: ['badgeName', 'badgeDescription', 'profileUrl']
  },
  levelUp: {
    id: 'levelUp',
    type: NotificationType.GAMIFICATION,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.HIGH,
    title: '🎉 Level Up! Nível {{level}}',
    message: 'Parabéns! Você alcançou o nível {{level}}!',
    emailSubject: 'Parabéns! Você subiu para o nível {{level}}',
    emailHtml: `
      <h2>🎉 Level Up!</h2>
      <p>Parabéns! Você alcançou o <strong>nível {{level}}</strong>!</p>
      <p>Continue assim e desbloqueie novas conquistas.</p>
    `,
    variables: ['level']
  },

  // Feedback
  feedbackReceived: {
    id: 'feedbackReceived',
    type: NotificationType.FEEDBACK,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.HIGH,
    title: '💬 Novo feedback do professor',
    message: '{{teacherName}} comentou em {{activityName}}',
    emailSubject: 'Feedback em {{activityName}}',
    emailHtml: `
      <h2>💬 Novo Feedback</h2>
      <p>Professor(a) <strong>{{teacherName}}</strong> deixou um comentário em <strong>{{activityName}}</strong></p>
      <p><a href="{{viewUrl}}">Ver feedback</a></p>
    `,
    variables: ['teacherName', 'activityName', 'viewUrl']
  },

  // Meetings & Live Classes
  meetingScheduled: {
    id: 'meetingScheduled',
    type: NotificationType.MEETING,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.MEDIUM,
    title: '📅 Reunião agendada',
    message: '{{meetingTitle}} em {{date}} às {{time}}',
    emailSubject: 'Reunião agendada: {{meetingTitle}}',
    emailHtml: `
      <h2>📅 Reunião Agendada</h2>
      <p><strong>{{meetingTitle}}</strong></p>
      <p>Data: {{date}} às {{time}}</p>
      <p><a href="{{meetingUrl}}">Adicionar ao calendário</a></p>
    `,
    variables: ['meetingTitle', 'date', 'time', 'meetingUrl']
  },
  meetingReminder1h: {
    id: 'meetingReminder1h',
    type: NotificationType.MEETING,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.HIGH,
    title: '⏰ Reunião em 1 hora!',
    message: '{{meetingTitle}} às {{time}}',
    emailSubject: 'Lembrete: {{meetingTitle}} em 1 hora',
    emailHtml: `
      <h2>⏰ Reunião em 1 hora</h2>
      <p><strong>{{meetingTitle}}</strong> às {{time}}</p>
      <p><a href="{{meetingUrl}}">Entrar na reunião</a></p>
    `,
    variables: ['meetingTitle', 'time', 'meetingUrl']
  },
  meetingReminder5min: {
    id: 'meetingReminder5min',
    type: NotificationType.MEETING,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.CRITICAL,
    title: '⏰ Reunião em 5 minutos!',
    message: '{{meetingTitle}} - Prepare-se!',
    variables: ['meetingTitle', 'meetingUrl']
  },
  liveClassStarting: {
    id: 'liveClassStarting',
    type: NotificationType.LIVE_CLASS,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.CRITICAL,
    title: '🔴 Aula ao vivo começando AGORA!',
    message: '{{className}} - Clique para entrar',
    emailSubject: 'Aula ao vivo: {{className}}',
    emailHtml: `
      <h2>🔴 Aula Ao Vivo</h2>
      <p><strong>{{className}}</strong> está começando agora!</p>
      <p><a href="{{liveClassUrl}}">Entrar na aula</a></p>
    `,
    variables: ['className', 'liveClassUrl']
  },
  liveClassReminder15min: {
    id: 'liveClassReminder15min',
    type: NotificationType.LIVE_CLASS,
    channel: DeliveryChannel.BOTH,
    priority: NotificationPriority.HIGH,
    title: '⏰ Aula ao vivo em 15 minutos',
    message: '{{className}} - Prepare seus materiais!',
    emailSubject: 'Aula ao vivo em 15 minutos: {{className}}',
    emailHtml: `
      <h2>⏰ Aula ao vivo em 15 minutos</h2>
      <p><strong>{{className}}</strong></p>
      <p>Prepare seus materiais e esteja pronto!</p>
      <p><a href="{{liveClassUrl}}">Link da aula</a></p>
    `,
    variables: ['className', 'liveClassUrl']
  },
  liveClassReminder5min: {
    id: 'liveClassReminder5min',
    type: NotificationType.LIVE_CLASS,
    channel: DeliveryChannel.PUSH,
    priority: NotificationPriority.HIGH,
    title: '⏰ Aula ao vivo em 5 minutos',
    message: '{{className}} - Não se atrase!',
    variables: ['className']
  }
};

export default notificationTemplates;
