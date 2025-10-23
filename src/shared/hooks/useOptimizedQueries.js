/**
 * Consultas otimizadas que eliminam problemas N+1
 * Utiliza índices compostos e estratégias de cache inteligente
 */

import { supabase } from '@/shared/services/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

// Hook para dashboard otimizado do professor
export const useOptimizedTeacherDashboard = (teacherId) => {
  return useQuery({
    queryKey: ['teacher-dashboard', teacherId],
    queryFn: async () => {
      // Consulta única otimizada que busca todas as métricas necessárias
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          student_count,
          is_active,
          activities:activities!inner(
            id,
            status,
            activity_type,
            updated_at
          ),
          class_members:class_members!inner(
            id,
            user_id,
            role,
            student_progress:student_progress(
              score,
              status,
              completed_at
            )
          )
        `)
        .eq('created_by', teacherId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Processar dados no frontend para calcular métricas
      return data.map(classData => {
        const activities = classData.activities || [];
        const students = classData.class_members?.filter(m => m.role === 'student') || [];

        // Calcular métricas da turma
        const activeActivities = activities.filter(a => a.status === 'active').length;
        const publishedActivities = activities.filter(a => a.status === 'published').length;
        const completedActivities = activities.filter(a => a.status === 'completed').length;

        // Calcular métricas dos alunos
        const totalSubmissions = students.reduce((acc, student) => {
          return acc + (student.student_progress?.length || 0);
        }, 0);

        const avgScore = students.length > 0
          ? students.reduce((acc, student) => {
              const studentScores = student.student_progress
                ?.filter(p => p.status === 'completed')
                ?.map(p => p.score) || [];
              const studentAvg = studentScores.length > 0
                ? studentScores.reduce((sum, score) => sum + score, 0) / studentScores.length
                : 0;
              return acc + studentAvg;
            }, 0) / students.length
          : 0;

        return {
          id: classData.id,
          name: classData.name,
          studentCount: classData.student_count,
          isActive: classData.is_active,
          metrics: {
            activeActivities,
            publishedActivities,
            completedActivities,
            totalSubmissions,
            avgScore: Math.round(avgScore * 100) / 100,
            lastActivity: activities.length > 0
              ? Math.max(...activities.map(a => new Date(a.updated_at)))
              : null,
          }
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,    // 10 minutos
  });
};

// Hook para atividades otimizadas de uma turma
export const useOptimizedClassActivities = (classId, options = {}) => {
  const { statusFilter = ['published', 'active'], limit = 20, offset = 0 } = options;

  return useQuery({
    queryKey: ['class-activities', classId, statusFilter, limit, offset],
    queryFn: async () => {
      // Consulta única com JOIN otimizado
      const { data, error, count } = await supabase
        .from('activities')
        .select(`
          id,
          title,
          description,
          activity_type,
          status,
          due_date,
          created_at,
          updated_at,
          max_score,
          teacher_id,
          profiles!activities_created_by_fkey(full_name),
          student_progress(
            id,
            student_id,
            score,
            status,
            completed_at,
            time_spent_minutes
          )
        `, { count: 'exact' })
        .eq('class_id', classId)
        .in('status', statusFilter)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Processar dados para incluir métricas calculadas
      return {
        activities: data.map(activity => ({
          ...activity,
          metrics: {
            submissionCount: activity.student_progress?.length || 0,
            avgScore: activity.student_progress?.length > 0
              ? activity.student_progress
                  .filter(p => p.status === 'completed')
                  .reduce((acc, p) => acc + (p.score || 0), 0) /
                activity.student_progress.filter(p => p.status === 'completed').length
              : 0,
            completionRate: activity.student_progress?.length > 0
              ? (activity.student_progress.filter(p => p.status === 'completed').length /
                 activity.student_progress.length) * 100
              : 0,
          }
        })),
        totalCount: count,
        hasMore: count > offset + limit,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos para atividades
    enabled: !!classId,
  });
};

// Hook para progresso do aluno otimizado
export const useOptimizedStudentProgress = (studentId, options = {}) => {
  const { classId, limit = 50 } = options;

  return useQuery({
    queryKey: ['student-progress', studentId, classId, limit],
    queryFn: async () => {
      let query = supabase
        .from('student_progress')
        .select(`
          id,
          score,
          status,
          completed_at,
          time_spent_minutes,
          feedback,
          activities!inner(
            id,
            title,
            activity_type,
            max_score,
            activity_class_assignments!inner(
              class_id,
              classes!inner(
                id,
                name,
                subject
              )
            )
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (classId) {
        query = query.eq('activities.activity_class_assignments.class_id', classId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calcular estatísticas gerais
      const stats = {
        totalActivities: data.length,
        avgScore: data.length > 0
          ? data.reduce((acc, progress) => acc + (progress.score || 0), 0) / data.length
          : 0,
        totalTimeSpent: data.reduce((acc, progress) => acc + (progress.time_spent_minutes || 0), 0),
        completionRate: 100, // Já filtrado por completed
        gradeDistribution: {
          A: data.filter(p => p.score >= 90).length,
          B: data.filter(p => p.score >= 80 && p.score < 90).length,
          C: data.filter(p => p.score >= 70 && p.score < 80).length,
          D: data.filter(p => p.score >= 60 && p.score < 70).length,
          F: data.filter(p => p.score < 60).length,
        }
      };

      return {
        progress: data,
        stats,
        byClass: data.reduce((acc, progress) => {
          const classId = progress.activities.classes.id;
          if (!acc[classId]) {
            acc[classId] = {
              className: progress.activities.classes.name,
              activities: [],
              avgScore: 0,
            };
          }
          acc[classId].activities.push(progress);
          return acc;
        }, {}),
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutos para progresso
    enabled: !!studentId,
  });
};

// Hook para notificações otimizadas
export const useOptimizedNotifications = (userId, options = {}) => {
  const { limit = 20, unreadOnly = false } = options;

  return useQuery({
    queryKey: ['notifications', userId, unreadOnly, limit],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select(`
          id,
          title,
          message,
          notification_type,
          priority,
          is_read,
          created_at,
          action_url,
          metadata,
          sender:sender_id(id, name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        notifications: data,
        unreadCount: data.filter(n => !n.is_read).length,
        byType: data.reduce((acc, notification) => {
          acc[notification.notification_type] = (acc[notification.notification_type] || 0) + 1;
          return acc;
        }, {}),
        byPriority: data.reduce((acc, notification) => {
          acc[notification.priority] = (acc[notification.priority] || 0) + 1;
          return acc;
        }, {}),
      };
    },
    staleTime: 1 * 60 * 1000, // 1 minuto para notificações
    refetchInterval: 30 * 1000, // Refetch a cada 30 segundos
  });
};

// Hook para lista de alunos otimizada com dados de perfil
export const useOptimizedClassStudents = (classId) => {
  return useQuery({
    queryKey: ['class-students', classId],
    queryFn: async () => {
      // Consulta única com JOIN otimizado usando índice composto
      const { data, error } = await supabase
        .from('class_members')
        .select(`
          id,
          status,
          joined_at,
          last_activity_at,
          current_grade,
          student_id,
          profiles!class_members_student_id_fkey(
            id,
            name,
            email,
            avatar_url,
            phone,
            enrollment_date
          )
        `)
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });

      if (error) throw error;

      // Processar dados para métricas calculadas
      const students = data.map(student => ({
        ...student,
        profile: student.profiles,
        // Remover dados duplicados após processamento
        profiles: undefined,
      }));

      // Calcular estatísticas da turma
      const stats = {
        totalStudents: students.length,
        avgGrade: students.length > 0
          ? students.reduce((acc, student) => acc + (parseFloat(student.current_grade) || 0), 0) / students.length
          : 0,
        activeToday: students.filter(s => {
          if (!s.last_activity_at) return false;
          const lastActivity = new Date(s.last_activity_at);
          const today = new Date();
          return lastActivity.toDateString() === today.toDateString();
        }).length,
        newThisWeek: students.filter(s => {
          if (!s.joined_at) return false;
          const joinedDate = new Date(s.joined_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return joinedDate > weekAgo;
        }).length,
      };

      return {
        students,
        stats,
        // Dados adicionais podem ser derivados sem consultas extras
        gradeDistribution: students.reduce((acc, student) => {
          const grade = student.current_grade;
          if (grade >= 9) acc.A++;
          else if (grade >= 8) acc.B++;
          else if (grade >= 7) acc.C++;
          else if (grade >= 6) acc.D++;
          else acc.F++;
          return acc;
        }, { A: 0, B: 0, C: 0, D: 0, F: 0 }),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos para lista de alunos
    enabled: !!classId,
  });
};

// Hook para métricas gerais otimizadas
export const useOptimizedMetrics = (teacherId, dateRange = {}) => {
  const { startDate, endDate } = dateRange;

  return useQuery({
    queryKey: ['teacher-metrics', teacherId, startDate, endDate],
    queryFn: async () => {
      // Consulta composta que busca todas as métricas necessárias
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          student_count,
          created_at,
          activities(
            id,
            status,
            activity_type,
            created_at,
            student_progress(
              id,
              score,
              completed_at,
              time_spent_minutes
            )
          ),
          class_members(
            id,
            user_id,
            role,
            created_at
          )
        `)
        .eq('created_by', teacherId)
        .eq('is_active', true);

      if (error) throw error;

      // Processar métricas agregadas
      const metrics = {
        totalClasses: data.length,
        totalStudents: data.reduce((acc, cls) => acc + cls.student_count, 0),
        totalActivities: data.reduce((acc, cls) => acc + (cls.activities?.length || 0), 0),
        completedActivities: data.reduce((acc, cls) =>
          acc + (cls.activities?.filter(a => a.status === 'completed').length || 0), 0
        ),
        avgScore: 0,
        totalTimeSpent: 0,
        engagementRate: 0,
      };

      // Calcular médias e taxas
      let totalScores = 0;
      let scoreCount = 0;
      let totalTime = 0;
      let activeStudents = 0;

      data.forEach(cls => {
        // Calcular scores médios
        cls.activities?.forEach(activity => {
          activity.student_progress?.forEach(progress => {
            if (progress.score) {
              totalScores += progress.score;
              scoreCount++;
            }
            if (progress.time_spent_minutes) {
              totalTime += progress.time_spent_minutes;
            }
          });
        });

        // Contar alunos ativos hoje
        cls.class_members?.filter(m => m.role === 'student').forEach(student => {
          if (student.last_activity_at) {
            const lastActivity = new Date(student.last_activity_at);
            const today = new Date();
            if (lastActivity.toDateString() === today.toDateString()) {
              activeStudents++;
            }
          }
        });
      });

      metrics.avgScore = scoreCount > 0 ? totalScores / scoreCount : 0;
      metrics.totalTimeSpent = totalTime;
      metrics.engagementRate = metrics.totalStudents > 0
        ? (activeStudents / metrics.totalStudents) * 100
        : 0;

      return {
        overview: metrics,
        byClass: data.map(cls => ({
          id: cls.id,
          name: cls.name,
          students: cls.student_count,
          activities: cls.activities?.length || 0,
          completedActivities: cls.activities?.filter(a => a.status === 'completed').length || 0,
          avgScore: cls.activities?.length > 0
            ? cls.activities.reduce((acc, activity) => {
                const scores = activity.student_progress?.map(p => p.score).filter(Boolean) || [];
                return acc + (scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
              }, 0) / cls.activities.length
            : 0,
        })),
        trends: {
          // Dados para gráficos de tendência (últimos 30 dias)
          dailyActivity: generateDailyTrends(data, 30),
          scoreTrends: generateScoreTrends(data, 30),
        }
      };
    },
    staleTime: 15 * 60 * 1000, // 15 minutos para métricas
    enabled: !!teacherId,
  });
};

// Funções auxiliares para processamento de dados
const generateDailyTrends = (classData, days) => {
  const trends = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const dayActivities = classData.reduce((acc, cls) => {
      return acc + (cls.activities?.filter(a => {
        const activityDate = new Date(a.created_at);
        return activityDate.toDateString() === date.toDateString();
      }).length || 0);
    }, 0);

    trends.push({
      date: date.toISOString().split('T')[0],
      activities: dayActivities,
    });
  }

  return trends;
};

const generateScoreTrends = (classData, days) => {
  const trends = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    let totalScores = 0;
    let scoreCount = 0;

    classData.forEach(cls => {
      cls.activities?.forEach(activity => {
        activity.student_progress?.forEach(progress => {
          if (progress.completed_at) {
            const completedDate = new Date(progress.completed_at);
            if (completedDate.toDateString() === date.toDateString() && progress.score) {
              totalScores += progress.score;
              scoreCount++;
            }
          }
        });
      });
    });

    trends.push({
      date: date.toISOString().split('T')[0],
      avgScore: scoreCount > 0 ? totalScores / scoreCount : 0,
      submissions: scoreCount,
    });
  }

  return trends;
};

// Hook para busca otimizada com paginação inteligente
export const useOptimizedSearch = (searchQuery, options = {}) => {
  const {
    type = 'activities', // 'activities' | 'classes' | 'students'
    filters = {},
    pageSize = 20,
  } = options;

  return useQuery({
    queryKey: ['search', type, searchQuery, filters, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const offset = pageParam * pageSize;

      let query = supabase
        .from(type === 'activities' ? 'activities' : type === 'classes' ? 'classes' : 'profiles')
        .select('*')
        .range(offset, offset + pageSize - 1);

      // Aplicar filtros de busca
      if (searchQuery) {
        if (type === 'activities') {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        } else if (type === 'classes') {
          query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        } else {
          query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
        }
      }

      // Aplicar filtros adicionais
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data, error, count } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return {
        results: data,
        totalCount: count,
        hasNextPage: count > offset + pageSize,
        nextOffset: offset + pageSize,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos para resultados de busca
    keepPreviousData: true, // Manter dados anteriores durante carregamento
  });
};

// Hook para dados em tempo real otimizado
export const useOptimizedRealtime = (table, filters = {}) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['realtime', table, filters],
    queryFn: async () => {
      let query = supabase
        .from(table)
        .select('*');

      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query;
      if (error) throw error;

      return data;
    },
    staleTime: 30 * 1000, // 30 segundos para dados em tempo real
    refetchInterval: 60 * 1000, // Refetch a cada minuto
    onSuccess: () => {
      // Pré-carregar dados relacionados quando houver mudanças
      if (table === 'activities') {
        // Pré-carregar progresso relacionado
        queryClient.prefetchQuery({
          queryKey: ['activities-progress', filters.class_id],
          queryFn: () => fetchActivitiesProgress(filters.class_id),
        });
      }
    },
  });
};

// Função auxiliar para buscar progresso de atividades
const fetchActivitiesProgress = async (classId) => {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      id,
      title,
      student_progress(count)
    `)
    .eq('class_id', classId);

  if (error) throw error;
  return data;
};

// Hook para cache inteligente baseado em padrões de uso
export const useSmartCache = () => {
  const queryClient = useQueryClient();

  // Pré-carregar dados críticos baseado no comportamento do usuário
  const preloadCriticalData = useCallback((userId) => {
    // Dados do usuário
    queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => supabase.from('profiles').select('*').eq('id', userId).single(),
      staleTime: 60 * 60 * 1000, // 1 hora
    });

    // Classes do usuário
    queryClient.prefetchQuery({
      queryKey: ['user-classes', userId],
      queryFn: () => {
        // Buscar classes baseado no papel do usuário
        return supabase
          .from('class_members')
          .select('class_id, classes(*)')
          .eq('student_id', userId)
          .eq('status', 'active');
      },
      staleTime: 15 * 60 * 1000, // 15 minutos
    });
  }, [queryClient]);

  // Otimizar cache baseado no uso de memória
  const optimizeMemoryUsage = useCallback(() => {
    const queries = queryClient.getQueryCache().getAll();

    // Remover consultas antigas não utilizadas
    queries.forEach(query => {
      const lastAccessed = query.state.dataUpdatedAt;
      const now = Date.now();
      const age = now - lastAccessed;

      // Remover consultas com mais de 30 minutos sem acesso
      if (age > 30 * 60 * 1000 && !query.getObserversCount()) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  }, [queryClient]);

  return {
    preloadCriticalData,
    optimizeMemoryUsage,
  };
};

export {
  useOptimizedTeacherDashboard,
  useOptimizedClassActivities,
  useOptimizedStudentProgress,
  useOptimizedNotifications,
  useOptimizedClassStudents,
  useOptimizedMetrics,
  useOptimizedSearch,
  useOptimizedRealtime,
  useSmartCache,
};
