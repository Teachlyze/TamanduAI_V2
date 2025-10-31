import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Award, Lightbulb, AlertTriangle, Target, BookOpen, Sparkles, TrendingDown, Users, Trophy } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { DashboardHeader, StatsCard } from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import analyticsMLService from '@/shared/services/analyticsMLService';
import { toast } from '@/shared/components/ui/use-toast';

const StudentPerformancePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [stats, setStats] = useState({ avgGrade: 0, totalActivities: 0, completionRate: 0 });
  const [gradeData, setGradeData] = useState([]);
  const [classComparison, setClassComparison] = useState([]);
  const [studySuggestions, setStudySuggestions] = useState([]);
  const [attentionAreas, setAttentionAreas] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadPerformance();
      loadAnalytics();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadPerformance = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      
      const { data: submissions } = await supabase
        .from('submissions')
        .select(`
          grade,
          submitted_at,
          graded_at,
          activity:activities(
            id,
            title,
            max_score,
            activity_class_assignments(
              class_id,
              class:classes(id, name, subject)
            )
          )
        `)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: true });

      const grades = submissions?.filter(s => s.grade !== null) || [];
      const avgGrade = grades.length > 0 
        ? grades.reduce((sum, s) => sum + s.grade, 0) / grades.length 
        : 0;

      setStats({
        avgGrade: avgGrade.toFixed(1),
        totalActivities: submissions?.length || 0,
        completionRate: 85
      });

      // Preparar dados para gráficos
      const chartData = grades.slice(-10).map((s, idx) => ({
        name: `A${idx + 1}`,
        nota: Number(s.grade.toFixed(1)),
        date: s.submitted_at
      }));
      setGradeData(chartData);

      // Calcular comparação por turma
      await loadClassComparison(submissions);

      // Armazenar dados de performance para IA
      setPerformanceData(submissions);

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClassComparison = async (studentSubmissions) => {
    try {
      // Agrupar por turma
      const byClass = {};
      
      studentSubmissions.forEach(sub => {
        const classInfo = sub.activity?.activity_class_assignments?.[0]?.class;
        if (!classInfo) return;
        
        if (!byClass[classInfo.id]) {
          byClass[classInfo.id] = {
            classId: classInfo.id,
            className: classInfo.name,
            subject: classInfo.subject,
            studentGrades: [],
            activityIds: []
          };
        }
        
        byClass[classInfo.id].studentGrades.push(sub.grade);
        byClass[classInfo.id].activityIds.push(sub.activity.id);
      });

      // Para cada turma, buscar média geral
      const comparisons = await Promise.all(
        Object.values(byClass).map(async (classData) => {
          // Buscar todas as submissions dessa turma (de todos os alunos)
          const { data: allSubmissions } = await supabase
            .from('submissions')
            .select('grade, activity_id')
            .in('activity_id', classData.activityIds)
            .not('grade', 'is', null);

          const classGrades = allSubmissions?.map(s => s.grade) || [];
          const classAvg = classGrades.length > 0
            ? classGrades.reduce((sum, g) => sum + g, 0) / classGrades.length
            : 0;

          const studentAvg = classData.studentGrades.reduce((sum, g) => sum + g, 0) / classData.studentGrades.length;
          
          return {
            className: classData.className,
            subject: classData.subject,
            studentAvg: Number(studentAvg.toFixed(1)),
            classAvg: Number(classAvg.toFixed(1)),
            difference: Number((studentAvg - classAvg).toFixed(1))
          };
        })
      );

      setClassComparison(comparisons);
    } catch (error) {
      console.error('Erro ao calcular comparação:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      // Tentar usar Analytics ML Service
      const suggestions = await analyticsMLService.getStudySuggestions(user.id);
      const areas = await analyticsMLService.getAttentionAreas(user.id);
      
      setStudySuggestions(suggestions || []);
      setAttentionAreas(areas || []);
    } catch (error) {
      console.error('Analytics ML não disponível:', error);
      // Fallback: implementar lógica simples
      setStudySuggestions([
        { text: 'Continue praticando regularmente', icon: Target },
        { text: 'Revise conceitos fundamentais', icon: BookOpen }
      ]);
    }
  };

  const loadAIRecommendations = async () => {
    if (!performanceData || performanceData.length === 0) {
      toast({
        title: 'Sem dados suficientes',
        description: 'Complete mais atividades para receber recomendações personalizadas.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoadingRecommendations(true);

      // Preparar dados para a IA
      const performanceSummary = {
        avgGrade: stats.avgGrade,
        totalActivities: stats.totalActivities,
        recentGrades: performanceData.slice(-5).map(s => ({
          grade: s.grade,
          maxScore: s.activity?.max_score,
          subject: s.activity?.activity_class_assignments?.[0]?.class?.subject
        })),
        classComparison: classComparison.map(c => ({
          subject: c.subject,
          studentAvg: c.studentAvg,
          classAvg: c.classAvg
        }))
      };

      // Chamar Edge Function da OpenAI
      const response = await fetch('/api/ai-study-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({
          studentId: user.id,
          performanceData: performanceSummary
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao obter recomendações');
      }

      const data = await response.json();
      setAiRecommendations(data.recommendations || []);

      toast({
        title: 'Recomendações atualizadas!',
        description: 'Confira suas sugestões personalizadas de estudo.'
      });

    } catch (error) {
      console.error('Erro ao carregar recomendações:', error);
      toast({
        title: 'Erro ao carregar recomendações',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
    } finally {
      setLoadingRecommendations(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <h1 className="text-3xl font-bold mb-2">Meu Desempenho</h1>
          <p className="text-cyan-100">Análise completa com IA e comparação com a turma</p>
        </motion.div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard title="Média Geral" value={stats.avgGrade} icon={BarChart3} gradient="from-blue-500 to-cyan-600" delay={0} />
        <StatsCard title="Atividades Concluídas" value={stats.totalActivities} icon={Award} gradient="from-cyan-500 to-blue-700" delay={0.1} />
        <StatsCard title="Taxa de Conclusão" value={`${stats.completionRate}%`} icon={TrendingUp} gradient="from-emerald-500 to-cyan-500" format="text" delay={0.2} />
      </div>

      {/* Evolução de Notas */}
      <Card className="p-6 bg-white dark:bg-slate-900 mb-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Evolução de Notas</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={gradeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Line type="monotone" dataKey="nota" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Comparação com a Turma */}
      {classComparison.length > 0 && (
        <Card className="p-6 bg-white dark:bg-slate-900 mb-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Comparação com a Turma</h3>
            </div>
            <Badge variant="secondary" className="text-xs">Dados anônimos</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Veja como você está em relação à média da turma
          </p>
          <div className="space-y-4">
            {classComparison.map((comparison, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{comparison.className}</h4>
                    <p className="text-xs text-slate-500">{comparison.subject}</p>
                  </div>
                  <Badge className={
                    comparison.difference > 0 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : comparison.difference < 0
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      : "bg-slate-100 text-slate-700"
                  }>
                    {comparison.difference > 0 ? '+' : ''}{comparison.difference}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Sua média</p>
                    <p className="text-2xl font-bold text-blue-600">{comparison.studentAvg}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Média da turma</p>
                    <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{comparison.classAvg}</p>
                  </div>
                </div>
                <Progress 
                  value={(comparison.studentAvg / 10) * 100} 
                  className="h-2 mt-3" 
                />
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sugestões de Estudo (Analytics ML) */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Sugestões de Estudo</h3>
          </div>
          {studySuggestions.length > 0 ? (
            <div className="space-y-3">
              {studySuggestions.map((suggestion, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg"
                >
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                    <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{suggestion.text || suggestion}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">Complete mais atividades para receber sugestões personalizadas.</p>
          )}
        </Card>

        {/* Áreas de Atenção */}
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Áreas de Atenção</h3>
          </div>
          {attentionAreas.length > 0 ? (
            <div className="space-y-3">
              {attentionAreas.map((area, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg"
                >
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/40">
                    <TrendingDown className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{area.subject || area.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{area.description || area.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-600" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Excelente! Não há áreas críticas no momento.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Recomendações com IA */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recomendações Personalizadas com IA</h3>
          </div>
          <Button
            onClick={loadAIRecommendations}
            disabled={loadingRecommendations}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            {loadingRecommendations ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Recomendações
              </>
            )}
          </Button>
        </div>
        
        {aiRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {aiRecommendations.map((rec, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">{rec.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{rec.description}</p>
                    {rec.reason && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {rec.reason}
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-blue-400 opacity-50" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Clique no botão acima para gerar recomendações personalizadas baseadas no seu desempenho.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              A IA analisará suas notas, compara com a turma e sugere materiais de estudo ideais para você.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentPerformancePage;
