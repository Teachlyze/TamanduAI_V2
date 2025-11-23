import { useCallback } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRedisCache } from '@/shared/hooks/useRedisCache';
import { logger } from '@/shared/utils/logger';

/**
 * Hook para carregar detalhes de uma atividade para o aluno (versão redesenhada)
 * com cache via useRedisCache.
 *
 * Retorna:
 *  - currentUser
 *  - activity (inclui class_name, class_color, class_id, teacher_name)
 *  - submission
 *  - classStats (média, maxGrade, totalSubmissions)
 *  - submissionAttempts
 */
export const useStudentActivityDetails = (activityId) => {
  const { user } = useAuth();

  const fetchDetails = useCallback(async () => {
    if (!activityId || !user?.id) return null;

    try {
      const { data: userResp, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const currentUser = userResp?.user;

      if (!currentUser?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { data: activityData, error: actError } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .single();

      if (actError) throw actError;

      const { data: assignment } = await supabase
        .from('activity_class_assignments')
        .select('class_id')
        .eq('activity_id', activityId)
        .single();

      let classData = null;
      if (assignment) {
        const { data: cls } = await supabase
          .from('classes')
          .select('id, name, color')
          .eq('id', assignment.class_id)
          .single();
        classData = cls;
      }

      let teacherData = null;
      if (activityData?.created_by) {
        const { data: teacher } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', activityData.created_by)
          .maybeSingle();
        teacherData = teacher;
      }

      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('activity_id', activityId)
        .eq('student_id', currentUser.id)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (submissionsError) throw submissionsError;

      const submissionData = submissionsData?.[0] || null;

      const attemptsCount = submissionData
        ? typeof submissionData.content?.attemptNumber === 'number'
          ? submissionData.content.attemptNumber
          : 1
        : 0;

      let classStats = null;
      if (submissionData?.status === 'graded') {
        const { data: stats, error: statsError } = await supabase
          .from('submissions')
          .select('grade')
          .eq('activity_id', activityId)
          .eq('status', 'graded')
          .not('grade', 'is', null);

        if (statsError) throw statsError;

        if (stats && stats.length > 0) {
          const grades = stats.map((s) => parseFloat(s.grade));
          const average = grades.reduce((a, b) => a + b, 0) / grades.length;
          const max = Math.max(...grades);

          classStats = {
            average,
            maxGrade: max,
            totalSubmissions: stats.length,
          };
        }
      }

      const activityWithClass = {
        ...activityData,
        class_name: classData?.name,
        class_color: classData?.color,
        class_id: classData?.id,
        teacher_name:
          teacherData?.full_name || teacherData?.name || teacherData?.email || null,
      };

      return {
        currentUser,
        activity: activityWithClass,
        submission: submissionData,
        classStats,
        submissionAttempts: attemptsCount,
      };
    } catch (error) {
      logger.error('[useStudentActivityDetails] Erro geral:', error);
      throw error;
    }
  }, [activityId, user?.id]);

  const cacheKey =
    activityId && user?.id
      ? `student:activity-details:${user.id}:${activityId}`
      : null;

  return useRedisCache(cacheKey, fetchDetails, {
    ttl: 5 * 60,
    enabled: !!cacheKey,
    staleTime: 60 * 1000,
  });
};
