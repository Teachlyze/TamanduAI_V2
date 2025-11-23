import { useCallback } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRedisCache } from '@/shared/hooks/useRedisCache';
import { logger } from '@/shared/utils/logger';

/**
 * Hook para carregar e cachear as atividades do professor (banco de atividades).
 *
 * Usa useRedisCache (Upstash Redis via edge function) para evitar repetir
 * a mesma query pesada em toda navegação.
 */
export const useTeacherActivities = (showArchived = false) => {
  const { user } = useAuth();

  const fetchActivities = useCallback(async () => {
    if (!user?.id) return [];

    try {
      let query = supabase
        .from('activities')
        .select(`
          *,
          assignments:activity_class_assignments(
            id, class_id, assigned_at,
            class:classes(id, name)
          ),
          submissions:submissions(id, status, grade)
        `)
        .eq('created_by', user.id)
        .is('deleted_at', null);

      // Excluir arquivadas por padrão
      if (!showArchived) {
        query = query.neq('status', 'archived');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const rawActivities = data || [];

      // Mapear se alguma atividade tem versão mais nova
      const hasNewerVersionMap = new Map();
      rawActivities.forEach((activity) => {
        const prevId = activity.content?.advanced_settings?.previousActivityId;
        if (prevId) {
          hasNewerVersionMap.set(prevId, true);
        }
      });

      const processedActivities = rawActivities.map((activity) => {
        const submittedCount =
          activity.submissions?.filter(
            (s) => s.status === 'submitted' || s.status === 'graded',
          ).length || 0;

        const gradedSubmissions =
          activity.submissions?.filter((s) => s.grade !== null) || [];
        const avgGrade =
          submittedCount > 0 && gradedSubmissions.length > 0
            ?
              gradedSubmissions.reduce(
                (acc, s) => acc + parseFloat(s.grade),
                0,
              ) / gradedSubmissions.length
            : 0;

        const version = activity.content?.advanced_settings?.version || 1;
        const previousActivityId =
          activity.content?.advanced_settings?.previousActivityId || null;
        const hasNewerVersion = hasNewerVersionMap.has(activity.id);

        return {
          ...activity,
          timesUsed: activity.assignments?.length || 0,
          submittedCount,
          avgGrade: avgGrade.toFixed(2),
          classNames:
            activity.assignments?.map((a) => a.class?.name).filter(Boolean) ||
            [],
          version,
          previousActivityId,
          hasNewerVersion,
        };
      });

      return processedActivities;
    } catch (error) {
      logger.error('[useTeacherActivities] Error:', error);
      throw error;
    }
  }, [user?.id, showArchived]);

  const cacheKey =
    user?.id !== undefined
      ? `teacher:activities:${user.id}:${showArchived ? 'with-archived' : 'active'}`
      : null;

  return useRedisCache(cacheKey, fetchActivities, {
    ttl: 10 * 60, // 10 minutos
    enabled: !!cacheKey,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};
