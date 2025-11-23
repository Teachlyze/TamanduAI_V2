import { logger } from '@/shared/utils/logger';
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
  const [usageToday, setUsageToday] = useState(0);
  const [dailyLimit] = useState(3);

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
      logger.error('Erro:', error)
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
      logger.error('Erro ao calcular comparação:', error)
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
      logger.error('Analytics ML não disponível:', error)
      // Fallback: implementar lógica simples
      setStudySuggestions([
        { text: 'Continue praticando regularmente', icon: Target },
        { text: 'Revise conceitos fundamentais', icon: BookOpen }
      ]);
    }
  };

  const generateFallbackRecommendations = (summary) => {
    const recommendations = [];
    
    // Análise da média geral
    if (summary.avgGrade < 60) {
      recommendations.push({
        title: '📚 Reforço nos Estudos',
        description: 'Sua média está abaixo do esperado. Dedique mais tempo aos estudos diários.',
        reason: 'Média atual abaixo de 60%',
        priority: 'high'
      });
    } else if (summary.avgGrade < 75) {
      recommendations.push({
        title: '📈 Continue Progredindo',
        description: 'Você está no caminho certo! Mantenha a consistência nos estudos.',
        reason: 'Desempenho moderado',
        priority: 'medium'
      });
    } else {
      recommendations.push({
        title: '⭐ Excelente Desempenho',
        description: 'Continue assim! Considere ajudar colegas com dificuldades.',
        reason: 'Média acima de 75%',
        priority: 'low'
      });
    }
    
    // Análise comparativa com turma
    if (summary.classComparison && summary.classComparison.length > 0) {
      const belowAverage = summary.classComparison.filter(c => c.studentAvg < c.classAvg);
      if (belowAverage.length > 0) {
        recommendations.push({
          title: '🎯 Focar em Matérias Específicas',
          description: `Concentre-se em melhorar em: ${belowAverage.map(c => c.subject).join(', ')}`,
          reason: 'Abaixo da média da turma',
          priority: 'high'
        });
      }
    }
    
    // Recomendações gerais
    recommendations.push({
      title: '⏰ Organize seu Tempo',
      description: 'Crie um cronograma de estudos e reserve horários fixos para cada matéria.',
      reason: 'Boa prática de estudo',
      priority: 'medium'
    });
    
    return recommendations;
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

      // Buscar últimas 5 submissões com detalhes completos (questões e respostas)
      const { data: detailedSubmissions } = await supabase
        .from('submissions')
        .select(`
          id,
          grade,
          submitted_at,
          activity:activities(
            id,
            title,
            max_score,
            content,
            activity_class_assignments(
              class:classes(subject)
            )
          ),
          answers(
            question_id,
            answer_json,
            points_earned
          )
        `)
        .eq('student_id', user.id)
        .not('grade', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(5);

      // Debug: ver estrutura das submissions
      logger.debug('🔍 Total de Submissions encontradas:', detailedSubmissions?.length)
      logger.debug('🔍 Detailed Submissions:', JSON.stringify(detailedSubmissions, null, 2));

      // Processar submissões com questões detalhadas
      const recentGradesWithDetails = (detailedSubmissions || []).map((submission, idx) => {
        const activity = submission.activity;
        const subject = activity?.activity_class_assignments?.[0]?.class?.subject || 'Geral';
        
        // Debug: ver conteúdo de CADA atividade
        logger.debug(`\n📝 Activity ${idx + 1}/${detailedSubmissions.length}:`, {
          title: activity?.title,
          grade: submission.grade,
          hasContent: !!activity?.content,
          contentKeys: activity?.content ? Object.keys(activity.content) : [],
          questionsCount: Array.isArray(activity?.content?.questions) ? activity.content.questions.length : 0,
          questions: activity?.content?.questions,
          answersCount: submission.answers?.length || 0,
          answers: submission.answers
        });
        
        // Extrair questões e comparar com respostas do aluno
        const questions = [];
        if (activity?.content?.questions && Array.isArray(activity.content.questions)) {
          activity.content.questions.forEach((q, idx) => {
            const studentAnswer = submission.answers?.find(a => 
              a.question_id === q.id || a.question_id === `question_${idx}`
            );

            if (studentAnswer) {
              const answerText = typeof studentAnswer.answer_json === 'string' 
                ? studentAnswer.answer_json 
                : studentAnswer.answer_json?.answer || studentAnswer.answer_json?.text || 'Não respondeu';

              const correctAnswerText = q.correctAnswer || q.correct_answer || q.answer;
              
              questions.push({
                question: q.text || q.question || q.title || 'Questão sem texto',
                studentAnswer: answerText,
                correctAnswer: correctAnswerText,
                isCorrect: (studentAnswer.points_earned || 0) > 0
              });
            }
          });
        }

        return {
          grade: submission.grade,
          maxScore: activity?.max_score || 100,
          subject: subject,
          activityTitle: activity?.title,
          questions: questions.length > 0 ? questions : undefined
        };
      });

      // Preparar dados para a IA
      const performanceSummary = {
        avgGrade: stats.avgGrade,
        totalActivities: stats.totalActivities,
        recentGrades: recentGradesWithDetails,
        classComparison: classComparison.map(c => ({
          subject: c.subject,
          studentAvg: c.studentAvg,
          classAvg: c.classAvg
        }))
      };

      // Debug: verificar se questões estão sendo enviadas
      logger.debug('📊 Performance Summary:', JSON.stringify(performanceSummary, null, 2));
      logger.debug('❓ Total de questões encontradas:', recentGradesWithDetails.reduce((sum, g) => sum + (g.questions?.length || 0), 0));

      // Chamar Edge Function da OpenAI
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        logger.error('Erro ao obter sessão:', sessionError)
        throw new Error('Erro de autenticação');
      }

      logger.debug('Session token:', session?.access_token ? 'Token presente' : 'Token ausente')

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-study-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          studentId: user.id,
          performanceData: performanceSummary
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('Erro da API:', response.status, errorData)
        
        // Verificar se é erro de limite diário
        if (response.status === 429) {
          try {
            const errorJson = JSON.parse(errorData);
            toast({
              title: '⏰ Limite diário atingido',
              description: `${errorJson.message || 'Você já gerou 3 recomendações hoje. Volte amanhã!'}`,
              variant: 'destructive',
              duration: 5000
            });
          } catch {
            toast({
              title: '⏰ Limite diário atingido',
              description: 'Você já gerou 3 recomendações hoje. Volte amanhã!',
              variant: 'destructive',
              duration: 5000
            });
          }
          return;
        }
        
        // Fallback: gerar recomendações básicas localmente
        const fallbackRecommendations = generateFallbackRecommendations(performanceSummary);
        setAiRecommendations(fallbackRecommendations);
        
        toast({
          title: 'Recomendações geradas localmente',
          description: 'Usando análise básica. Configure a API OpenAI para recomendações avançadas.',
        });
        return;
      }

      const data = await response.json();
      setAiRecommendations(data.recommendations || []);
      
      // Atualizar contador de uso
      if (data.usageToday) {
        setUsageToday(data.usageToday);
      }

      // Mostrar contador de uso
      const usageInfo = data.usageToday && data.dailyLimit 
        ? ` (${data.usageToday}/${data.dailyLimit} hoje)` 
        : '';

      toast({
        title: '✅ Recomendações atualizadas!',
        description: `Confira suas sugestões personalizadas de estudo${usageInfo}.`
      });

    } catch (error) {
      logger.error('Erro ao carregar recomendações:', error)
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
        <StatsCard title="Média Geral" value={stats.avgGrade} gradient="from-blue-500 to-cyan-600" delay={0} />
        <StatsCard title="Atividades Concluídas" value={stats.totalActivities} gradient="from-cyan-500 to-blue-700" delay={0.1} />
        <StatsCard title="Taxa de Conclusão" value={`${stats.completionRate}%`} gradient="from-emerald-500 to-cyan-500" format="text" delay={0.2} />
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
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Sugestões de Estudo</h3>
          {studySuggestions.length > 0 ? (
            <div className="space-y-2">
              {studySuggestions.map((suggestion, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100 dark:border-blue-900"
                >
                  <p className="text-sm text-slate-700 dark:text-slate-300">{suggestion.text || suggestion}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">Complete mais atividades para receber sugestões personalizadas.</p>
          )}
        </Card>

        {/* Áreas de Atenção */}
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Áreas de Atenção</h3>
          {attentionAreas.length > 0 ? (
            <div className="space-y-2">
              {attentionAreas.map((area, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-yellow-100 dark:border-yellow-900"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{area.subject || area.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{area.description || area.text}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">✓ Excelente! Não há áreas críticas no momento.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Recomendações com IA */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recomendações Personalizadas com IA</h3>
            <Badge variant={usageToday >= dailyLimit ? "destructive" : "secondary"} className="text-xs">
              {usageToday}/{dailyLimit} hoje
            </Badge>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={loadAIRecommendations}
              disabled={loadingRecommendations || usageToday >= dailyLimit}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50"
            >
              {loadingRecommendations ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Gerando...
                </>
              ) : usageToday >= dailyLimit ? (
                <>
                  ⏰ Limite Atingido
                </>
              ) : (
                <>
                  Gerar Recomendações ✨
                </>
              )}
            </Button>
            {usageToday >= dailyLimit && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Reinicia à meia-noite
              </span>
            )}
          </div>
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
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">{rec.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{rec.description}</p>
                  {rec.reason && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {rec.reason}
                    </Badge>
                  )}
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
