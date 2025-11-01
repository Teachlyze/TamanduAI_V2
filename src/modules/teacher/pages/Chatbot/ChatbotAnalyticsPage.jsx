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

const ChatbotAnalyticsPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [period, setPeriod] = useState('7');
  
  // Mock data
  const [analytics] = useState({
    totalConversations: 145,
    activeStudents: 28,
    satisfaction: 92,
    avgResponseTime: 2.3,
    topQuestions: [
      { question: 'Como resolver questão de equações?', count: 45, activity: 'Exercícios Cap. 3', resolved: true },
      { question: 'O que é função quadrática?', count: 38, activity: 'Introdução', needsAttention: true },
      { question: 'Qual a diferença entre X e Y?', count: 29, activity: 'Teoria', resolved: true }
    ],
    difficultTopics: [
      { topic: 'Equações de 2º grau', questions: 67, satisfaction: 78 },
      { topic: 'Funções trigonométricas', questions: 42, satisfaction: 85 },
      { topic: 'Logaritmos', questions: 35, satisfaction: 91 }
    ],
    recentConversations: [
      { id: '1', student: 'João Silva', question: 'Como calcular derivada?', status: 'resolved', timestamp: '2h atrás' },
      { id: '2', student: 'Maria Santos', question: 'O que é integral?', status: 'resolved', timestamp: '5h atrás' },
      { id: '3', student: 'Pedro Costa', question: 'Dúvida sobre limite', status: 'needs_attention', timestamp: '1 dia atrás' }
    ],
    insights: [
      { type: 'warning', message: '5 alunos fizeram a mesma pergunta sobre "Equações de 2º grau"', suggestion: 'Considere fazer uma revisão' },
      { type: 'info', message: 'Uso aumentou 40% esta semana', detail: 'Proximidade de prova detectada' },
      { type: 'success', message: '3 alunos avaliaram positivamente a explicação sobre "funções"' }
    ]
  });

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);
    } catch (error) {
      console.error('Erro:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard/chatbot')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div className="flex items-center justify-between mb-8">
        <DashboardHeader
          title={`Analytics - ${classData?.name}`}
          subtitle="Análise do uso do chatbot"
          role="teacher"
        />
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            ✅ Ativo
          </Badge>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
      <Card className="p-6 bg-white dark:bg-slate-900 mb-8">
        <h3 className="text-lg font-bold mb-4">💡 Insights Automáticos</h3>
        <div className="space-y-3">
          {analytics.insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border-l-4 ${
                insight.type === 'warning' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' :
                insight.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950/30' :
                'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
              }`}
            >
              <p className="font-semibold text-sm mb-1">{insight.message}</p>
              {insight.suggestion && (
                <p className="text-sm text-slate-600 dark:text-slate-400">💡 {insight.suggestion}</p>
              )}
              {insight.detail && (
                <p className="text-sm text-slate-600 dark:text-slate-400">{insight.detail}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Questions */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <h3 className="text-lg font-bold mb-4">❓ Perguntas Mais Frequentes</h3>
          <div className="space-y-4">
            {analytics.topQuestions.map((q, idx) => (
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
        <Card className="p-6 bg-white dark:bg-slate-900">
          <h3 className="text-lg font-bold mb-4">📚 Tópicos Mais Difíceis</h3>
          <div className="space-y-4">
            {analytics.difficultTopics.map((topic, idx) => (
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

      {/* Recent Conversations */}
      <Card className="p-6 bg-white dark:bg-slate-900 mb-8">
        <h3 className="text-lg font-bold mb-4">💬 Conversas Recentes</h3>
        <div className="space-y-3">
          {analytics.recentConversations.map(conv => (
            <div key={conv.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                  {conv.student[0]}
                </div>
                <div>
                  <div className="font-semibold">{conv.student}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{conv.question}</div>
                  <div className="text-xs text-slate-500">{conv.timestamp}</div>
                </div>
              </div>
              <Badge className={conv.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                {conv.status === 'resolved' ? '✅ Resolvida' : '⚠️ Precisa atenção'}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-6 bg-white dark:bg-slate-900">
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/chatbot/${classId}/config`)}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Treinamento
          </Button>
          <Button
            variant="outline"
            className="flex-1"
          >
            <Pause className="w-4 h-4 mr-2" />
            Pausar Chatbot
          </Button>
          <Button
            variant="outline"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 text-center mt-4">
          💎 Upgrade para PRO: Histórico completo e análise avançada com IA
        </p>
      </Card>
    </div>
  );
};

export default ChatbotAnalyticsPage;
