import { useRedisCache } from '@/shared/hooks/useRedisCache';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useCallback } from 'react';

/**
 * Hook granular para turmas e atividades recentes
 * Separado para evitar re-renders quando apenas stats mudam
 */
export const useDashboardRecentData = () => {
  const { user } = useAuth();

  const fetchRecentData = useCallback(async () => {
    if (!user?.id) return { classes: [], activities: [] };

    try {
      // Buscar turmas recentes
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          class_members(count)
        `)
        .eq('created_by', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (classesError) throw classesError;

      const classesFormatted = (classes || []).map(cls => ({
        ...cls,
        student_count: cls.class_members?.[0]?.count || 0,
      }));

      // Buscar atividades recentes
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          *,
          activity_class_assignments(class:classes(name))
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (activitiesError) throw activitiesError;

      const activitiesFormatted = (activities || []).map(act => ({
        ...act,
        class_name: act.activity_class_assignments?.[0]?.class?.name || 'Sem turma',
      }));

      return {
        classes: classesFormatted,
        activities: activitiesFormatted,
      };
    } catch (error) {
      console.error('[useDashboardRecentData] Error:', error);
      return { classes: [], activities: [] };
    }
  }, [user?.id]);

  return useRedisCache(
    `teacher:dashboard:recent:${user?.id}`,
    fetchRecentData,
    {
      ttl: 5 * 60, // 5 minutos
      enabled: !!user?.id,
      staleTime: 2 * 60 * 1000, // 2 minutos
    }
  );
};
