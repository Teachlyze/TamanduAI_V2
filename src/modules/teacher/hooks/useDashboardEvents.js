import { useRedisCache } from '@/shared/hooks/useRedisCache';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { addDays } from 'date-fns';
import { useCallback } from 'react';

/**
 * Hook granular para eventos do dashboard
 * Separado dos stats para evitar re-renders desnecessários
 */
export const useDashboardEvents = (daysAhead = 7) => {
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    if (!user?.id) return { today: [], upcoming: [] };

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const futureEnd = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));

      // Buscar eventos de hoje com joins para obter contexto
      const { data: todayData, error: todayError } = await supabase
        .from('calendar_events')
        .select(`
          *,
          class:classes(name, subject),
          activity:activities(title, type)
        `)
        .eq('created_by', user.id)
        .gte('start_time', todayStart.toISOString())
        .lt('start_time', todayEnd.toISOString())
        .eq('is_cancelled', false)
        .order('start_time', { ascending: true });

      if (todayError) throw todayError;

      // Buscar próximos eventos com joins para obter contexto
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('calendar_events')
        .select(`
          *,
          class:classes(name, subject),
          activity:activities(title, type)
        `)
        .eq('created_by', user.id)
        .gte('start_time', todayEnd.toISOString())
        .lte('start_time', futureEnd.toISOString())
        .eq('is_cancelled', false)
        .order('start_time', { ascending: true })
        .limit(10);

      if (upcomingError) throw upcomingError;

      return {
        today: (todayData || []).map(event => ({
          ...event,
          class_name: event.class?.name || 'Aula Geral',
          class_subject: event.class?.subject || '',
          activity_title: event.activity?.title || '',
          activity_type: event.activity?.type || '',
        })),
        upcoming: (upcomingData || []).map(event => ({
          ...event,
          class_name: event.class?.name || 'Aula Geral',
          class_subject: event.class?.subject || '',
          activity_title: event.activity?.title || '',
          activity_type: event.activity?.type || '',
        })),
      };
    } catch (error) {
      console.error('[useDashboardEvents] Error:', error);
      return { today: [], upcoming: [] };
    }
  }, [user?.id, daysAhead]);

  return useRedisCache(
    `teacher:dashboard:events:${user?.id}:${daysAhead}`,
    fetchEvents,
    {
      ttl: 3 * 60, // 3 minutos
      enabled: !!user?.id,
      staleTime: 60 * 1000, // 1 minuto
    }
  );
};
