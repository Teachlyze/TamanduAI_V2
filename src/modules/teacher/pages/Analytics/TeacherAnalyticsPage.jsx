import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, ClipboardList, Clock, AlertCircle, TrendingUp, CheckCircle,
  Calendar, Filter, Download, Share2, Bell, BookOpen, Shield, Activity,
  BarChart3, PieChart, LineChart, Target, Award, Zap, TrendingDown
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Progress } from '@/shared/components/ui/progress';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader, StatsCard, gradients } from '@/shared/design';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import {
  LineChart as RechartsLine, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, Area, AreaChart, ScatterChart, Scatter
} from 'recharts';
import { supabase } from '@/shared/services/supabaseClient';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportTeacherAnalyticsDashboardToPDF } from '@/shared/services/exportService';
import { showErrorToast } from '@/shared/utils/toastUtils';

const TeacherAnalyticsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [period, setPeriod] = useState('30'); // dias
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [comparisonClassIds, setComparisonClassIds] = useState([]);
  const [activityTypes, setActivityTypes] = useState(['all']);
  const [statusFilter, setStatusFilter] = useState(['graded']);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [useEdgeFunction, setUseEdgeFunction] = useState(true); // Toggle para usar edge function

  // Dados
  const [classes, setClasses] = useState([]);
  const [kpis, setKpis] = useState({
    totalStudents: 0,
    totalActivities: 0,
    pendingCorrections: 0,
    avgGrade: 0,
    onTimeRate: 0,
    openActivities: 0
  });
  const [gradeEvolution, setGradeEvolution] = useState([]);
  const [classComparison, setClassComparison] = useState([]);
  const [classComparisonInfo, setClassComparisonInfo] = useState(null);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [weeklyTrends, setWeeklyTrends] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [bottomStudents, setBottomStudents] = useState([]);
  const [plagiarismStats, setPlagiarismStats] = useState(null);
  const [engagementStats, setEngagementStats] = useState(null);

  useEffect(() => {
    loadAllData();
  }, [user, period, selectedClasses, activityTypes, statusFilter]);

  // Recarrega apenas a comparação entre turmas quando o filtro próprio muda
  useEffect(() => {
    if (!user?.id) return;
    if (initialLoad) return;
    loadClassComparison();
  }, [comparisonClassIds]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadAllData, 5 * 60 * 1000); // 5 minutos
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadAllData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Primeiro carregar turmas e obter a lista completa para uso global
      const classesData = await loadClasses();
      const allClassIds = (classesData && classesData.length ? classesData : classes).map(c => c.id);

      if (useEdgeFunction) {
        // Usar Edge Function com cache Redis APENAS para dados globais (ex: top alunos)
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-teacher-analytics`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              // Aqui sempre enviamos TODAS as turmas para que topStudents seja global
              body: JSON.stringify({ 
                period,
                selectedClasses: allClassIds
              })
            }
          );

          if (response.ok) {
            const result = await response.json();
            const data = result.data || {};

            // Atualizar top students como dado global
            setTopStudents(Array.isArray(data.topStudents) ? data.topStudents : []);

            if (result.cached) {
              toast({ 
                title: '⚡ Cache', 
                description: 'Top alunos carregados do cache (5min)',
                duration: 2000
              });
            }
          } else {
            logger.error('Erro ao carregar analytics (edge):', response.status);
          }
        } catch (edgeError) {
          logger.error('Erro na Edge Function de analytics:', edgeError);
        }

        // Sempre calcular KPIs e gráficos com base nos filtros atuais de turma/período
        await Promise.all([
          loadKPIs(),
          loadGradeEvolution(),
          loadClassComparison(),
          loadGradeDistribution(),
          loadWeeklyTrends(),
          loadPlagiarismStats(),
          loadEngagementStats()
        ]);
      } else {
        // Fallback: tudo calculado direto no Supabase, inclusive top alunos (respeitando filtros)
        await Promise.all([
          loadKPIs(),
          loadGradeEvolution(),
          loadClassComparison(),
          loadGradeDistribution(),
          loadWeeklyTrends(),
          loadTopStudents(),
          loadPlagiarismStats(),
          loadEngagementStats()
        ]);
      }
    } catch (error) {
      showErrorToast(
        toast,
        'Não foi possível carregar os dados de analytics.',
        error,
        { logPrefix: '[TeacherAnalyticsPage] Erro ao carregar analytics' }
      );
    } finally {
      setLoading(false);
      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  };

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, subject, color')
        .eq('created_by', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      
      const classesData = data || [];
      setClasses(classesData);
      
      // Inicializar selectedClasses com todas as turmas após carregar
      if (selectedClasses.length === 0 && classesData.length > 0) {
        setSelectedClasses(classesData.map(c => c.id));
      }

      return classesData;
    } catch (error) {
      logger.error('Erro ao carregar turmas:', error);
      setClasses([]);
      return [];
    }
  };

  const loadKPIs = async () => {
    if (selectedClasses.length === 0) {
      setKpis({
        totalStudents: 0,
        totalActivities: 0,
        pendingCorrections: 0,
        avgGrade: 0,
        onTimeRate: 0,
        openActivities: 0
      });
      return;
    }

    const dateFilter = period === 'all' ? null : format(subDays(new Date(), parseInt(period)), 'yyyy-MM-dd');

    // Total de alunos únicos
    const { data: membersData } = await supabase
      .from('class_members')
      .select('user_id')
      .in('class_id', selectedClasses)
      .eq('role', 'student');

    const uniqueStudents = new Set(membersData?.map(m => m.user_id) || []).size;

    // Atividades postadas no período
    let activitiesQuery = supabase
      .from('activity_class_assignments')
      .select('activity_id, activities!inner(id, created_at, status)')
      .in('class_id', selectedClasses);

    if (dateFilter) {
      activitiesQuery = activitiesQuery.gte('activities.created_at', dateFilter);
    }

    const { data: activitiesData } = await activitiesQuery;
    const totalActivities = new Set(activitiesData?.map(a => a.activity_id) || []).size;

    // Correções pendentes
    const { data: pendingData } = await supabase
      .from('submissions')
      .select('id, activity_id, activities!inner(id, activity_class_assignments!inner(class_id))')
      .eq('status', 'submitted')
      .in('activities.activity_class_assignments.class_id', selectedClasses);

    const pendingCorrections = pendingData?.length || 0;

    // Média geral de notas
    let gradesQuery = supabase
      .from('submissions')
      .select('grade, activity_id, activities!inner(id, activity_class_assignments!inner(class_id))')
      .not('grade', 'is', null)
      .in('activities.activity_class_assignments.class_id', selectedClasses);

    if (dateFilter) {
      gradesQuery = gradesQuery.gte('graded_at', dateFilter);
    }

    const { data: gradesData } = await gradesQuery;
    const avgGrade = gradesData?.length > 0
      ? (gradesData.reduce((sum, s) => sum + (s.grade || 0), 0) / gradesData.length).toFixed(1)
      : 0;

    // Taxa de entrega no prazo (considera envios entregues ou corrigidos, respeitando o período)
    let onTimeQuery = supabase
      .from('submissions')
      .select('submitted_at, activity_id, activities!inner(due_date, activity_class_assignments!inner(class_id))')
      .in('status', ['submitted', 'graded'])
      .in('activities.activity_class_assignments.class_id', selectedClasses)
      .not('submitted_at', 'is', null)
      .not('activities.due_date', 'is', null);

    if (dateFilter) {
      onTimeQuery = onTimeQuery.gte('submitted_at', dateFilter);
    }

    const { data: onTimeData } = await onTimeQuery;

    const onTime = onTimeData?.filter(s => 
      new Date(s.submitted_at) <= new Date(s.activities.due_date)
    ).length || 0;
    const onTimeRate = onTimeData?.length > 0
      ? Math.round((onTime / onTimeData.length) * 100)
      : 0;

    // Atividades em aberto
    const { data: openData } = await supabase
      .from('activity_class_assignments')
      .select('activity_id, activities!inner(status, due_date)')
      .in('class_id', selectedClasses)
      .eq('activities.status', 'active')
      .gte('activities.due_date', new Date().toISOString());

    const openActivities = openData?.length || 0;

    setKpis({
      totalStudents: uniqueStudents,
      totalActivities,
      pendingCorrections,
      avgGrade: parseFloat(avgGrade),
      onTimeRate,
      openActivities
    });
  };

  const loadGradeEvolution = async () => {
    // Se nenhuma turma estiver selecionada, não há dados para mostrar
    if (selectedClasses.length === 0) {
      setGradeEvolution([]);
      return;
    }

    // Período em dias ("all" = últimos 90 dias por padrão)
    const days = period === 'all' ? 90 : Number.parseInt(period, 10) || 30;
    const startDate = subDays(new Date(), days);

    // UMA query ao invés de dezenas, com limite para evitar datasets gigantes
    const { data: grades, error } = await supabase
      .from('submissions')
      .select('grade, graded_at, activity_id, activities!inner(activity_class_assignments!inner(class_id))')
      .not('grade', 'is', null)
      .in('activities.activity_class_assignments.class_id', selectedClasses)
      .gte('graded_at', startDate.toISOString())
      .order('graded_at', { ascending: true })
      .limit(1000);

    if (error) {
      logger.error('Erro ao carregar evolução de notas:', error);
      setGradeEvolution([]);
      return;
    }

    // Agrupar por data no frontend, ignorando registros inválidos
    const groupedByDate = {};
    (grades || []).forEach(g => {
      if (!g || g.grade == null || !g.graded_at) return;

      const numericGrade = parseFloat(g.grade);
      if (Number.isNaN(numericGrade)) return;

      const gradedAt = new Date(g.graded_at);
      if (Number.isNaN(gradedAt.getTime())) return;

      const dateKey = format(gradedAt, 'dd/MM');

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(numericGrade);
    });

    const data = Object.entries(groupedByDate).map(([date, gradesList]) => {
      const avg = gradesList.length > 0
        ? gradesList.reduce((sum, g) => sum + g, 0) / gradesList.length
        : 0;

      return {
        date,
        media: parseFloat(avg.toFixed(2)),
        submissoes: gradesList.length
      };
    });

    // Mantém o gráfico enxuto mostrando apenas os últimos 30 pontos
    setGradeEvolution(data.slice(-30));
  };

  const loadClassComparison = async () => {
    // Se não há turmas suficientes cadastradas, não há o que comparar
    if (!classes || classes.length < 2) {
      setClassComparison([]);
      setClassComparisonInfo({ type: 'not_enough_total' });
      return;
    }

    const manualIds = (comparisonClassIds || []).filter(Boolean);
    const uniqueIds = Array.from(new Set(manualIds));

    if (uniqueIds.length === 0 || uniqueIds.length === 1) {
      setClassComparison([]);
      setClassComparisonInfo({ type: 'need_two' });
      return;
    }

    try {
      // Buscar submissões com eager loading apenas das turmas escolhidas
      const { data: allData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          grade,
          activity_id,
          activities!inner(
            activity_class_assignments!inner(class_id)
          )
        `)
        .not('grade', 'is', null)
        .in('activities.activity_class_assignments.class_id', uniqueIds)
        .limit(2000);

      if (submissionsError) {
        throw submissionsError;
      }

      // Buscar contagens de alunos por turma
      const { data: membersData, error: membersError } = await supabase
        .from('class_members')
        .select('class_id, user_id')
        .in('class_id', uniqueIds)
        .eq('role', 'student');

      if (membersError) {
        throw membersError;
      }

      // Buscar contagens de atividades por turma
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activity_class_assignments')
        .select('class_id, activity_id')
        .in('class_id', uniqueIds);

      if (activitiesError) {
        throw activitiesError;
      }

      // Processar dados
      const comparison = [];

      // Criar mapa de contagens
      const studentCountMap = {};
      const activityCountMap = {};

      (membersData || []).forEach(m => {
        if (!m.class_id) return;
        studentCountMap[m.class_id] = (studentCountMap[m.class_id] || 0) + 1;
      });

      (activitiesData || []).forEach(a => {
        if (!a.class_id) return;
        activityCountMap[a.class_id] = (activityCountMap[a.class_id] || 0) + 1;
      });

      const classesById = classes.reduce((acc, cls) => {
        acc[cls.id] = cls;
        return acc;
      }, {});

      uniqueIds.forEach(classId => {
        const classItem = classesById[classId];
        if (!classItem) return;

        // Filtrar grades desta turma
        const grades = (allData || []).filter(g =>
          g.activities?.activity_class_assignments?.some(aca => aca.class_id === classId)
        );

        if (grades.length === 0) return;

        const avgGrade = grades.reduce((sum, s) => sum + (s.grade || 0), 0) / grades.length;

        comparison.push({
          name: classItem.name,
          media: parseFloat(avgGrade.toFixed(2)),
          alunos: studentCountMap[classId] || 0,
          atividades: activityCountMap[classId] || 0,
          color: classItem.color || '#3B82F6'
        });
      });

      if (comparison.length === 0) {
        setClassComparison([]);
        setClassComparisonInfo({ type: 'no_grades' });
      } else {
        setClassComparison(comparison.sort((a, b) => b.media - a.media));
        setClassComparisonInfo(null);
      }
    } catch (error) {
      logger.error('Erro ao carregar comparação entre turmas:', error);
      setClassComparison([]);
      setClassComparisonInfo({ type: 'error' });
    }
  };

  const loadGradeDistribution = async () => {
    if (selectedClasses.length === 0) {
      setGradeDistribution([]);
      return;
    }

    const { data: grades, error } = await supabase
      .from('submissions')
      .select('grade, activity_id, activities!inner(max_score, activity_class_assignments!inner(class_id))')
      .not('grade', 'is', null)
      .in('activities.activity_class_assignments.class_id', selectedClasses)
      .limit(1000);

    if (error) {
      logger.error('Erro ao carregar distribuição de notas:', error);
      setGradeDistribution([]);
      return;
    }

    const distribution = [
      { range: '0-2', count: 0, color: '#EF4444' },
      { range: '2-4', count: 0, color: '#F97316' },
      { range: '4-6', count: 0, color: '#F59E0B' },
      { range: '6-8', count: 0, color: '#3B82F6' },
      { range: '8-10', count: 0, color: '#10B981' }
    ];

    grades?.forEach(({ grade, activities }) => {
      const rawGrade = parseFloat(grade);
      const maxScore = parseFloat(activities?.max_score || 10);

      if (isNaN(rawGrade)) return;

      let normalized = rawGrade;
      if (maxScore > 0 && maxScore !== 10) {
        normalized = (rawGrade / maxScore) * 10;
      }

      // Garantir que está sempre entre 0 e 10
      normalized = Math.max(0, Math.min(10, normalized));

      if (normalized < 2) distribution[0].count++;
      else if (normalized < 4) distribution[1].count++;
      else if (normalized < 6) distribution[2].count++;
      else if (normalized < 8) distribution[3].count++;
      else distribution[4].count++;
    });

    setGradeDistribution(distribution);
  };

  const loadWeeklyTrends = async () => {
    if (selectedClasses.length === 0) {
      setWeeklyTrends([]);
      return;
    }

    // UMA query para todas as semanas
    const startDate = format(subDays(new Date(), 84), 'yyyy-MM-dd'); // 12 semanas atrás

    const { data: allSubmissions, error } = await supabase
      .from('submissions')
      .select('submitted_at, status, activity_id, activities!inner(due_date, activity_class_assignments!inner(class_id))')
      .in('status', ['submitted', 'graded'])
      .in('activities.activity_class_assignments.class_id', selectedClasses)
      .gte('submitted_at', startDate)
      .limit(1000);

    if (error) {
      logger.error('Erro ao carregar tendência semanal de entregas:', error);
      setWeeklyTrends([]);
      return;
    }

    const weeks = [];
    for (let i = 0; i < 12; i++) {
      const weekStart = subDays(new Date(), (12 - i) * 7);
      const weekEnd = subDays(new Date(), (11 - i) * 7);

      const weekSubmissions = allSubmissions?.filter(s => {
        const subDate = new Date(s.submitted_at);
        return subDate >= weekStart && subDate <= weekEnd;
      }) || [];

      const onTime = weekSubmissions.filter(s => 
        s.activities?.due_date && new Date(s.submitted_at) <= new Date(s.activities.due_date)
      ).length;

      const late = weekSubmissions.filter(s => 
        s.activities?.due_date && new Date(s.submitted_at) > new Date(s.activities.due_date)
      ).length;

      weeks.push({
        week: `S${12 - i}`,
        noPrazo: onTime,
        atrasadas: late,
        total: weekSubmissions.length
      });
    }

    setWeeklyTrends(weeks);
  };

  const loadTopStudents = async () => {
    if (selectedClasses.length === 0) {
      setTopStudents([]);
      setBottomStudents([]);
      return;
    }

    // LIMITAR a query com .limit()
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`
        grade,
        status,
        submitted_at,
        student_id,
        student:profiles!submissions_student_id_fkey(id, full_name, avatar_url),
        activity_id,
        activities!inner(max_score, due_date, activity_class_assignments!inner(class_id))
      `)
      .not('grade', 'is', null)
      .in('activities.activity_class_assignments.class_id', selectedClasses)
      .limit(500); // IMPORTANTE: limitar!

    if (error) {
      logger.error('Erro ao carregar top/bottom students:', error);
      setTopStudents([]);
      setBottomStudents([]);
      return;
    }

    const classesMap = classes.reduce((acc, cls) => {
      acc[cls.id] = cls;
      return acc;
    }, {});

    const studentGrades = {};
    submissions?.forEach(s => {
      if (!studentGrades[s.student_id]) {
        studentGrades[s.student_id] = {
          student: s.student,
          grades: [],
          total: 0,
          onTime: 0,
          classes: new Set()
        };
      }

      const container = studentGrades[s.student_id];

      const gradeValue = parseFloat(s.grade) || 0;
      container.grades.push(gradeValue);
      container.total++;

      const submittedAt = s.submitted_at ? new Date(s.submitted_at) : null;
      const dueDate = s.activities?.due_date ? new Date(s.activities.due_date) : null;
      if (submittedAt && dueDate && submittedAt <= dueDate) {
        container.onTime++;
      }

      const assignments = s.activities?.activity_class_assignments || [];
      assignments.forEach(aca => {
        const cls = classesMap[aca.class_id];
        if (cls) {
          container.classes.add(cls.name);
        }
      });
    });

    const rankedAll = Object.entries(studentGrades)
      .map(([id, data]) => {
        const avgGrade = data.grades.length > 0
          ? data.grades.reduce((sum, g) => sum + g, 0) / data.grades.length
          : 0;

        const onTimeRate = data.total > 0
          ? Math.round((data.onTime / data.total) * 100)
          : 0;

        return {
          id,
          name: data.student?.full_name || 'Sem nome',
          avatar: data.student?.avatar_url,
          avgGrade,
          activities: data.total,
          onTimeRate,
          classes: Array.from(data.classes).slice(0, 3)
        };
      })
      .sort((a, b) => b.avgGrade - a.avgGrade);

    const top = rankedAll.slice(0, 10);

    const bottom = rankedAll
      .filter(s => s.activities >= 3)
      .slice(-10)
      .sort((a, b) => a.avgGrade - b.avgGrade);

    setTopStudents(top);
    setBottomStudents(bottom);
  };

  const loadPlagiarismStats = async () => {
    if (selectedClasses.length === 0) {
      setPlagiarismStats(null);
      return;
    }

    // Mesmo conceito de período usado em outros gráficos
    const days = period === 'all' ? 90 : Number.parseInt(period, 10) || 30;
    const startDate = subDays(new Date(), days);

    try {
      // 1) Tentar usar a tabela nova plagiarism_checks_v2
      const { data: v2Checks, error: v2Error } = await supabase
        .from('plagiarism_checks_v2')
        .select(`
          similarity_percentage,
          plagiarism_severity,
          checked_at,
          activity_id,
          submission_id,
          activities!inner(activity_class_assignments!inner(class_id))
        `)
        .in('activities.activity_class_assignments.class_id', selectedClasses)
        .gte('checked_at', startDate.toISOString())
        .limit(1000);

      if (v2Error) {
        logger.error('Erro ao carregar estatísticas de plágio (v2):', v2Error);
      }

      const validV2 = (v2Checks || []).filter(c => c.similarity_percentage != null);

      if (validV2.length > 0) {
        const avgOriginalityV2 = validV2.reduce((sum, c) => {
          const sim = Number.parseFloat(c.similarity_percentage);
          const similarity = Number.isNaN(sim) ? 0 : sim;
          return sum + (100 - similarity);
        }, 0) / validV2.length;

        // Considera severidades altas/críticas como "casos críticos"
        const criticalSeverities = ['high', 'critical'];
        const casesDetectedV2 = validV2.filter(c =>
          criticalSeverities.includes((c.plagiarism_severity || '').toLowerCase())
        ).length;

        setPlagiarismStats({
          avgOriginality: Math.round(avgOriginalityV2),
          totalChecks: validV2.length,
          casesDetected: casesDetectedV2,
          // A tabela v2 não possui flag explícita de IA, então mantemos 0 aqui
          aiDetected: 0
        });
        return;
      }

      // 2) Fallback para tabela legacy plagiarism_checks se não houver dados em v2
      const { data: legacyChecks, error: legacyError } = await supabase
        .from('plagiarism_checks')
        .select(`
          plagiarism_percentage,
          ai_generated,
          submission_id,
          submissions!inner(activity_id, activities!inner(activity_class_assignments!inner(class_id)))
        `)
        .in('submissions.activities.activity_class_assignments.class_id', selectedClasses)
        .gte('checked_at', startDate.toISOString())
        .limit(1000);

      if (legacyError) {
        logger.error('Erro ao carregar estatísticas de plágio (legacy):', legacyError);
        setPlagiarismStats(null);
        return;
      }

      const validLegacy = (legacyChecks || []).filter(c => c.plagiarism_percentage != null);

      if (validLegacy.length === 0) {
        setPlagiarismStats(null);
        return;
      }

      const avgOriginalityLegacy = validLegacy.reduce((sum, c) => {
        const pct = c.plagiarism_percentage || 0;
        return sum + (100 - pct);
      }, 0) / validLegacy.length;

      const casesDetectedLegacy = validLegacy.filter(c => {
        const pct = c.plagiarism_percentage || 0;
        const originality = 100 - pct;
        return originality < 70;
      }).length;

      setPlagiarismStats({
        avgOriginality: Math.round(avgOriginalityLegacy),
        totalChecks: validLegacy.length,
        casesDetected: casesDetectedLegacy,
        aiDetected: validLegacy.filter(c => c.ai_generated).length
      });
    } catch (error) {
      logger.error('Erro ao carregar estatísticas de plágio:', error);
      setPlagiarismStats(null);
    }
  };

  const loadEngagementStats = async () => {
    // Placeholder - requires activity tracking implementation
    setEngagementStats({
      uniqueAccess: 0,
      avgSessionTime: 0,
      returnRate: 0,
      interactions: 0
    });
  };

  const handleExportDashboardCSV = async () => {
    try {
      // Criar conteúdo CSV
      const csvRows = [];
      
      // Cabeçalho
      csvRows.push('TamanduAI - Analytics Dashboard');
      csvRows.push(`Período: Últimos ${period} dias`);
      csvRows.push(`Data de Exportação: ${new Date().toLocaleString('pt-BR')}`);
      csvRows.push('');
      
      // KPIs
      csvRows.push('KPIs Principais');
      csvRows.push('Indicador,Valor');
      csvRows.push(`Total de Alunos,${kpis.totalStudents}`);
      csvRows.push(`Total de Atividades,${kpis.totalActivities}`);
      csvRows.push(`Correções Pendentes,${kpis.pendingCorrections}`);
      csvRows.push(`Média Geral,${kpis.avgGrade.toFixed(2)}`);
      csvRows.push(`Taxa de Entrega no Prazo,${kpis.onTimeRate.toFixed(1)}%`);
      csvRows.push('');
      
      // Evolução de Notas
      csvRows.push('Evolução de Notas');
      csvRows.push('Dia,Média');
      gradeEvolution.forEach(row => {
        csvRows.push(`${row.date},${row.media}`);
      });
      csvRows.push('');
      
      // Comparação de Turmas
      csvRows.push('Comparação de Turmas');
      csvRows.push('Turma,Média');
      classComparison.forEach(row => {
        csvRows.push(`${row.name},${row.media}`);
      });
      csvRows.push('');
      
      // Top Alunos
      csvRows.push('Top 10 Alunos');
      csvRows.push('Posição,Nome,Média,Atividades,Entregas no Prazo (%),Turmas');
      topStudents.forEach((student, idx) => {
        const classesNames = (student.classes || []).join(' | ');
        csvRows.push(`${idx + 1},${student.name},${student.avgGrade.toFixed(2)},${student.activities},${student.onTimeRate},${classesNames}`);
      });
      
      // Criar arquivo CSV
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Download
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-dashboard-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: '✅ Dashboard exportado!',
        description: 'Arquivo CSV baixado com sucesso'
      });
    } catch (error) {
      showErrorToast(
        toast,
        'Não foi possível exportar o dashboard.',
        error,
        {
          logPrefix: '[TeacherAnalyticsPage] Erro ao exportar CSV do dashboard',
          title: '❌ Erro ao exportar',
        }
      );
    }
  };

  const handleExportDashboardPDF = async () => {
    try {
      await exportTeacherAnalyticsDashboardToPDF({
        period,
        kpis,
        gradeEvolution,
        classComparison,
        gradeDistribution,
        weeklyTrends,
        topStudents,
        bottomStudents,
      });

      toast({
        title: '✅ Dashboard exportado!',
        description: 'PDF gerado com sucesso'
      });
    } catch (error) {
      showErrorToast(
        toast,
        'Não foi possível exportar o dashboard em PDF.',
        error,
        {
          logPrefix: '[TeacherAnalyticsPage] Erro ao exportar PDF do dashboard',
          title: '❌ Erro ao exportar PDF',
        }
      );
    }
  };

  const handleConfigureAlerts = () => {
    // Exemplo de configuração de alertas automáticos
    const alertsConfig = [
      {
        name: 'Média Baixa',
        condition: 'avgGrade < 6.0',
        action: 'Notificar quando média da turma cair abaixo de 6.0'
      },
      {
        name: 'Correções Pendentes',
        condition: 'pendingCorrections > 10',
        action: 'Alertar quando houver mais de 10 correções pendentes'
      },
      {
        name: 'Baixa Taxa de Entrega',
        condition: 'onTimeRate < 70%',
        action: 'Notificar quando taxa de entrega no prazo cair abaixo de 70%'
      }
    ];
    
    // Verificar condições
    const activeAlerts = [];
    
    if (kpis.avgGrade < 6.0) {
      activeAlerts.push('⚠️ Média da turma está abaixo de 6.0');
    }
    if (kpis.pendingCorrections > 10) {
      activeAlerts.push(`⚠️ ${kpis.pendingCorrections} correções pendentes`);
    }
    if (kpis.onTimeRate < 70) {
      activeAlerts.push(`⚠️ Taxa de entrega no prazo está em ${kpis.onTimeRate.toFixed(1)}%`);
    }
    
    if (activeAlerts.length > 0) {
      toast({
        title: '🔔 Alertas Ativos',
        description: activeAlerts.join(' • '),
        duration: 5000
      });
    } else {
      toast({
        title: '✅ Tudo certo!',
        description: 'Nenhum alerta ativo no momento'
      });
    }
  };

  const applyFilters = () => {
    loadAllData();
    toast({ title: 'Filtros aplicados' });
  };

  const clearFilters = () => {
    setPeriod('30');
    setSelectedClasses(classes.map(c => c.id));
    setActivityTypes(['all']);
    setStatusFilter(['graded']);
     setComparisonClassIds([]);
     setClassComparison([]);
     setClassComparisonInfo(null);
    toast({ title: 'Filtros limpos' });
  };

  if (loading && initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header */}
      <DashboardHeader
        title="Analytics e Insights"
        subtitle="Análise completa de desempenho e tendências"
        role="teacher"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleConfigureAlerts}>
              <Bell className="w-4 h-4 mr-2" />
              Configurar Alertas
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportDashboardCSV}>
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDashboardPDF}>
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Filtros Globais */}
      <Card className="p-6 mb-6 sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-lg">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Período
            </label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 180 dias</SelectItem>
                <SelectItem value="all">Todo o Período</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Turmas
            </label>
            <Select
              value={
                classes.length === 0
                  ? 'all'
                  : selectedClasses.length === classes.length || selectedClasses.length === 0
                  ? 'all'
                  : selectedClasses[0]
              }
              onValueChange={(value) => {
                if (value === 'all') {
                  setSelectedClasses(classes.map(c => c.id));
                } else {
                  setSelectedClasses([value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    classes.length === 0
                      ? 'Nenhuma turma ativa'
                      : 'Todas as turmas'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Todas as turmas
                  </div>
                </SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} {cls.subject && `- ${cls.subject}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={clearFilters}>
              Limpar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              id="auto-refresh"
            />
            <label htmlFor="auto-refresh" className="text-sm cursor-pointer">
              Auto-atualizar (5min)
            </label>
          </div>
        </div>

        {selectedClasses.length > 0 && selectedClasses.length < classes.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedClasses.map(classId => {
              const cls = classes.find(c => c.id === classId);
              return cls ? (
                <Badge key={classId} variant="secondary" className="text-xs">
                  {cls.name}
                  <button
                    onClick={() => setSelectedClasses(selectedClasses.filter(id => id !== classId))}
                    className="ml-1 hover:text-red-500"
                  >
                    ×
                  </button>
                </Badge>
              ) : null;
            })}
          </div>
        )}
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatsCard
          title="Total de Alunos"
          value={kpis.totalStudents}
          icon={Users}
          gradient={gradients.primary}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
        />
        <StatsCard
          title="Atividades Postadas"
          value={kpis.totalActivities}
          icon={ClipboardList}
          gradient={gradients.info}
          bgColor="bg-cyan-50 dark:bg-cyan-950/30"
        />
        <StatsCard
          title="Atividades Abertas"
          value={kpis.openActivities}
          icon={Clock}
          gradient={gradients.warning}
          bgColor="bg-yellow-50 dark:bg-yellow-950/30"
        />
        <StatsCard
          title="Aguardando Correção"
          value={kpis.pendingCorrections}
          icon={AlertCircle}
          gradient={gradients.danger}
          bgColor="bg-red-50 dark:bg-red-950/30"
        />
        <StatsCard
          title="Nota Média Geral"
          value={kpis.avgGrade.toFixed(1)}
          icon={TrendingUp}
          gradient={kpis.avgGrade >= 7 ? gradients.success : kpis.avgGrade >= 5 ? gradients.warning : gradients.danger}
          bgColor={kpis.avgGrade >= 7 ? "bg-green-50 dark:bg-green-950/30" : "bg-yellow-50 dark:bg-yellow-950/30"}
        />
        <StatsCard
          title="Taxa Entrega no Prazo"
          value={`${kpis.onTimeRate.toFixed(1)}%`}
          icon={CheckCircle}
          gradient={gradients.success}
          bgColor="bg-green-50 dark:bg-green-950/30"
          format="text"
        />
      </div>

      {/* Continue com os outros componentes... */}
      
      {/* Linha 1: Evolução das notas e tendências semanais */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <LineChart className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Evolução das notas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Média por dia de correção no período selecionado</p>
              </div>
            </div>
          </div>
          {gradeEvolution.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gradeEvolution} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(label) => `Dia ${label}`}
                    formatter={(value) => [`Média ${value.toFixed(2)}`, 'Nota']}
                  />
                  <Area type="monotone" dataKey="media" stroke="#2563EB" fillOpacity={0.15} fill="#60A5FA" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Ainda não há notas suficientes para calcular a evolução.</p>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Tendência semanal de entregas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Entregues no prazo x atrasadas (últimas 12 semanas)</p>
              </div>
            </div>
          </div>
          {weeklyTrends.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrends} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="noPrazo" name="No prazo" stackId="a" fill="#22C55E" />
                  <Bar dataKey="atrasadas" name="Atrasadas" stackId="a" fill="#F97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Nenhuma entrega registrada neste período.</p>
          )}
        </Card>
      </div>

      {/* Linha 2: Distribuição de notas, comparação entre turmas e originalidade */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Distribuição de notas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Faixas de desempenho das avaliações</p>
              </div>
            </div>
          </div>
          {gradeDistribution.length > 0 ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count">
                      {gradeDistribution.map((item, idx) => (
                        <Cell key={idx} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px]">
                  ✓ Notas normalizadas para escala 0-10
                </Badge>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  As notas são exibidas em faixas de 0 a 10 apenas para visualização.
                </p>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">Nenhuma nota registrada ainda para montar a distribuição.</p>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Comparação entre turmas</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Média geral por turma</p>
              </div>
            </div>
            {classes.length >= 2 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Turmas para comparar
                </span>
                <Select
                  value={comparisonClassIds[0] || ''}
                  onValueChange={(value) => {
                    setComparisonClassIds((prev) => {
                      const [, second] = prev || [];
                      return [value, second || ''];
                    });
                  }}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue placeholder="Turma 1" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={comparisonClassIds[1] || ''}
                  onValueChange={(value) => {
                    setComparisonClassIds((prev) => {
                      const [first] = prev || [];
                      return [first || '', value];
                    });
                  }}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue placeholder="Turma 2" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {classComparison.length > 0 ? (
            <div className="h-56 overflow-x-auto">
              <div className={classComparison.length > 6 ? 'min-w-[640px]' : 'min-w-full'}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classComparison}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="media" name="Média">
                      {classComparison.map((cls, idx) => (
                        <Cell key={idx} fill={cls.color || '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-xs text-slate-500 dark:text-slate-400 text-center">
              <BarChart3 className="w-6 h-6 mb-2 text-purple-400" />
              {classComparisonInfo?.type === 'not_enough_total' ? (
                <>
                  <p className="font-medium text-slate-700 dark:text-slate-200">Poucas turmas cadastradas</p>
                  <p>Crie pelo menos duas turmas para visualizar a comparação.</p>
                </>
              ) : classComparisonInfo?.type === 'need_two' ? (
                <>
                  <p className="font-medium text-slate-700 dark:text-slate-200">Selecione duas turmas</p>
                  <p>Use os seletores acima para escolher duas turmas para comparar.</p>
                </>
              ) : classComparisonInfo?.type === 'no_grades' ? (
                <>
                  <p className="font-medium text-slate-700 dark:text-slate-200">Sem notas registradas</p>
                  <p>
                    Ainda não há notas lançadas para as turmas selecionadas no período escolhido
                    para montar a comparação.
                  </p>
                </>
              ) : classComparisonInfo?.type === 'error' ? (
                <>
                  <p className="font-medium text-slate-700 dark:text-slate-200">Erro ao carregar dados</p>
                  <p>Tente atualizar a página ou ajustar os filtros.</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-700 dark:text-slate-200">Sem dados suficientes</p>
                  <p>Configure as turmas de comparação acima para visualizar o gráfico.</p>
                </>
              )}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Originalidade e plágio</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Resumo das verificações de plágio</p>
              </div>
            </div>
          </div>
          {plagiarismStats ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Originalidade média</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-300">{plagiarismStats.avgOriginality}%</span>
                </div>
                <Progress value={plagiarismStats.avgOriginality} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                  <p className="text-slate-500 dark:text-slate-400">Verificações realizadas</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{plagiarismStats.totalChecks}</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/40">
                  <p className="text-slate-500 dark:text-slate-400">Casos críticos</p>
                  <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">{plagiarismStats.casesDetected}</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/40">
                  <p className="text-slate-500 dark:text-slate-400">Possível IA</p>
                  <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">{plagiarismStats.aiDetected}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <p>
                Nenhuma verificação de plágio registrada neste período para as turmas selecionadas.
              </p>
              <p>
                Quando você utilizar o detector de plágio nas correções, um resumo com originalidade e casos
                críticos aparecerá aqui.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Linha 3: Top alunos e engajamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <Award className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Top alunos</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Desempenho médio dos alunos mais ativos</p>
              </div>
            </div>
          </div>
          {topStudents.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {topStudents.map((student, index) => (
                <div key={student.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                      {(student.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{index + 1}. {student.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {student.activities} atividades • {student.onTimeRate}% no prazo
                      </p>
                      {student.classes && student.classes.length > 0 && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Turmas: {student.classes.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{student.avgGrade.toFixed(1)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">nota média</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Ainda não há dados suficientes para ranquear os alunos.</p>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-amber-500" />
                Alunos que precisam de atenção
              </h3>
            </div>
            {bottomStudents.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {bottomStudents.map((student, index) => (
                  <div key={student.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 dark:bg-amber-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-[11px] font-bold">
                        {(student.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">{index + 1}. {student.name}</p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400">
                          {student.activities} atividades • {student.onTimeRate}% no prazo
                        </p>
                        {student.classes && student.classes.length > 0 && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">
                            Turmas: {student.classes.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{student.avgGrade.toFixed(1)}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">nota média</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1 text-xs h-6 px-2"
                        onClick={() => {
                          // Navegar para detalhes do aluno
                          window.location.href = `/dashboard/students/${student.id}`;
                        }}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Nenhum aluno em destaque negativo neste período.</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40">
                <Zap className="w-5 h-5 text-sky-600 dark:text-sky-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Engajamento (beta)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Visão geral do engajamento dos alunos</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 text-xs text-slate-500 dark:text-slate-400">
            <p>Estes indicadores serão enriquecidos com dados de uso da plataforma (acessos, tempo de sessão, interações). Por enquanto, use as demais métricas para monitorar participação e desempenho.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                <p>Acessos únicos (em breve)</p>
                <p className="mt-1 text-lg font-semibold text-slate-400 dark:text-slate-500">—</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                <p>Tempo médio de estudo</p>
                <p className="mt-1 text-lg font-semibold text-slate-400 dark:text-slate-500">—</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                <p>Taxa de retorno</p>
                <p className="mt-1 text-lg font-semibold text-slate-400 dark:text-slate-500">—</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                <p>Interações na plataforma</p>
                <p className="mt-1 text-lg font-semibold text-slate-400 dark:text-slate-500">—</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeacherAnalyticsPage;
