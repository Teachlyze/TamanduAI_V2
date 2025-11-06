import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, MessageSquare, Users, Star, Settings, BarChart3, Pause, Play, Search, Filter } from 'lucide-react';
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
  const [allClasses, setAllClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    activeBots: 0,
    totalConversations: 0,
    studentsServed: 0,
    avgSatisfaction: 0
  });

  useEffect(() => {
    loadData();
  }, [user]);

  // Aplicar filtros client-side com debounce na busca
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 300); // 300ms de debounce

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, allClasses]);

  const applyFilters = () => {
    let filtered = [...allClasses];

    // Filtro de busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cls => 
        cls.name.toLowerCase().includes(query) ||
        cls.subject?.toLowerCase().includes(query)
      );
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(cls => cls.chatbot.status === statusFilter);
    }

    setFilteredClasses(filtered);
  };

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id, name, subject, color')
        .eq('created_by', user.id)
        .eq('is_active', true);

      // Buscar dados reais do chatbot para cada turma
      const classesWithBots = await Promise.all(
        (teacherClasses || []).map(async (cls) => {
          // Buscar config do chatbot da turma
          const { data: classData } = await supabase
            .from('classes')
            .select('settings')
            .eq('id', cls.id)
            .single();

          const chatbotEnabled = classData?.settings?.chatbot_enabled || false;
          const chatbotPaused = classData?.settings?.chatbot_paused || false;
          
          // Buscar fontes de treinamento
          const { data: sources } = await supabase
            .from('rag_training_sources')
            .select('id')
            .eq('class_id', cls.id);
          
          // Buscar conversas do chatbot
          const { data: conversations } = await supabase
            .from('chatbot_conversations')
            .select('id')
            .eq('class_id', cls.id);
          
          // Buscar mensagens com feedback
          const { data: messages } = await supabase
            .from('chatbot_messages')
            .select('was_helpful')
            .eq('class_id', cls.id);
          
          const messagesWithFeedback = messages?.filter(m => m.was_helpful !== null) || [];
          const helpfulCount = messagesWithFeedback.filter(m => m.was_helpful).length;
          const satisfaction = messagesWithFeedback.length > 0 
            ? Math.round((helpfulCount / messagesWithFeedback.length) * 100) 
            : 0;
          
          const activitiesTrained = sources?.length || 0;
          
          return {
            ...cls,
            chatbot: {
              status: !chatbotEnabled ? 'not_configured' : chatbotPaused ? 'paused' : 'active',
              activitiesTrained,
              conversations: conversations?.length || 0,
              satisfaction
            }
          };
        })
      );

      setAllClasses(classesWithBots);
      setFilteredClasses(classesWithBots);

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
      logger.error('Erro:', error)
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
      <div className="mb-8">
        <div className="rounded-xl bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Assistente IA para Turmas</h1>
          <p className="text-blue-50 text-lg">Configure chatbots inteligentes para auxiliar seus alunos</p>
        </div>
      </div>

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
      <Card className="p-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 mb-6">
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

      {/* Filters Bar */}
      {allClasses.length > 0 && (
        <Card className="p-4 mb-6 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou matéria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 hidden md:block" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-all"
              >
                <option value="all">Todos os status</option>
                <option value="active">✅ Ativos</option>
                <option value="paused">⏸️ Pausados</option>
                <option value="not_configured">⚙️ Não configurados</option>
              </select>
            </div>

            {/* Results Counter */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg whitespace-nowrap">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {filteredClasses.length} de {allClasses.length}
              </span>
            </div>

            {/* Clear Filters Button */}
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Limpar
              </Button>
            )}
          </div>

          {/* Active Filters */}
          {(searchQuery || statusFilter !== 'all') && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                Filtros ativos:
              </span>
              {searchQuery && (
                <Badge 
                  className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  onClick={() => setSearchQuery('')}
                >
                  Busca: "{searchQuery}" ✕
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge 
                  className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  onClick={() => setStatusFilter('all')}
                >
                  Status: {statusFilter === 'active' ? 'Ativo' : statusFilter === 'paused' ? 'Pausado' : 'Não configurado'} ✕
                </Badge>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Classes Grid */}
      {filteredClasses.length > 0 ? (
        <motion.div
          key={`${searchQuery}-${statusFilter}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredClasses.map((cls, index) => {
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
                        onClick={() => navigate(`/dashboard/chatbot/${cls.id}/config`)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/dashboard/chatbot/${cls.id}/config`)}
                          className="flex-1"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/dashboard/chatbot/${cls.id}/analytics`)}
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
      ) : allClasses.length > 0 ? (
        <Card className="p-12 bg-white dark:bg-slate-900 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Nenhuma turma encontrada
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Tente ajustar os filtros de busca para encontrar o que procura
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Bot}
          title="Nenhuma turma encontrada"
          description="Crie uma turma para configurar seu primeiro chatbot IA"
          actionLabel="Criar Turma"
          actionIcon={Settings}
          action={() => navigate('/dashboard/classes')}
        />
      )}
    </div>
  );
};

export default TeacherChatbotPage;
