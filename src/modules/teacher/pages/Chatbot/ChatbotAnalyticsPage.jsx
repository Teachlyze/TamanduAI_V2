import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Users, Star, Clock, Edit, Pause, Download } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  DashboardHeader,
  StatsCard,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { ClassService } from '@/shared/services/classService';
import { exportAnalyticsReportToPDF } from '@/shared/services/exportService';
import { useToast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';

const ChatbotAnalyticsPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [period, setPeriod] = useState('7');
  const [exporting, setExporting] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalConversations: 0,
    activeStudents: 0,
    satisfaction: 0,
    avgResponseTime: 0,
    topQuestions: [],
    difficultTopics: [],
    insights: []
  });

  useEffect(() => {
    loadData();
  }, [classId, period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);

      // Buscar dados reais do chatbot
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));

      // Buscar alunos da turma
      const { data: students } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classId)
        .eq('role', 'student');

      const studentIds = students?.map(s => s.user_id) || [];
      const activeStudents = studentIds.length;

      // Buscar fontes de treinamento
      const { data: sources } = await supabase
        .from('rag_training_sources')
        .select('*')
        .eq('class_id', classId);

      const totalSources = sources?.length || 0;

      // Buscar dados reais de conversas e mensagens
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const { data: conversations } = await supabase
        .from('chatbot_conversations')
        .select('*')
        .eq('class_id', classId)
        .gte('started_at', startDate.toISOString());

      const { data: messages } = await supabase
        .from('chatbot_messages')
        .select('*')
        .eq('class_id', classId)
        .gte('created_at', startDate.toISOString());

      const totalConversations = conversations?.length || 0;
      const totalMessages = messages?.length || 0;

      // Calcular satisfação baseada em feedback
      const messagesWithFeedback = messages?.filter(m => m.was_helpful !== null) || [];
      const helpfulCount = messagesWithFeedback.filter(m => m.was_helpful).length;
      const satisfaction = messagesWithFeedback.length > 0 
        ? Math.round((helpfulCount / messagesWithFeedback.length) * 100) 
        : 0;

      // Calcular tempo médio de resposta
      const messagesWithTime = messages?.filter(m => m.response_time_ms) || [];
      const avgResponseTime = messagesWithTime.length > 0
        ? (messagesWithTime.reduce((sum, m) => sum + m.response_time_ms, 0) / messagesWithTime.length / 1000).toFixed(1)
        : 0;

      // Buscar análise diária processada pela IA
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyAnalysis } = await supabase
        .from('chatbot_daily_analysis')
        .select('frequent_questions, difficult_topics, processed_at')
        .eq('class_id', classId)
        .eq('analysis_date', today)
        .maybeSingle();

      // Se não há análise de hoje, buscar a mais recente
      const { data: latestAnalysis } = !dailyAnalysis ? await supabase
        .from('chatbot_daily_analysis')
        .select('frequent_questions, difficult_topics, processed_at, analysis_date')
        .eq('class_id', classId)
        .order('analysis_date', { ascending: false })
        .limit(1)
        .maybeSingle() : { data: null };

      const analysis = dailyAnalysis || latestAnalysis;

      // Perguntas frequentes processadas pela IA
      const topQuestions = analysis?.frequent_questions?.map(fq => ({
        question: fq.theme,
        count: fq.count,
        activity: fq.activity || 'Geral',
        resolved: true,
        examples: fq.examples
      })) || [];

      // Tópicos difíceis processados pela IA
      const difficultTopics = analysis?.difficult_topics?.map(dt => ({
        topic: dt.topic,
        questions: dt.questions_count,
        satisfaction: 100 - dt.difficulty_score, // Inverter: maior dificuldade = menor satisfação
        reason: dt.reason
      })) || [];

      // Gerar insights baseados em dados reais
      const insights = [];
      
      if (totalSources === 0) {
        insights.push({
          type: 'warning',
          message: 'Nenhuma fonte de treinamento adicionada ao chatbot',
          suggestion: 'Adicione materiais ou atividades para treinar o assistente'
        });
      } else {
        insights.push({
          type: 'success',
          message: `Chatbot treinado com ${totalSources} fonte(s) de conteúdo`
        });
      }

      if (totalConversations > 0) {
        insights.push({
          type: 'info',
          message: `${totalConversations} conversas iniciadas por ${activeStudents} alunos`,
          detail: `Média de ${(totalMessages / totalConversations).toFixed(1)} mensagens por conversa`
        });
      }

      if (satisfaction > 0 && satisfaction < 70) {
        insights.push({
          type: 'warning',
          message: `Taxa de satisfação baixa (${satisfaction}%)`,
          suggestion: 'Revise as fontes de treinamento ou adicione mais conteúdo'
        });
      } else if (satisfaction >= 90) {
        insights.push({
          type: 'success',
          message: `Excelente taxa de satisfação (${satisfaction}%)`
        });
      }

      const outOfScopeCount = messages?.filter(m => m.is_out_of_scope).length || 0;
      if (outOfScopeCount > 0) {
        insights.push({
          type: 'info',
          message: `${outOfScopeCount} perguntas fora do escopo detectadas`,
          detail: 'Alunos podem estar com dúvidas que não estão cobertas nos materiais'
        });
      }

      setAnalytics({
        totalConversations,
        activeStudents,
        satisfaction,
        avgResponseTime,
        topQuestions,
        difficultTopics,
        insights
      });
    } catch (error) {
      logger.error('Erro:', error)
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-6 pb-12">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard/chatbot')}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Title Card with Gradient */}
        <Card className="relative overflow-hidden border-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 opacity-90"></div>
          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Analytics - {classData?.name}
                </h1>
                <p className="text-blue-100">Análise do uso do chatbot</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1">
                  ✅ Ativo
                </Badge>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="px-4 py-2 rounded-lg border-0 bg-white/20 backdrop-blur-sm text-white font-medium focus:ring-2 focus:ring-white/50 focus:outline-none"
                >
                  <option value="7" className="text-slate-900">Últimos 7 dias</option>
                  <option value="30" className="text-slate-900">Últimos 30 dias</option>
                  <option value="90" className="text-slate-900">Últimos 90 dias</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatsCard
            title="Total de Conversas"
            value={analytics.totalConversations}
            icon={MessageSquare}
            gradient="from-blue-500 to-cyan-500"
            delay={0}
          />
          <StatsCard
            title="Alunos Ativos"
            value={analytics.activeStudents}
            icon={Users}
            gradient="from-cyan-500 to-blue-500"
            delay={0.1}
          />
          <StatsCard
            title="Taxa de Satisfação"
            value={`${analytics.satisfaction}%`}
            icon={Star}
            gradient="from-amber-500 to-yellow-500"
            format="text"
            delay={0.2}
          />
          <StatsCard
            title="Tempo Médio Resposta"
            value={`${analytics.avgResponseTime}s`}
            icon={Clock}
            gradient="from-blue-500 to-cyan-500"
            format="text"
            delay={0.3}
          />
        </div>

        {/* Insights */}
        <Card className="p-6 bg-white dark:bg-slate-900 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            Insights Automáticos
          </h3>
          <div className="space-y-3">
            {analytics.insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border-l-4 transition-all hover:shadow-md ${
                  insight.type === 'warning' 
                    ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/10' 
                    : insight.type === 'success' 
                    ? 'border-green-500 bg-gradient-to-r from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-950/10' 
                    : 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/10'
                }`}
              >
                <p className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                  {insight.message}
                </p>
                {insight.suggestion && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-1">
                    <span>💡</span>
                    <span>{insight.suggestion}</span>
                  </p>
                )}
                {insight.detail && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{insight.detail}</p>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Questions */}
          <Card className="p-6 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">❓</span>
              Perguntas Mais Frequentes
            </h3>
            <div className="space-y-4">
            {analytics.topQuestions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Nenhuma conversa registrada ainda. As perguntas aparecerão aqui quando os alunos começarem a usar o chatbot.
              </p>
            ) : analytics.topQuestions.map((q, idx) => (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{idx + 1}. "{q.question}" ({q.count}x)</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      📊 Atividade: {q.activity}
                    </div>
                  </div>
                  <Badge className={q.resolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {q.resolved ? '✅ Resolvida' : '⚠️ Atenção'}
                  </Badge>
                </div>
                {q.needsAttention && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    💡 30% dos alunos pediram mais exemplos - Considere adicionar mais materiais
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

          {/* Difficult Topics */}
          <Card className="p-6 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📚</span>
              Tópicos Mais Difíceis
            </h3>
            <div className="space-y-4">
            {analytics.difficultTopics.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Nenhum tópico analisado ainda. Os dados aparecerão conforme os alunos interagirem com o chatbot.
              </p>
            ) : analytics.difficultTopics.map((topic, idx) => (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{topic.topic}</div>
                  <Badge className={
                    topic.satisfaction >= 90 ? 'bg-green-100 text-green-700' :
                    topic.satisfaction >= 80 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }>
                    {topic.satisfaction}%
                  </Badge>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {topic.questions} perguntas
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      topic.satisfaction >= 90 ? 'bg-green-500' :
                      topic.satisfaction >= 80 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${topic.satisfaction}%` }}
                  />
                </div>
                {topic.satisfaction < 85 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    💡 Considere revisar este conteúdo em aula
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

        {/* Actions */}
        <Card className="p-6 bg-white dark:bg-slate-900 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            ⚙️ Ações Rápidas
          </h3>
          <div className="flex flex-col md:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/chatbot/${classId}/config`)}
              className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-500 transition-all"
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar Treinamento
            </Button>
            <Button
              variant="outline"
              className="flex-1 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-500 transition-all"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pausar Chatbot
            </Button>
            <Button
              variant="outline"
              className="flex-1 hover:bg-green-50 dark:hover:bg-green-950/30 hover:border-green-500 transition-all"
              onClick={async () => {
                try {
                  setExporting(true);
                  exportAnalyticsReportToPDF(classData, analytics);
                  toast({
                    title: '✅ Relatório exportado!',
                    description: 'Download do PDF iniciado.'
                  });
                } catch (error) {
                  logger.error('Erro ao exportar:', error)
                  toast({
                    title: '❌ Erro ao exportar',
                    description: error.message,
                    variant: 'destructive'
                  });
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exportando...' : 'Exportar Relatório'}
            </Button>
          </div>
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-center text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2">
              <span className="text-xl">💎</span>
              <span className="font-medium">Upgrade para PRO:</span>
              <span>Histórico completo e análise avançada com IA</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChatbotAnalyticsPage;
