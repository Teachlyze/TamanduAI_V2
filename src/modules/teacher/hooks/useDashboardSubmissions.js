import { useRedisCache } from '@/shared/hooks/useRedisCache';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useCallback } from 'react';
import { startOfDay, endOfDay, subDays, getDay, parseISO } from 'date-fns';

/**
 * Hook granular para submissões pendentes
 * Usa cache Redis e só revalida quando necessário
 */
export const useDashboardSubmissions = (limit = 10) => {
  const { user } = useAuth();

  const fetchSubmissions = useCallback(async () => {
    if (!user?.id) return [];

    try {
      // Buscar IDs das atividades do professor
      const { data: activities } = await supabase
        .from('activities')
        .select('id')
        .eq('created_by', user.id);

      const activityIds = activities?.map(a => a.id) || [];

      if (activityIds.length === 0) return { submissions: [], weeklySubmissions: [0, 0, 0, 0, 0, 0, 0], weeklyTotal: 0 };

      // Buscar submissões pendentes
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select(`
          *,
          activity:activities(title),
          student:profiles!student_id(full_name)
        `)
        .in('activity_id', activityIds)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      // Buscar todas as submissões dos últimos 7 dias para o gráfico
      const today = new Date();
      const from = startOfDay(subDays(today, 6)); // últimos 7 dias incluindo hoje
      const to = endOfDay(today);

      const { data: weeklyData } = await supabase
        .from('submissions')
        .select('submitted_at')
        .in('activity_id', activityIds)
        .gte('submitted_at', from.toISOString())
        .lte('submitted_at', to.toISOString());

      // Agrupar por dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
      const weeklySubmissions = [0, 0, 0, 0, 0, 0, 0];
      weeklyData?.forEach(sub => {
        const day = getDay(parseISO(sub.submitted_at));
        weeklySubmissions[day === 0 ? 6 : day - 1]++; // Ajustar: Segunda=0, Domingo=6
      });

      const weeklyTotal = weeklyData?.length || 0;

      const formattedSubmissions = (submissions || []).map(sub => ({
        ...sub,
        student_name: sub.student?.full_name || 'Aluno',
        activity_title: sub.activity?.title || 'Atividade',
      }));

      return {
        submissions: formattedSubmissions,
        weeklySubmissions,
        weeklyTotal
      };
    } catch (error) {
      console.error('[useDashboardSubmissions] Error:', error);
      return { submissions: [], weeklySubmissions: [0, 0, 0, 0, 0, 0, 0], weeklyTotal: 0 };
    }
  }, [user?.id, limit]);

  return useRedisCache(
    `teacher:dashboard:submissions:${user?.id}:${limit}`,
    fetchSubmissions,
    {
      ttl: 2 * 60, // 2 minutos (submissões mudam frequentemente)
      enabled: !!user?.id,
      staleTime: 30 * 1000, // 30 segundos
    }
  );
};
