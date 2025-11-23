import { logger } from '@/shared/utils/logger';
import { useCallback } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRedisCache } from '@/shared/hooks/useRedisCache';

/**
 * Hook granular para dados principais do dashboard do aluno
 * (turmas, atividades, submissões, estatísticas)
 *
 * Usa Redis/Upstash via useRedisCache para evitar repetir as mesmas
 * queries pesadas a cada navegação.
 */
export const useStudentDashboardData = () => {
  const { user } = useAuth();

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      return null;
    }

    try {
      // 1. Buscar turmas do aluno - mesma lógica otimizada do StudentDashboard.jsx
      let classes = [];
      let classIds = [];

      try {
        const { data: memberships, error: membershipError } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('user_id', user.id)
          .eq('role', 'student');

        if (membershipError) {
          logger.error('[useStudentDashboardData] ❌ Erro ao buscar memberships:', membershipError);
          throw membershipError;
        }

        classIds = memberships?.map((m) => m.class_id) || [];

        if (classIds.length > 0) {
          const classesPromise = supabase
            .from('classes')
            .select('id, name, subject, color, banner_color')
            .in('id', classIds);

          const timeout2 = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 3000),
          );

          const { data: classesData, error: classesError } = await Promise.race([
            classesPromise,
            timeout2,
          ]);

          if (classesError) {
            logger.error('[useStudentDashboardData] ❌ Erro ao buscar classes:', classesError);
            throw classesError;
          }

          classes = classesData || [];
        }
      } catch (err) {
        logger.error('[useStudentDashboardData] ❌ Erro ao buscar turmas:', err);
        // Continua com arrays vazios
      }

      // Sem turmas ainda: retorna payload mínimo
      if (classIds.length === 0) {
        return {
          stats: {
            totalClasses: 0,
            activeActivities: 0,
            completedActivities: 0,
            upcomingDeadlines: 0,
            completionRate: 0,
            avgGrade: 0,
          },
          myClasses: [],
          pendingActivities: [],
          recentGrades: [],
          upcomingDeadlines: [],
          classPerformance: [],
          alerts: [
            {
              id: 1,
              type: 'info',
              message: 'Você ainda não está em nenhuma turma',
              action: 'Entrar',
            },
          ],
        };
      }

      // 2. Buscar atividades das turmas
      let allActivities = [];
      let publishedActivities = [];
      const activityClassMap = new Map();
      let activitiesWithClass = [];

      try {
        const { data: activityAssignments, error: activitiesError } = await supabase
          .from('activity_class_assignments')
          .select(`
            activity_id,
            class_id,
            class:classes (
              id,
              name,
              subject,
              color
            ),
            activity:activities(
              id,
              title,
              due_date,
              max_score,
              type,
              status
            )
          `)
          .in('class_id', classIds);

        if (activitiesError) {
          logger.error('[useStudentDashboardData] ❌ Erro ao buscar atividades:', activitiesError);
          throw activitiesError;
        }

        activitiesWithClass = (activityAssignments || []).map((assignment) => {
          const activity = assignment.activity || {};
          const classInfo = assignment.class || {};

          return {
            ...activity,
            classId: assignment.class_id || classInfo.id,
            className: classInfo.name,
            classSubject: classInfo.subject,
            classColor: classInfo.color,
          };
        });

        activitiesWithClass.forEach((activity) => {
          activityClassMap.set(activity.id, {
            classId: activity.classId,
            className: activity.className,
            classSubject: activity.classSubject,
            classColor: activity.classColor,
            maxScore: activity.max_score || 0,
            title: activity.title,
          });
        });

        allActivities = activitiesWithClass;
        publishedActivities = activitiesWithClass.filter((activity) => {
          const status = activity.status;
          return status === 'published' || status === 'active';
        });
      } catch (err) {
        logger.error('[useStudentDashboardData] Timeout ou erro ao buscar atividades:', err.message);
      }

      // 3. Buscar submissões do aluno
      let submissions = [];

      try {
        const submissionsPromise = supabase
          .from('submissions')
          .select('id, activity_id, status, grade, submitted_at, graded_at')
          .eq('student_id', user.id);

        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000),
        );

        const { data } = await Promise.race([submissionsPromise, timeout]);
        submissions = data || [];
      } catch (err) {
        logger.error('[useStudentDashboardData] Timeout ou erro ao buscar submissões:', err.message);
      }

      const submissionsMap = new Map(submissions?.map((s) => [s.activity_id, s]) || []);

      // 4. Calcular estatísticas
      const now = new Date();

      const upcoming = publishedActivities.filter((act) => {
        if (!act.due_date) return false;
        const due = new Date(act.due_date);
        const hoursLeft = (due - now) / (1000 * 60 * 60);
        return hoursLeft > 0 && hoursLeft <= 48 && !submissionsMap.has(act.id);
      });

      const completed = submissions?.filter(
        (s) => s.status === 'submitted' || s.status === 'graded',
      ) || [];

      const graded = submissions?.filter((s) => s.grade !== null) || [];

      const avgGrade =
        graded.length > 0
          ? graded.reduce((sum, s) => sum + parseFloat(s.grade), 0) / graded.length
          : 0;

      const completionRate =
        publishedActivities.length > 0
          ? (completed.length / publishedActivities.length) * 100
          : 0;

      const pending = publishedActivities
        .filter((act) => !submissionsMap.has(act.id))
        .map((act) => ({
          ...act,
          dueDate: act.due_date,
          class_name: activityClassMap.get(act.id)?.className || 'Turma',
          classColor: activityClassMap.get(act.id)?.classColor,
        }));

      const recent = graded
        .sort(
          (a, b) =>
            new Date(b.graded_at || b.submitted_at) -
            new Date(a.graded_at || a.submitted_at),
        )
        .slice(0, 5);

      const recentDetailed = recent.map((submission) => {
        const meta = activityClassMap.get(submission.activity_id) || {};
        const gradeValue = submission.grade !== null ? Number(submission.grade) : null;

        return {
          ...submission,
          activity_title: meta.title || 'Atividade',
          class_name: meta.className || 'Turma',
          score: gradeValue,
          max_score: meta.maxScore || 100,
        };
      });

      const classStatsMap = new Map();
      graded.forEach((submission) => {
        const meta = activityClassMap.get(submission.activity_id);
        const gradeValue = submission.grade !== null ? Number(submission.grade) : null;
        if (!meta?.classId || gradeValue === null) {
          return;
        }

        const maxScore = meta.maxScore || 0;
        if (maxScore <= 0) {
          return;
        }

        const percent = (gradeValue / maxScore) * 100;
        const current = classStatsMap.get(meta.classId) || {
          classId: meta.classId,
          className: meta.className || 'Turma',
          classColor: meta.classColor || '#0EA5E9',
          total: 0,
          count: 0,
        };

        current.total += percent;
        current.count += 1;
        classStatsMap.set(meta.classId, current);
      });

      const classPerformanceData = Array.from(classStatsMap.values())
        .map((item) => ({
          classId: item.classId,
          className: item.className,
          classColor: item.classColor,
          average: Number((item.total / item.count).toFixed(1)),
        }))
        .sort((a, b) => b.average - a.average);

      // Criar alertas dinâmicos
      const alerts = [];

      if (upcoming.length > 0) {
        alerts.push({
          id: 1,
          type: 'warning',
          message: `${upcoming.length} atividade${
            upcoming.length > 1 ? 's' : ''
          } com prazo em 48h`,
          action: 'Ver',
        });
      }

      if (pending.length > 0) {
        alerts.push({
          id: 2,
          type: 'info',
          message: `${pending.length} atividade${
            pending.length > 1 ? 's' : ''
          } pendente${pending.length > 1 ? 's' : ''}`,
          action: 'Acessar',
        });
      }

      const recentFeedback = graded.filter((s) => {
        if (!s.graded_at) return false;
        const gradedDate = new Date(s.graded_at);
        const daysSince = (now - gradedDate) / (1000 * 60 * 60 * 24);
        return daysSince <= 7;
      });

      if (recentFeedback.length > 0) {
        alerts.push({
          id: 3,
          type: 'success',
          message: `${recentFeedback.length} feedback${
            recentFeedback.length > 1 ? 's' : ''
          } recebido${recentFeedback.length > 1 ? 's' : ''}`,
          action: 'Ler',
        });
      }

      const stats = {
        totalClasses: classes.length,
        activeActivities: pending.length,
        completedActivities: completed.length,
        upcomingDeadlines: upcoming.length,
        completionRate: Math.round(completionRate),
        avgGrade: parseFloat(avgGrade.toFixed(1)),
      };

      return {
        stats,
        myClasses: classes,
        pendingActivities: pending.slice(0, 5),
        recentGrades: recentDetailed,
        upcomingDeadlines: upcoming,
        classPerformance: classPerformanceData,
        alerts:
          alerts.length > 0
            ? alerts
            : [
                {
                  id: 1,
                  type: 'success',
                  message: 'Tudo em dia! Continue assim!',
                  action: '',
                },
              ],
      };
    } catch (error) {
      logger.error('[useStudentDashboardData] Erro ao carregar dashboard:', error);

      return {
        stats: {
          totalClasses: 0,
          activeActivities: 0,
          completedActivities: 0,
          upcomingDeadlines: 0,
          completionRate: 0,
          avgGrade: 0,
        },
        myClasses: [],
        pendingActivities: [],
        recentGrades: [],
        upcomingDeadlines: [],
        classPerformance: [],
        alerts: [
          {
            id: 1,
            type: 'error',
            message: 'Erro ao carregar seus dados. Tente recarregar a página.',
            action: '',
          },
        ],
      };
    }
  }, [user?.id]);

  return useRedisCache(
    `student:dashboard:data:${user?.id}`,
    fetchDashboardData,
    {
      ttl: 5 * 60, // 5 minutos
      enabled: !!user?.id,
      staleTime: 2 * 60 * 1000, // 2 minutos
    },
  );
};
