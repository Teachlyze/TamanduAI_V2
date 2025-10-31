// Edge Function: Agendamento de Lembretes Automáticos
// Roda periodicamente (cron) para enviar notificações de deadlines, aulas, etc.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);
const REMINDER_CONFIGS = [
  // Deadlines de atividades
  {
    type: 'activity_deadline',
    timeBeforeMinutes: 24 * 60,
    notificationTemplate: 'deadlineWarning24h'
  },
  // Reuniões
  {
    type: 'meeting',
    timeBeforeMinutes: 60,
    notificationTemplate: 'meetingReminder1h'
  },
  {
    type: 'meeting',
    timeBeforeMinutes: 5,
    notificationTemplate: 'meetingReminder5min'
  },
  // Aulas ao vivo
  {
    type: 'live_class',
    timeBeforeMinutes: 15,
    notificationTemplate: 'liveClassReminder15min'
  },
  {
    type: 'live_class',
    timeBeforeMinutes: 5,
    notificationTemplate: 'liveClassReminder5min'
  },
  {
    type: 'live_class',
    timeBeforeMinutes: 0,
    notificationTemplate: 'liveClassStarting'
  }
];
serve(async (req)=>{
  try {
    console.log('[ScheduleReminders] Starting reminder check...');
    const results = {
      activityReminders: 0,
      meetingReminders: 0,
      liveClassReminders: 0,
      errors: []
    };
    const now = new Date();
    // Processar cada tipo de lembrete
    for (const config of REMINDER_CONFIGS){
      try {
        if (config.type === 'activity_deadline') {
          const sent = await processActivityDeadlines(config, now);
          results.activityReminders += sent;
        } else if (config.type === 'meeting') {
          const sent = await processMeetings(config, now);
          results.meetingReminders += sent;
        } else if (config.type === 'live_class') {
          const sent = await processLiveClasses(config, now);
          results.liveClassReminders += sent;
        }
      } catch (error) {
        console.error(`[ScheduleReminders] Error processing ${config.type}:`, error);
        results.errors.push(`${config.type}: ${error.message}`);
      }
    }
    console.log('[ScheduleReminders] Results:', results);
    return new Response(JSON.stringify({
      success: true,
      timestamp: now.toISOString(),
      results
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[ScheduleReminders] Fatal error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
/**
 * Processa lembretes de deadlines de atividades
 */ async function processActivityDeadlines(config, now) {
  const targetTime = new Date(now.getTime() + config.timeBeforeMinutes * 60 * 1000);
  const windowStart = new Date(targetTime.getTime() - 5 * 60 * 1000) // -5min
  ;
  const windowEnd = new Date(targetTime.getTime() + 5 * 60 * 1000) // +5min
  ;
  // Buscar atividades com deadline neste intervalo
  const { data: activities, error } = await supabase.from('activities').select(`
      id,
      title,
      due_date,
      class_id,
      classes!inner(id, name)
    `).gte('due_date', windowStart.toISOString()).lte('due_date', windowEnd.toISOString()).eq('is_published', true);
  if (error) throw error;
  if (!activities || activities.length === 0) return 0;
  let sentCount = 0;
  for (const activity of activities){
    // Buscar alunos da turma que ainda não submeteram
    const { data: students } = await supabase.from('class_members').select('user_id').eq('class_id', activity.class_id).eq('role', 'student');
    if (!students) continue;
    for (const student of students){
      // Verificar se já submeteu
      const { data: submission } = await supabase.from('activity_submissions').select('id').eq('activity_id', activity.id).eq('user_id', student.user_id).single();
      if (submission) continue; // Já submeteu
      // Verificar se já enviou lembrete (evitar duplicatas)
      const reminderKey = `reminder_${config.notificationTemplate}_${activity.id}_${student.user_id}`;
      const { data: existing } = await supabase.from('notification_logs').select('id').eq('metadata->>reminder_key', reminderKey).single();
      if (existing) continue; // Já enviou
      // Enviar notificação
      await sendNotification({
        userId: student.user_id,
        template: config.notificationTemplate,
        variables: {
          activityName: activity.title,
          deadline: new Date(activity.due_date).toLocaleString('pt-BR'),
          time: new Date(activity.due_date).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          activityUrl: `${Deno.env.get('APP_URL')}/activities/${activity.id}`
        },
        metadata: {
          reminder_key: reminderKey,
          activity_id: activity.id
        }
      });
      sentCount++;
    }
  }
  return sentCount;
}
/**
 * Processa lembretes de reuniões
 */ async function processMeetings(config, now) {
  const targetTime = new Date(now.getTime() + config.timeBeforeMinutes * 60 * 1000);
  const windowStart = new Date(targetTime.getTime() - 5 * 60 * 1000);
  const windowEnd = new Date(targetTime.getTime() + 5 * 60 * 1000);
  const { data: meetings, error } = await supabase.from('meetings').select('id, title, scheduled_at, external_meeting_url, class_id').gte('scheduled_at', windowStart.toISOString()).lte('scheduled_at', windowEnd.toISOString()).eq('status', 'scheduled');
  if (error) throw error;
  if (!meetings || meetings.length === 0) return 0;
  let sentCount = 0;
  for (const meeting of meetings){
    // Buscar participantes
    const { data: participants } = await supabase.from('meeting_participants').select('user_id').eq('meeting_id', meeting.id);
    if (!participants) continue;
    for (const participant of participants){
      const reminderKey = `reminder_${config.notificationTemplate}_${meeting.id}_${participant.user_id}`;
      const { data: existing } = await supabase.from('notification_logs').select('id').eq('metadata->>reminder_key', reminderKey).single();
      if (existing) continue;
      await sendNotification({
        userId: participant.user_id,
        template: config.notificationTemplate,
        variables: {
          meetingTitle: meeting.title,
          time: new Date(meeting.scheduled_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          meetingUrl: meeting.external_meeting_url || `${Deno.env.get('APP_URL')}/meetings/${meeting.id}`
        },
        metadata: {
          reminder_key: reminderKey,
          meeting_id: meeting.id
        }
      });
      sentCount++;
    }
  }
  return sentCount;
}
/**
 * Processa lembretes de aulas ao vivo
 */ async function processLiveClasses(config, now) {
  const targetTime = new Date(now.getTime() + config.timeBeforeMinutes * 60 * 1000);
  const windowStart = new Date(targetTime.getTime() - 5 * 60 * 1000);
  const windowEnd = new Date(targetTime.getTime() + 5 * 60 * 1000);
  // Buscar aulas ao vivo agendadas
  const { data: liveClasses, error } = await supabase.from('calendar_events').select(`
      id,
      title,
      start_time,
      event_type,
      class_id,
      metadata,
      classes!inner(id, name)
    `).gte('start_time', windowStart.toISOString()).lte('start_time', windowEnd.toISOString()).eq('event_type', 'live_class');
  if (error) throw error;
  if (!liveClasses || liveClasses.length === 0) return 0;
  let sentCount = 0;
  for (const liveClass of liveClasses){
    // Buscar todos os alunos da turma
    const { data: students } = await supabase.from('class_members').select('user_id').eq('class_id', liveClass.class_id).eq('role', 'student');
    if (!students) continue;
    for (const student of students){
      const reminderKey = `reminder_${config.notificationTemplate}_${liveClass.id}_${student.user_id}`;
      const { data: existing } = await supabase.from('notification_logs').select('id').eq('metadata->>reminder_key', reminderKey).single();
      if (existing) continue;
      await sendNotification({
        userId: student.user_id,
        template: config.notificationTemplate,
        variables: {
          className: liveClass.classes.name,
          liveClassUrl: liveClass.metadata?.meeting_url || `${Deno.env.get('APP_URL')}/classes/${liveClass.class_id}/live`
        },
        metadata: {
          reminder_key: reminderKey,
          event_id: liveClass.id
        }
      });
      sentCount++;
    }
  }
  return sentCount;
}
/**
 * Envia notificação através do sistema de notificações
 */ async function sendNotification(params) {
  // Criar notificação no banco
  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.template,
    title: getNotificationTitle(params.template, params.variables),
    message: getNotificationMessage(params.template, params.variables),
    is_read: false,
    metadata: params.metadata || {}
  });
  if (error) {
    console.error('[sendNotification] Error:', error);
    throw error;
  }
  // Log para evitar duplicatas
  await supabase.from('notification_logs').insert({
    user_id: params.userId,
    template: params.template,
    sent_at: new Date().toISOString(),
    metadata: params.metadata || {}
  });
}
/**
 * Helper para gerar título da notificação
 */ function getNotificationTitle(template, vars) {
  const titles = {
    'deadlineWarning24h': '⏰ Prazo em 24 horas!',
    'meetingReminder1h': '⏰ Reunião em 1 hora!',
    'meetingReminder5min': '⏰ Reunião em 5 minutos!',
    'liveClassReminder15min': '⏰ Aula ao vivo em 15 minutos',
    'liveClassReminder5min': '⏰ Aula ao vivo em 5 minutos',
    'liveClassStarting': '🔴 Aula ao vivo começando AGORA!'
  };
  return titles[template] || 'Lembrete';
}
/**
 * Helper para gerar mensagem da notificação
 */ function getNotificationMessage(template, vars) {
  const messages = {
    'deadlineWarning24h': (v)=>`${v.activityName} vence amanhã às ${v.time}`,
    'meetingReminder1h': (v)=>`${v.meetingTitle} às ${v.time}`,
    'meetingReminder5min': (v)=>`${v.meetingTitle} - Prepare-se!`,
    'liveClassReminder15min': (v)=>`${v.className} - Prepare seus materiais!`,
    'liveClassReminder5min': (v)=>`${v.className} - Não se atrase!`,
    'liveClassStarting': (v)=>`${v.className} - Clique para entrar`
  };
  return messages[template]?.(vars) || 'Você tem um lembrete';
}
