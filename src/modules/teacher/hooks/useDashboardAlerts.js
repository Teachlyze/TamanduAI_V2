import { useRedisCache } from '@/shared/hooks/useRedisCache';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useCallback } from 'react';
import { logger } from '@/shared/utils/logger';

/**
 * Hook granular para alunos em risco (alerta)
 * Cache mais longo pois não muda com tanta frequência
 */
export const useDashboardAlerts = (threshold = 6.0) => {
  const { user } = useAuth();

  const fetchAlerts = useCallback(async () => {
    if (!user?.id) return [];

    try {
      // Buscar IDs das atividades do professor
      const { data: activities } = await supabase
        .from('activities')
        .select('id')
        .eq('created_by', user.id);

      const activityIds = activities?.map(a => a.id) || [];

      if (activityIds.length === 0) return [];

      // Buscar notas dos alunos
      const { data: studentGrades, error } = await supabase
        .from('submissions')
        .select(`
          student_id,
          grade,
          student:profiles!student_id(full_name)
        `)
        .in('activity_id', activityIds)
        .not('grade', 'is', null);

      if (error) throw error;

      // Agrupar por aluno e calcular média
      const studentAvgs = {};
      (studentGrades || []).forEach(sub => {
        if (!studentAvgs[sub.student_id]) {
          studentAvgs[sub.student_id] = {
            grades: [],
            name: sub.student?.full_name || 'Aluno',
          };
        }
        studentAvgs[sub.student_id].grades.push(sub.grade);
      });

      // Filtrar alunos com média abaixo do threshold
      const alerts = Object.entries(studentAvgs)
        .map(([id, data]) => ({
          id,
          name: data.name,
          avgGrade: data.grades.reduce((s, g) => s + g, 0) / data.grades.length,
          totalActivities: data.grades.length,
        }))
        .filter(s => s.avgGrade < threshold)
        .sort((a, b) => a.avgGrade - b.avgGrade)
        .slice(0, 10);

      return alerts;
    } catch (error) {
      logger.error('[useDashboardAlerts] Error:', error);
      return [];
    }
  }, [user?.id, threshold]);

  return useRedisCache(
    `teacher:dashboard:alerts:${user?.id}:${threshold}`,
    fetchAlerts,
    {
      ttl: 10 * 60, // 10 minutos (alertas não mudam rapidamente)
      enabled: !!user?.id,
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );
};
