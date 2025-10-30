import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, MessageSquare, Users, Star, Settings, BarChart3, Pause, Play } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  DashboardHeader,
  StatsCard,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const TeacherChatbotPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    activeBots: 0,
    totalConversations: 0,
    studentsServed: 0,
    avgSatisfaction: 0
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id, name, subject, color')
        .eq('created_by', user.id)
        .eq('is_active', true);

      // Mock chatbot configs
      const classesWithBots = (teacherClasses || []).map((cls, idx) => ({
        ...cls,
        chatbot: {
          status: idx === 0 ? 'active' : idx === 1 ? 'paused' : 'not_configured',
          activitiesTrained: idx === 0 ? 8 : idx === 1 ? 5 : 0,
          conversations: idx === 0 ? 145 : idx === 1 ? 67 : 0,
          satisfaction: idx === 0 ? 92 : idx === 1 ? 88 : 0
        }
      }));

      setClasses(classesWithBots);

      // Calculate stats
      const activeBots = classesWithBots.filter(c => c.chatbot.status === 'active').length;
      const totalConv = classesWithBots.reduce((sum, c) => sum + c.chatbot.conversations, 0);
      
      setStats({
        activeBots,
        totalConversations: totalConv,
        studentsServed: Math.floor(totalConv * 0.6),
        avgSatisfaction: activeBots > 0 ? 90 : 0
      });

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      active: { label: 'Ativo', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
      paused: { label: 'Pausado', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
      not_configured: { label: 'Não Configurado', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400' }
    };
    return config[status] || config.not_configured;
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
      <DashboardHeader
        title="Assistente IA para Turmas"
        subtitle="Configure chatbots inteligentes para auxiliar seus alunos"
        role="teacher"
        gradient="from-blue-500 via-cyan-500 to-blue-600"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Chatbots Ativos"
          value={stats.activeBots}
          icon={Bot}
          gradient="from-blue-500 to-cyan-500"
          delay={0}
        />
        <StatsCard
          title="Conversas (30 dias)"
          value={stats.totalConversations}
          icon={MessageSquare}
          gradient="from-cyan-500 to-blue-500"
          delay={0.1}
        />
        <StatsCard
          title="Alunos Atendidos"
          value={stats.studentsServed}
          icon={Users}
          gradient="from-rose-500 to-orange-500"
          delay={0.2}
        />
        <StatsCard
          title="Satisfação Média"
          value={`${stats.avgSatisfaction}%`}
          icon={Star}
          gradient="from-amber-500 to-yellow-500"
          format="text"
          delay={0.3}
        />
      </div>

      {/* Help Section */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 mb-8">
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">❓ Como funciona o chatbot?</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
          Configure um assistente IA para cada turma. O chatbot aprende com as atividades e materiais que você seleciona, 
          e ajuda os alunos a tirarem dúvidas 24/7.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-blue-700">📖 Documentação</Button>
          <Button variant="outline" size="sm" className="text-blue-700">🎥 Ver Tutorial</Button>
        </div>
      </Card>

      {/* Classes Grid */}
      {classes.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {classes.map((cls, index) => {
            const statusConfig = getStatusBadge(cls.chatbot.status);
            
            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                        {cls.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {cls.subject || 'Sem matéria'}
                      </p>
                    </div>
                    <Badge className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Stats */}
                  {cls.chatbot.status !== 'not_configured' && (
                    <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {cls.chatbot.activitiesTrained}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Atividades</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                          {cls.chatbot.conversations}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Conversas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                          {cls.chatbot.satisfaction}%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Satisfação</div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {cls.chatbot.status === 'not_configured' ? (
                      <Button
                        onClick={() => navigate(`/teacher/chatbot/${cls.id}/config`)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/teacher/chatbot/${cls.id}/config`)}
                          className="flex-1"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/teacher/chatbot/${cls.id}/analytics`)}
                          className="flex-1"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Analytics
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className={cls.chatbot.status === 'active' ? 'text-amber-600' : 'text-green-600'}
                        >
                          {cls.chatbot.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          icon={Bot}
          title="Nenhuma turma encontrada"
          description="Crie uma turma para configurar seu primeiro chatbot IA"
          actionLabel="Criar Turma"
          actionIcon={Settings}
          action={() => navigate('/teacher/classes/new')}
        />
      )}
    </div>
  );
};

export default TeacherChatbotPage;
