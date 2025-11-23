import { useRedisCache } from '@/shared/hooks/useRedisCache';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useCallback } from 'react';
import { logger } from '@/shared/utils/logger';

/**
 * Hook granular para estatísticas do dashboard do professor
 * Usa Redis cache com TTL de 5 minutos
 * Só revalida quando invocado explicitamente
 */
export const useDashboardStats = () => {
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    if (!user?.id) return null;

    try {
      // Buscar turmas ativas do professor
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, class_members(count)')
        .eq('created_by', user.id)
        .eq('is_active', true);

      if (classesError) throw classesError;

      // Calcular total de alunos
      const totalStudents = (classes || []).reduce(
        (sum, cls) => sum + (cls.class_members?.[0]?.count || 0),
        0
      );

      // Buscar atividades do professor
      const activityIds = await supabase
        .from('activities')
        .select('id')
        .eq('created_by', user.id);

      const ids = activityIds.data?.map(a => a.id) || [];

      // Submissões pendentes
      const { data: pending } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .in('activity_id', ids)
        .eq('status', 'submitted');

      // Média geral
      const { data: grades } = await supabase
        .from('submissions')
        .select('grade')
        .in('activity_id', ids)
        .not('grade', 'is', null);

      const avgGrade = grades?.length > 0
        ? grades.reduce((sum, s) => sum + s.grade, 0) / grades.length
        : 0;

      // Correções de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: todayGraded } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .in('activity_id', ids)
        .gte('graded_at', today.toISOString())
        .lt('graded_at', tomorrow.toISOString());

      return {
        totalClasses: classes?.length || 0,
        totalStudents,
        totalActivities: ids.length,
        pendingGrading: pending?.length || 0,
        avgGrade: Number(avgGrade.toFixed(1)),
        todayCorrections: todayGraded?.length || 0,
      };
    } catch (error) {
      logger.error('[useDashboardStats] Error:', error);
      throw error;
    }
  }, [user?.id]);

  return useRedisCache(
    `teacher:dashboard:stats:${user?.id}`,
    fetchStats,
    {
      ttl: 5 * 60, // 5 minutos
      enabled: !!user?.id,
      staleTime: 2 * 60 * 1000, // 2 minutos
    }
  );
};
