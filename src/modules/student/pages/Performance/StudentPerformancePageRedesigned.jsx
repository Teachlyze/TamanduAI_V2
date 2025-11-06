import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';
import { StatCard, EmptyState } from '@/modules/student/components/redesigned';
import { GradeCard } from '@/modules/student/components/redesigned/GradeCard';
import { Star, TrendingUp, Target, Trophy, BookOpen, Filter, Sparkles, Loader2, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useToast } from '@/shared/components/ui/use-toast';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const StudentPerformancePageRedesigned = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [dailyAIUsageCount, setDailyAIUsageCount] = useState(0);
  const [loadingUsageCount, setLoadingUsageCount] = useState(true);
  
  // Dados brutos (sem filtro)
  const [allStats, setAllStats] = useState({
    avgGrade: 0,
    totalActivities: 0,
    completedActivities: 0,
    ranking: null
  });
  const [allRecentGrades, setAllRecentGrades] = useState([]);
  const [allEvolutionData, setAllEvolutionData] = useState([]);
  
  // Dados filtrados (exibidos)
  const [stats, setStats] = useState({
    avgGrade: 0,
    totalActivities: 0,
    completedActivities: 0,
    ranking: null
  });
  const [recentGrades, setRecentGrades] = useState([]);
  const [evolutionData, setEvolutionData] = useState([]);
  const [classPerformance, setClassPerformance] = useState([]);
  const [radarData, setRadarData] = useState([]);
  
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (user?.id) {
      loadPerformanceData();
      loadDailyAIUsageCount();
    }
  }, [user]);

  useEffect(() => {
    // Aplicar filtros sem recarregar dados
    applyFilters();
  }, [selectedClass, selectedPeriod]);

  const loadDailyAIUsageCount = async () => {
    try {
      setLoadingUsageCount(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('ai_recommendations_usage')
        .select('id')
        .eq('student_id', user.id)
        .gte('created_at', today.toISOString());
      
      if (error) {
        logger.error('[AI Usage] Erro ao buscar contador:', error);
        setDailyAIUsageCount(0);
      } else {
        setDailyAIUsageCount(data?.length || 0);
        logger.debug('[AI Usage] Usos hoje:', data?.length || 0);
      }
    } catch (error) {
      logger.error('[AI Usage] Erro ao buscar contador:', error);
      setDailyAIUsageCount(0);
    } finally {
      setLoadingUsageCount(false);
    }
  };

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadRecentGrades(),
        loadEvolutionData(),
        loadClassPerformance(),
        loadRadarData(),
        loadClasses()
      ]);
    } catch (error) {
      logger.error('Erro ao carregar dados de desempenho:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    // Filtrar stats
    if (!allStats.submissions) return;

    let filteredSubmissions = [...allStats.submissions];
    let filteredAssignments = [...(allStats.assignments || [])];

    // Filtro de turma
    if (selectedClass !== 'all') {
      filteredSubmissions = filteredSubmissions.filter(s => s.class_id === selectedClass);
      filteredAssignments = filteredAssignments.filter(a => a.class_id === selectedClass);
    }

    // Filtro de período
    if (selectedPeriod !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      if (selectedPeriod === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (selectedPeriod === 'semester') {
        startDate.setMonth(now.getMonth() - 6);
      }

      filteredSubmissions = filteredSubmissions.filter(s => 
        new Date(s.submitted_at) >= startDate
      );
    }

    // Recalcular stats com dados filtrados
    const completedActivities = filteredSubmissions.length;
    const totalActivities = filteredAssignments.map(a => a.activity_id).filter((v, i, a) => a.indexOf(v) === i).length;
    const gradesData = filteredSubmissions.filter(s => s.grade !== null);
    const avgGrade = gradesData.length > 0
      ? gradesData.reduce((sum, s) => sum + parseFloat(s.grade), 0) / gradesData.length
      : 0;

    setStats({
      avgGrade,
      totalActivities,
      completedActivities,
      ranking: null
    });

    // Filtrar recentGrades
    let filteredGrades = [...allRecentGrades];
    if (selectedClass !== 'all') {
      filteredGrades = filteredGrades.filter(g => g.class_id === selectedClass);
    }
    if (selectedPeriod !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      if (selectedPeriod === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (selectedPeriod === 'semester') {
        startDate.setMonth(now.getMonth() - 6);
      }

      filteredGrades = filteredGrades.filter(g => 
        new Date(g.submitted_at) >= startDate
      );
    }
    setRecentGrades(filteredGrades.slice(0, 5));

    // Filtrar evolutionData
    let filteredEvolution = [...allEvolutionData];
    if (selectedClass !== 'all') {
      filteredEvolution = filteredEvolution.filter(e => e.class_id === selectedClass);
    }
    if (selectedPeriod !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      if (selectedPeriod === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (selectedPeriod === 'semester') {
        startDate.setMonth(now.getMonth() - 6);
      }

      filteredEvolution = filteredEvolution.filter(e => 
        new Date(e.submitted_at) >= startDate
      );
    }
    setEvolutionData(filteredEvolution.slice(-20));
  };

  const loadClasses = async () => {
    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      const { data: classList } = await supabase
        .from('classes')
        .select('id, name, subject')
        .in('id', classIds);

      setClasses(classList || []);
    } catch (error) {
      logger.error('Erro ao carregar turmas:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      if (classIds.length === 0) {
        setAllStats({ avgGrade: 0, totalActivities: 0, completedActivities: 0, ranking: null });
        setStats({ avgGrade: 0, totalActivities: 0, completedActivities: 0, ranking: null });
        return;
      }

      // Buscar todas as atividades
      const { data: assignments } = await supabase
        .from('activity_class_assignments')
        .select('activity_id, class_id')
        .in('class_id', classIds);

      const activityIds = assignments?.map(a => a.activity_id) || [];
      const totalActivities = activityIds.length;

      // Buscar todas as submissões (sem filtro de período)
      const { data: submissions } = await supabase
        .from('submissions')
        .select('activity_id, status, grade, submitted_at')
        .eq('student_id', user.id)
        .in('activity_id', activityIds);

      // Salvar dados brutos com informação de turma
      const submissionsWithClass = (submissions || []).map(sub => ({
        ...sub,
        class_id: assignments.find(a => a.activity_id === sub.activity_id)?.class_id
      }));

      const completedActivities = submissions?.length || 0;
      const gradesData = submissions?.filter(s => s.grade !== null) || [];
      const avgGrade = gradesData.length > 0
        ? gradesData.reduce((sum, s) => sum + parseFloat(s.grade), 0) / gradesData.length
        : 0;

      // Salvar nos estados "all" (sem filtro)
      setAllStats({
        avgGrade,
        totalActivities,
        completedActivities,
        ranking: null,
        submissions: submissionsWithClass,
        assignments
      });
      
      // Inicialmente, dados filtrados = dados completos
      setStats({
        avgGrade,
        totalActivities,
        completedActivities,
        ranking: null
      });
    } catch (error) {
      logger.error('Erro ao carregar stats:', error);
    }
  };

  const loadRecentGrades = async () => {
    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      if (classIds.length === 0) {
        setAllRecentGrades([]);
        setRecentGrades([]);
        return;
      }

      // Buscar todas as atividades (sem filtro de turma)
      const { data: assignments } = await supabase
        .from('activity_class_assignments')
        .select('activity_id, class_id')
        .in('class_id', classIds);

      const activityIds = assignments?.map(a => a.activity_id) || [];

      if (activityIds.length === 0) {
        setAllRecentGrades([]);
        setRecentGrades([]);
        return;
      }

      // Buscar TODAS as submissões com notas (sem limite)
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, grade, feedback, submitted_at, status, activity_id')
        .eq('student_id', user.id)
        .in('activity_id', activityIds)
        .not('grade', 'is', null)
        .order('submitted_at', { ascending: false });

      const submissionActivityIds = submissions?.map(s => s.activity_id) || [];

      // Buscar dados das atividades
      const { data: activities } = await supabase
        .from('activities')
        .select('id, title, max_score')
        .in('id', submissionActivityIds);

      const activitiesMap = {};
      activities?.forEach(a => { activitiesMap[a.id] = a; });

      // Buscar nomes das turmas
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds);

      const classesMap = {};
      classes?.forEach(c => { classesMap[c.id] = c; });

      const assignmentsMap = {};
      assignments?.forEach(a => {
        assignmentsMap[a.activity_id] = a.class_id;
      });

      const gradesWithClass = (submissions || []).map(s => ({
        ...s,
        activity_title: activitiesMap[s.activity_id]?.title,
        max_score: activitiesMap[s.activity_id]?.max_score,
        class_id: assignmentsMap[s.activity_id],
        class_name: classesMap[assignmentsMap[s.activity_id]]?.name
      }));

      // Salvar TODOS os dados
      setAllRecentGrades(gradesWithClass);
      // Inicialmente mostrar primeiras 5
      setRecentGrades(gradesWithClass.slice(0, 5));
    } catch (error) {
      logger.error('Erro ao carregar notas recentes:', error);
    }
  };

  const loadEvolutionData = async () => {
    try {
      // Buscar turmas do aluno
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      // Buscar atividades
      const { data: assignments } = await supabase
        .from('activity_class_assignments')
        .select('activity_id, class_id')
        .in('class_id', classIds);

      const activityIds = assignments?.map(a => a.activity_id) || [];

      // Buscar TODAS as submissões (sem limit)
      const { data: submissions } = await supabase
        .from('submissions')
        .select('grade, submitted_at, activity_id, activity:activities(max_score)')
        .eq('student_id', user.id)
        .in('activity_id', activityIds)
        .not('grade', 'is', null)
        .order('submitted_at', { ascending: true });

      const submissionsWithClass = (submissions || []).map(s => ({
        ...s,
        class_id: assignments.find(a => a.activity_id === s.activity_id)?.class_id,
        date: format(new Date(s.submitted_at), 'dd/MM', { locale: ptBR }),
        nota: parseFloat(s.grade) || 0,
        maxScore: s.activity?.max_score || 10
      }));

      // Salvar TODOS os dados
      setAllEvolutionData(submissionsWithClass);
      // Inicialmente mostrar últimas 20
      setEvolutionData(submissionsWithClass.slice(-20));
    } catch (error) {
      logger.error('Erro ao carregar evolução:', error);
    }
  };

  const loadClassPerformance = async () => {
    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      const { data: classList } = await supabase
        .from('classes')
        .select('id, name, subject')
        .in('id', classIds);

      const classesMap = {};
      classList?.forEach(c => { classesMap[c.id] = c; });

      const classesData = await Promise.all(
        (memberships || []).map(async (m) => {
          // Buscar atividades
          const { data: assignments } = await supabase
            .from('activity_class_assignments')
            .select('activity_id')
            .eq('class_id', m.class_id);

          const activityIds = assignments?.map(a => a.activity_id) || [];

          // Buscar submissões com notas
          const { data: submissions } = await supabase
            .from('submissions')
            .select('id, grade, submitted_at, activity_id')
            .eq('student_id', user.id)
            .in('activity_id', activityIds)
            .not('grade', 'is', null)
            .order('submitted_at', { ascending: true });

          // Buscar dados das atividades
          const submissionActivityIds = submissions?.map(s => s.activity_id) || [];
          const { data: activities } = await supabase
            .from('activities')
            .select('id, title, max_score')
            .in('id', submissionActivityIds);

          const activitiesMap = {};
          activities?.forEach(a => { activitiesMap[a.id] = a; });

          const grades = submissions?.map(s => parseFloat(s.grade)) || [];
          const avgGrade = grades.length > 0
            ? grades.reduce((sum, g) => sum + g, 0) / grades.length
            : 0;

          const history = (submissions || []).map(s => ({
            date: format(new Date(s.submitted_at), 'dd/MM', { locale: ptBR }),
            grade: parseFloat(s.grade)
          }));

          const classInfo = classesMap[m.class_id];
          
          return {
            name: classInfo?.name || 'Turma',
            media: avgGrade,
            history
          };
        })
      );

      setClassPerformance(classesData.sort((a, b) => b.media - a.media));
    } catch (error) {
      logger.error('Erro ao carregar desempenho por turma:', error);
    }
  };

  const loadRadarData = async () => {
    try {
      // Dados de habilidades (exemplo - pode ser customizado)
      const skills = [
        { skill: 'Objetivas', value: 0, count: 0 },
        { skill: 'Abertas', value: 0, count: 0 },
        { skill: 'Mistas', value: 0, count: 0 }
      ];

      const { data: submissions } = await supabase
        .from('submissions')
        .select(`
          grade,
          activity:activities(type, max_score)
        `)
        .eq('student_id', user.id)
        .not('grade', 'is', null);

      submissions?.forEach(s => {
        const percentage = (parseFloat(s.grade) / parseFloat(s.activity?.max_score)) * 100;
        
        if (s.activity?.type === 'objective') {
          skills[0].value += percentage;
          skills[0].count++;
        } else if (s.activity?.type === 'open') {
          skills[1].value += percentage;
          skills[1].count++;
        } else if (s.activity?.type === 'mixed') {
          skills[2].value += percentage;
          skills[2].count++;
        }
      });

      const radarData = skills.map(s => ({
        skill: s.skill,
        value: s.count > 0 ? Math.round(s.value / s.count) : 0
      }));

      setRadarData(radarData);
    } catch (error) {
      logger.error('Erro ao carregar radar de habilidades:', error);
    }
  };

  const generateAIRecommendations = async () => {
    const cacheKey = `ai_recommendations_${user.id}`;
    
    try {
      setGeneratingAI(true);
      
      // Verificar cache (evitar rate limit 429)
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { recommendations, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
        
        if (cacheAge < CACHE_DURATION) {
          logger.debug('[AI] Usando recomendações do cache (rate limit)');
          setAiRecommendations(recommendations);
          setGeneratingAI(false);
          toast({
            title: '✅ Recomendações carregadas',
            description: 'Usando análise recente do cache'
          });
          return;
        }
      }
      
      // Preparar dados do aluno
      const performanceSummary = {
        avgGrade: stats.avgGrade,
        totalActivities: stats.totalActivities,
        completedActivities: stats.completedActivities,
        recentGrades: recentGrades.slice(0, 5).map(g => ({
          activityTitle: g.activity_title,
          grade: parseFloat(g.grade),
          maxScore: parseFloat(g.max_score),
          submittedAt: g.submitted_at,
          subject: g.class_name
        })),
        classComparison: classPerformance.map(cp => ({
          subject: cp.name,
          studentAvg: cp.media,
          classAvg: cp.media // TODO: Implementar média da turma quando disponível
        })),
        radarData
      };

      toast({
        title: '🤖 Gerando recomendações...',
        description: 'Aguarde enquanto a IA analisa seu desempenho'
      });

      // Chamar Edge Function real de AI
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-study-recommendations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            studentId: user.id,
            performanceData: performanceSummary
          })
        }
      );

      let recommendations;

      if (response.ok) {
        const result = await response.json();
        
        // Verificar se limite diário foi atingido
        if (result.limitReached) {
          logger.warn('[AI] Limite diário atingido:', result);
          setGeneratingAI(false);
          // Atualizar contador local
          await loadDailyAIUsageCount();
          toast({
            title: '⏰ Limite Diário Atingido',
            description: result.message || 'Você já gerou 3 recomendações hoje. Tente novamente amanhã!',
            variant: 'destructive',
            duration: 5000
          });
          return;
        }
        
        // Atualizar contador após sucesso
        await loadDailyAIUsageCount();
        
        // Usar resposta da AI
        logger.debug('[AI] Recomendações recebidas da Edge Function');
        recommendations = result.recommendations || result;
      } else {
        // Fallback local (erro na API)
        logger.debug('[AI] Usando fallback local (erro na API)');
        
        // Analisar desempenho por turma
        const weakClasses = classPerformance
          .filter(c => c.media < 7)
          .sort((a, b) => a.media - b.media);
        
        const strongClasses = classPerformance
          .filter(c => c.media >= 8)
          .sort((a, b) => b.media - a.media);

        const improvementsRecommendations = [];
        if (weakClasses.length > 0) {
          weakClasses.slice(0, 2).forEach(cls => {
            improvementsRecommendations.push(
              `Revisar conceitos de ${cls.name} onde as notas foram menores (média: ${cls.media.toFixed(1)})`
            );
          });
        } else {
          improvementsRecommendations.push('Manter o ritmo de estudos atual');
        }

        if (recentGrades.some(g => g.status === 'draft')) {
          improvementsRecommendations.push('Completar atividades pendentes antes do prazo');
        }

        improvementsRecommendations.push('Participar mais das discussões em sala');

        const strengthsRecommendations = [];
        if (stats.avgGrade >= 8) {
          strengthsRecommendations.push('Ótimo desempenho geral nas atividades');
        } else if (stats.avgGrade >= 7) {
          strengthsRecommendations.push('Bom desempenho nas atividades');
        } else {
          strengthsRecommendations.push('Mostrando esforço e dedicação');
        }

        if (strongClasses.length > 0) {
          strongClasses.slice(0, 2).forEach(cls => {
            strengthsRecommendations.push(`Excelente em ${cls.name} (média: ${cls.media.toFixed(1)})`);
          });
        }

        const completionRate = stats.totalActivities > 0 
          ? (stats.completedActivities / stats.totalActivities) * 100 
          : 0;
        
        if (completionRate >= 80) {
          strengthsRecommendations.push('Consistência nas entregas dentro do prazo');
        }

        recommendations = {
          strengths: strengthsRecommendations,
          improvements: improvementsRecommendations,
          tips: [
            '📚 Reserve 30min diários para revisão',
            '✍️ Pratique mais questões abertas',
            '🎯 Estabeleça metas semanais de estudo',
            '👥 Forme grupos de estudo com colegas',
            '❓ Tire dúvidas com professores'
          ].slice(0, 3)
        };
      }

      setAiRecommendations(recommendations);

      // Salvar no cache (evitar rate limit)
      localStorage.setItem(cacheKey, JSON.stringify({
        recommendations,
        timestamp: Date.now()
      }));

      toast({
        title: '✅ Recomendações geradas!',
        description: 'Confira as sugestões personalizadas abaixo'
      });
    } catch (error) {
      logger.error('Erro ao gerar recomendações:', error);
      toast({
        title: '❌ Erro ao gerar recomendações',
        description: 'Tente novamente mais tarde',
        variant: 'destructive'
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-600" />
              Meu Desempenho
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Acompanhe suas notas e evolução acadêmica
            </p>
          </div>

          {/* Botão de IA */}
          <div className="flex flex-col items-end gap-2">
            <Button 
              onClick={generateAIRecommendations}
              disabled={generatingAI || stats.totalActivities === 0 || dailyAIUsageCount >= 3}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {generatingAI ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : dailyAIUsageCount >= 3 ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Limite Diário Atingido
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Recomendações com IA
                </>
              )}
            </Button>
            {!loadingUsageCount && (
              <span className={`text-sm ${
                dailyAIUsageCount >= 3 
                  ? 'text-red-600 dark:text-red-400 font-semibold' 
                  : dailyAIUsageCount >= 2
                  ? 'text-orange-600 dark:text-orange-400 font-medium'
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
                {dailyAIUsageCount}/3 utilizadas hoje
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Recomendações da IA */}
      {aiRecommendations && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Recomendações Personalizadas da IA
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pontos Fortes */}
              <div>
                <h3 className="font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Seus Pontos Fortes
                </h3>
                <ul className="space-y-2">
                  {aiRecommendations.strengths?.map((strength, idx) => (
                    <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/50 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      • {strength}
                    </li>
                  )) || <li className="text-sm text-slate-500">Carregando...</li>}
                </ul>
              </div>

              {/* Áreas para Melhorar */}
              <div>
                <h3 className="font-bold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Áreas para Melhorar
                </h3>
                <ul className="space-y-2">
                  {aiRecommendations.improvements?.map((improvement, idx) => (
                    <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/50 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                      • {improvement}
                    </li>
                  )) || <li className="text-sm text-slate-500">Carregando...</li>}
                </ul>
              </div>

              {/* Dicas de Estudo */}
              <div>
                <h3 className="font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Dicas de Estudo
                </h3>
                <ul className="space-y-2">
                  {aiRecommendations.tips?.map((tip, idx) => (
                    <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/50 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      {tip}
                    </li>
                  )) || <li className="text-sm text-slate-500">Carregando...</li>}
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Todas as turmas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Todo o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mês</SelectItem>
            <SelectItem value="semester">Último semestre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Star}
          value={stats.avgGrade > 0 ? stats.avgGrade.toFixed(1) : '--'}
          label="Média Geral"
          gradient="yellow"
        />
        <StatCard
          icon={Target}
          value={stats.completedActivities}
          label="Atividades Concluídas"
          gradient="green"
        />
        <StatCard
          icon={BookOpen}
          value={stats.totalActivities}
          label="Total de Atividades"
          gradient="blue"
        />
        <StatCard
          icon={Trophy}
          value={stats.ranking || '--'}
          label="Posição no Ranking"
          gradient="purple"
        />
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Gráfico de Evolução */}
        {evolutionData.length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Evolução das Notas
            </h2>
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={300} className="min-w-[400px]">
                <LineChart data={evolutionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" domain={[0, 10]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="nota"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 6 }}
                    name="Nota"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Desempenho por Turma */}
        {classPerformance.length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              📊 Por Turma
            </h2>
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={300} className="min-w-[300px]">
                <BarChart data={classPerformance} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" domain={[0, 10]} tick={{ fontSize: 12 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#64748b" 
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="media" fill="#3b82f6" radius={[0, 8, 8, 0]} name="Média" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Coluna Esquerda (2/3) - Últimas Notas */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
              📝 Últimas Notas
            </h2>
            {recentGrades.length > 0 ? (
              <div className="space-y-4">
                {recentGrades.map((grade, index) => (
                  <GradeCard
                    key={grade.id}
                    grade={grade}
                    onViewDetails={() => navigate(`/students/activities/${grade.activity_id}`)}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Star}
                title="Nenhuma nota ainda"
                description="Complete suas atividades para ver suas notas aqui."
                variant="default"
              />
            )}
          </Card>
        </div>

        {/* Coluna Direita (1/3) - Desempenho por Tipo */}
        <div>
          {radarData.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                🎯 Por Tipo
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={radarData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="skill" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Desempenho %" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPerformancePageRedesigned;
