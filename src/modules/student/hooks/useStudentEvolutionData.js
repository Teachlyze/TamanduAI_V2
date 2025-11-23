import { useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRedisCache } from '@/shared/hooks/useRedisCache';
import { logger } from '@/shared/utils/logger';

/**
 * Hook compartilhado para carregar dados de evolução de notas do aluno.
 *
 * Retorna um array de pontos com:
 *  - date: string dd/MM
 *  - fullDate: ISO da submissão
 *  - nota: nota numérica da submissão
 *  - maxScore: pontuação máxima da activity
 *  - activity_id, class_id
 */
export const useStudentEvolutionData = (limit = 20) => {
  const { user } = useAuth();

  const fetchEvolution = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select(`
          grade,
          submitted_at,
          activity_id,
          activity:activities(max_score)
        `)
        .eq('student_id', user.id)
        .not('grade', 'is', null)
        .order('submitted_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      const activityIds = (submissions || []).map((s) => s.activity_id).filter(Boolean);

      let activityClassMap = {};
      if (activityIds.length > 0) {
        const { data: assignments, error: assignError } = await supabase
          .from('activity_class_assignments')
          .select('activity_id, class_id')
          .in('activity_id', activityIds);

        if (assignError) throw assignError;

        (assignments || []).forEach((a) => {
          activityClassMap[a.activity_id] = a.class_id;
        });
      }

      return (submissions || []).map((s) => ({
        date: format(new Date(s.submitted_at), 'dd/MM', { locale: ptBR }),
        fullDate: s.submitted_at,
        nota: parseFloat(s.grade) || 0,
        maxScore: s.activity?.max_score || 10,
        activity_id: s.activity_id,
        class_id: activityClassMap[s.activity_id],
      }));
    } catch (err) {
      logger.error('[useStudentEvolutionData] Error:', err);
      return [];
    }
  }, [user?.id, limit]);

  return useRedisCache(
    `student:evolution:${user?.id}:${limit}`,
    fetchEvolution,
    {
      ttl: 5 * 60, // 5 minutos
      enabled: !!user?.id,
      staleTime: 60 * 1000, // 1 minuto
    },
  );
};
