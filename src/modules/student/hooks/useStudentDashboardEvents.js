import { logger } from '@/shared/utils/logger';
import { useCallback } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRedisCache } from '@/shared/hooks/useRedisCache';

/**
 * Hook granular para eventos (agenda curta) do dashboard do aluno
 * Usa Redis/Upstash via useRedisCache para evitar repetir queries pesadas
 */
export const useStudentDashboardEvents = (daysRange = 3) => {
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    if (!user?.id) return [];

    const days = daysRange ?? 3;

    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + days);

      // 1. Buscar eventos do calendário
      const { data: calendarData = [], error: calendarError } = await supabase
        .from('calendar_events')
        .select(`
          id,
          title,
          start_time,
          end_time,
          type,
          class_id,
          class:classes(id, name, subject)
        `)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      if (calendarError) {
        logger.error('[StudentDashboardEvents] Erro ao buscar eventos:', calendarError);
      }

      // 2. Buscar reuniões
      const { data: meetingData = [], error: meetingError } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          start_time,
          end_time,
          class_id,
          meeting_url,
          class:classes(id, name, subject)
        `)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      if (meetingError) {
        logger.error('[StudentDashboardEvents] Erro ao buscar reuniões:', meetingError);
      }

      // 3. Buscar turmas do aluno para prazos de atividades
      const { data: memberships = [] } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships.map((m) => m.class_id);

      // 4. Buscar prazos de atividades das turmas do aluno
      let activitiesData = [];
      if (classIds.length > 0) {
        const { data: activityAssignments, error: activitiesError } = await supabase
          .from('activity_class_assignments')
          .select(`
            activity_id,
            class_id,
            class:classes(id, name, subject),
            activity:activities(
              id,
              title,
              due_date,
              status
            )
          `)
          .in('class_id', classIds);

        if (activitiesError) {
          logger.error('[StudentDashboardEvents] Erro ao buscar atividades:', activitiesError);
        }

        activitiesData = (activityAssignments || [])
          .filter((a) => {
            const act = a.activity;
            if (!act?.due_date) return false;

            const status = act.status;
            const isPublished = status === 'published' || status === 'active';
            const due = new Date(act.due_date);
            return (
              isPublished &&
              due >= start &&
              due <= end
            );
          })
          .map((a) => ({
            id: `activity-${a.activity.id}`,
            title: a.activity.title || 'Atividade',
            start: a.activity.due_date,
            end: null,
            type: 'prazo',
            link: `/students/activities/${a.activity.id}`,
            classId: a.class_id,
            className: a.class?.name,
            classSubject: a.class?.subject,
          }));
      }

      // 5. Normalizar e combinar todos os eventos
      const normalized = [
        ...(calendarData || []).map((event) => ({
          id: `cal-${event.id}`,
          title: event.title || 'Evento',
          start: event.start_time,
          end: event.end_time,
          type: event.type || 'evento',
          link: null,
          classId: event.class_id || null,
          className: event.class?.name,
          classSubject: event.class?.subject,
        })),
        ...(meetingData || []).map((meeting) => ({
          id: `meet-${meeting.id}`,
          title: meeting.title || 'Reunião',
          start: meeting.start_time,
          end: meeting.end_time,
          type: 'reunião',
          link: meeting.meeting_url || null,
          classId: meeting.class_id || null,
          className: meeting.class?.name,
          classSubject: meeting.class?.subject,
        })),
        ...activitiesData,
      ].sort((a, b) => new Date(a.start) - new Date(b.start));

      // Limitar aos 5 primeiros eventos
      return normalized.slice(0, 5);
    } catch (error) {
      logger.error('[StudentDashboardEvents] Erro ao carregar eventos:', error);
      return [];
    }
  }, [user?.id, daysRange]);

  return useRedisCache(
    `student:dashboard:events:${user?.id}:${daysRange}`,
    fetchEvents,
    {
      ttl: 60, // 1 minuto
      enabled: !!user?.id,
      staleTime: 30 * 1000, // 30 segundos
    },
  );
};
