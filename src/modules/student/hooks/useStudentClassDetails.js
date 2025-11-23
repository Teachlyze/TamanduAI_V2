import { useCallback } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRedisCache } from '@/shared/hooks/useRedisCache';
import { logger } from '@/shared/utils/logger';

/**
 * Hook para carregar dados completos da turma do aluno com cache Redis/Upstash.
 *
 * Usa a Edge Function get-class-data-optimized para dados gerais da turma
 * (classe, posts, materiais, atividades, membros) e complementa com as
 * submissões do aluno para calcular notas, pendências e status por atividade.
 */
export const useStudentClassDetails = (classId) => {
  const { user } = useAuth();

  const fetchClassData = useCallback(async () => {
    if (!classId || !user?.id) return null;

    try {
      // 1) Chamar Edge Function otimizada (já com Redis no backend)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-class-data-optimized`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ classId }),
        },
      );

      if (!response.ok) {
        throw new Error(`Edge Function falhou (${response.status})`);
      }

      const result = await response.json();
      const data = result.data;

      // Combinar posts e discussões em um único feed
      const allPosts = [
        ...(data.posts || []),
        ...(data.discussions || []).map((d) => ({
          ...d,
          title: d.title,
          description: d.description,
          content: d.description,
          creator: d.author,
          created_at: d.created_at,
        })),
      ];

      // Atividades publicadas retornadas pela Edge
      const publishedActivities = (data.activities || []).filter(
        (a) => a.status === 'published',
      );

      // Membros: filtrar apenas alunos
      const students = (data.members || [])
        .filter((m) => m.role === 'student')
        .map((m) => ({
          id: m.profile?.id,
          full_name: m.profile?.full_name,
          email: m.profile?.email,
          avatar_url: m.profile?.avatar_url,
        }))
        .filter((s) => !!s.id);

      // 2) Buscar submissões do aluno para essas atividades
      const activityIds = publishedActivities.map((a) => a.id);

      let submissions = [];
      if (activityIds.length > 0) {
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('submissions')
          .select('activity_id, status, grade, submitted_at')
          .eq('student_id', user.id)
          .in('activity_id', activityIds);

        if (submissionsError) {
          logger.error('[useStudentClassDetails] Erro submissions:', submissionsError);
        } else {
          submissions = submissionsData || [];
        }
      }

      const submissionsMap = new Map(
        (submissions || []).map((s) => [s.activity_id, s]),
      );

      // Montar lista de notas por atividade
      const gradesList = (submissions || [])
        .filter((s) => s.grade !== null && s.grade !== undefined)
        .map((s) => {
          const act =
            publishedActivities.find((a) => a.id === s.activity_id) || {};
          return {
            id: `${s.activity_id}`,
            activity_title: act.title || 'Atividade',
            grade: Number(s.grade),
            max_score: Number(act.max_score) || 100,
            feedback: act.feedback || null,
          };
        });

      const avgGrade =
        gradesList.length > 0
          ?
            gradesList.reduce((sum, g) => sum + Number(g.grade), 0) /
            gradesList.length
          : 0;

      // Adicionar status de submissão em cada atividade
      const activitiesWithStatus = publishedActivities.map((activity) => {
        const submission = submissionsMap.get(activity.id);
        const hasSubmissionRecord = !!submission;
        const hasFinalSubmission =
          hasSubmissionRecord &&
          (submission.status === 'submitted' ||
            submission.status === 'graded');
        const isLate =
          !hasFinalSubmission &&
          activity.due_date &&
          new Date(activity.due_date) < new Date();

        return {
          ...activity,
          submission,
          hasSubmission: hasFinalSubmission,
          isCompleted: hasFinalSubmission && submission.status === 'graded',
          isPending: !hasFinalSubmission && !isLate,
          isLate,
          status: hasFinalSubmission
            ? submission.status === 'graded'
              ? 'completed'
              : 'submitted'
            : isLate
              ? 'late'
              : 'pending',
        };
      });

      const pendingActivitiesCount = activitiesWithStatus.filter(
        (a) => a.isPending,
      ).length;

      const teacher = data.classInfo?.teacher;
      const classInfo = {
        ...data.classInfo,
        teacher_name: teacher?.full_name || 'Professor',
        teacher_avatar: teacher?.avatar_url || null,
        teacher_email: teacher?.email || null,
      };

      return {
        classData: classInfo,
        announcements: allPosts,
        materials: data.library || [],
        activities: activitiesWithStatus,
        grades: gradesList,
        students,
        stats: {
          pendingActivities: pendingActivitiesCount,
          avgGrade,
          studentsCount: students.length,
        },
      };
    } catch (error) {
      logger.error('[useStudentClassDetails] Erro geral:', error);
      throw error;
    }
  }, [classId, user?.id]);

  const cacheKey = classId && user?.id
    ? `student:class:${user.id}:${classId}`
    : null;

  return useRedisCache(cacheKey, fetchClassData, {
    ttl: 5 * 60,
    enabled: !!cacheKey,
    staleTime: 2 * 60 * 1000,
  });
};
