import { useCallback } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRedisCache } from '@/shared/hooks/useRedisCache';
import { logger } from '@/shared/utils/logger';
import { mapDatabaseTypeToFrontend } from '@/constants/activityTypes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useStudentPerformanceData = () => {
  const { user } = useAuth();

  const fetchPerformanceData = useCallback(async () => {
    if (!user?.id) return null;

    try {
      const { data: memberships, error: membershipsError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      if (membershipsError) throw membershipsError;

      const classIds = memberships?.map((m) => m.class_id) || [];

      let classes = [];
      const classesMap = {};
      if (classIds.length > 0) {
        const { data: classList, error: classesError } = await supabase
          .from('classes')
          .select('id, name, subject')
          .in('id', classIds);

        if (classesError) throw classesError;

        classes = classList || [];
        classes.forEach((c) => {
          classesMap[c.id] = c;
        });
      }

      let assignments = [];
      let activityIds = [];
      if (classIds.length > 0) {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('activity_class_assignments')
          .select('activity_id, class_id')
          .in('class_id', classIds);

        if (assignmentsError) throw assignmentsError;

        assignments = assignmentsData || [];
        const activityIdSet = new Set();
        assignments.forEach((a) => {
          if (a.activity_id) activityIdSet.add(a.activity_id);
        });
        activityIds = Array.from(activityIdSet);
      }

      let stats = {
        avgGrade: 0,
        totalActivities: 0,
        completedActivities: 0,
        ranking: null,
      };

      if (activityIds.length > 0) {
        const { data: statsSubmissions, error: statsSubsError } = await supabase
          .from('submissions')
          .select('activity_id, status, grade, submitted_at')
          .eq('student_id', user.id)
          .in('activity_id', activityIds);

        if (statsSubsError) throw statsSubsError;

        const completedActivities = statsSubmissions?.length || 0;
        const gradesData = (statsSubmissions || []).filter(
          (s) => s.grade !== null,
        );
        const avgGrade =
          gradesData.length > 0
            ?
              gradesData.reduce(
                (sum, s) => sum + parseFloat(s.grade),
                0,
              ) / gradesData.length
            : 0;

        stats = {
          avgGrade,
          totalActivities: activityIds.length,
          completedActivities,
          ranking: null,
        };
      }

      let recentGrades = [];
      {
        const { data: submissions, error: recentError } = await supabase
          .from('submissions')
          .select('id, grade, feedback, submitted_at, status, activity_id')
          .eq('student_id', user.id)
          .not('grade', 'is', null)
          .order('submitted_at', { ascending: false })
          .limit(10);

        if (recentError) throw recentError;

        const recentActivityIds =
          submissions?.map((s) => s.activity_id).filter(Boolean) || [];

        const activitiesMap = {};
        if (recentActivityIds.length > 0) {
          const { data: activities, error: activitiesError } = await supabase
            .from('activities')
            .select('id, title, max_score')
            .in('id', recentActivityIds);

          if (activitiesError) throw activitiesError;
          (activities || []).forEach((a) => {
            activitiesMap[a.id] = a;
          });
        }

        const assignmentsMap = {};
        const classIdMap = {};
        assignments.forEach((a) => {
          if (!recentActivityIds.includes(a.activity_id)) return;
          assignmentsMap[a.activity_id] = classesMap[a.class_id]?.name;
          classIdMap[a.activity_id] = a.class_id;
        });

        recentGrades = (submissions || []).map((s) => ({
          ...s,
          activity_title: activitiesMap[s.activity_id]?.title,
          max_score: activitiesMap[s.activity_id]?.max_score,
          class_name: assignmentsMap[s.activity_id],
          class_id: classIdMap[s.activity_id],
        }));
      }

      let classPerformance = [];
      if (classIds.length > 0 && activityIds.length > 0) {
        const { data: allSubmissions, error: perfSubsError } = await supabase
          .from('submissions')
          .select('id, grade, submitted_at, activity_id')
          .eq('student_id', user.id)
          .in('activity_id', activityIds)
          .not('grade', 'is', null)
          .order('submitted_at', { ascending: true });

        if (perfSubsError) throw perfSubsError;

        const { data: allActivities, error: allActsError } = await supabase
          .from('activities')
          .select('id, title, max_score')
          .in('id', activityIds);

        if (allActsError) throw allActsError;

        const activitiesMap = {};
        (allActivities || []).forEach((a) => {
          activitiesMap[a.id] = a;
        });

        const classActivitiesMap = {};
        assignments.forEach((a) => {
          if (!a.class_id || !a.activity_id) return;
          if (!classActivitiesMap[a.class_id]) {
            classActivitiesMap[a.class_id] = new Set();
          }
          classActivitiesMap[a.class_id].add(a.activity_id);
        });

        classPerformance = (classIds || [])
          .map((classId) => {
            const classInfo = classesMap[classId];
            const activitySet = classActivitiesMap[classId] || new Set();
            const submissionsForClass = (allSubmissions || []).filter((s) =>
              activitySet.has(s.activity_id),
            );
            const grades = submissionsForClass.map((s) =>
              parseFloat(s.grade),
            );
            const avgGrade =
              grades.length > 0
                ? grades.reduce((sum, g) => sum + g, 0) / grades.length
                : 0;

            const history = (submissionsForClass || []).map((s) => ({
              date: format(new Date(s.submitted_at), 'dd/MM', { locale: ptBR }),
              grade: parseFloat(s.grade),
            }));

            return {
              name: classInfo?.name || 'Turma',
              media: avgGrade,
              history,
            };
          })
          .sort((a, b) => b.media - a.media);
      }

      let radarData = [];
      {
        const { data: radarSubs, error: radarError } = await supabase
          .from('submissions')
          .select(`
            grade,
            submitted_at,
            activity_id,
            activity:activities(type, max_score)
          `)
          .eq('student_id', user.id)
          .not('grade', 'is', null);

        if (radarError) throw radarError;

        const radarActivityIds =
          radarSubs?.map((s) => s.activity_id).filter(Boolean) || [];

        const activityClassMap = {};
        if (radarActivityIds.length > 0) {
          const { data: radarAssignments, error: radarAssignError } =
            await supabase
              .from('activity_class_assignments')
              .select('activity_id, class_id')
              .in('activity_id', radarActivityIds);

          if (radarAssignError) throw radarAssignError;

          (radarAssignments || []).forEach((a) => {
            if (a.activity_id) activityClassMap[a.activity_id] = a.class_id;
          });
        }

        radarData = (radarSubs || []).map((s) => ({
          grade: parseFloat(s.grade),
          maxScore:
            s.activity?.max_score != null
              ? parseFloat(s.activity.max_score)
              : null,
          type: mapDatabaseTypeToFrontend(s.activity?.type),
          submitted_at: s.submitted_at,
          class_id: activityClassMap[s.activity_id],
        }));
      }

      return {
        stats,
        recentGrades,
        classPerformance,
        radarData,
        classes,
      };
    } catch (error) {
      logger.error('[useStudentPerformanceData] Erro geral:', error);
      throw error;
    }
  }, [user?.id]);

  const cacheKey = user?.id ? `student:performance-page:${user.id}` : null;

  return useRedisCache(cacheKey, fetchPerformanceData, {
    ttl: 10 * 60,
    enabled: !!cacheKey,
    staleTime: 2 * 60 * 1000,
  });
};
