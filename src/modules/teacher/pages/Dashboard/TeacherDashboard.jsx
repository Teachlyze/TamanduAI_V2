import React, { useState, memo, useCallback, useEffect } from 'react';
import { logger } from '@/shared/utils/logger';

import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import PostActivityModal from '@/modules/teacher/components/PostActivityModal';
import EventDetailsModal from '@/modules/teacher/pages/Calendar/components/EventDetailsModal';
import {
  BookOpen, Users, FileText, Clock, BarChart3, ChevronRight,
  Calendar, CheckCircle2, AlertTriangle, TrendingUp, Video, MapPin,
  Target, Sparkles, Brain, Shield, MessageSquare, Plus, Activity, Send
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { StatsCard, EmptyState } from '@/shared/design';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';
import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Hooks granulares (cada um com cache Redis independente)
import { useDashboardStats } from '@/modules/teacher/hooks/useDashboardStats';
import { useDashboardEvents } from '@/modules/teacher/hooks/useDashboardEvents';
import { useDashboardSubmissions } from '@/modules/teacher/hooks/useDashboardSubmissions';
import { useDashboardAlerts } from '@/modules/teacher/hooks/useDashboardAlerts';
import { useDashboardRecentData } from '@/modules/teacher/hooks/useDashboardRecentData';

// Componente memoizado para ações prioritárias (não re-renderiza se stats não mudar)
const PriorityActions = memo(({ stats }) => {
  const actions = [
    {
      label: 'Corrigir atividades pendentes',
      subtitle: `${stats?.pendingGrading || 0} submissões aguardando`,
      icon: FileText,
      href: '/dashboard/corrections',
      gradient: 'from-amber-500 to-orange-500',
      show: true,
    },
    {
      label: 'Planejar próxima aula',
      subtitle: 'Ver calendário e eventos',
      icon: Calendar,
      href: '/dashboard/calendar',
      gradient: 'from-blue-600 to-cyan-600',
      show: true,
    },
    {
      label: 'Criar nova atividade',
      subtitle: 'Gere conteúdo automaticamente',
      icon: Sparkles,
      href: '/dashboard/activities/create',
      gradient: 'from-purple-600 to-pink-600',
      show: true,
    },
  ].filter(a => a.show);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {actions.map((action, index) => (
        <motion.div key={action.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
          <Link to={action.href}>
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-700 group">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{action.label}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{action.subtitle}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
});
PriorityActions.displayName = 'PriorityActions';

const TeacherDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [eventFilter, setEventFilter] = useState(7);
  const [showPostModal, setShowPostModal] = useState(false);
  const [activityToPost, setActivityToPost] = useState(null);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [upcomingEventsPage, setUpcomingEventsPage] = useState(1);
  const EVENTS_PER_PAGE = 6; // 3 linhas x 2 colunas
  const [recentNotifications, setRecentNotifications] = useState([]);

  // Callbacks para evitar re-renders desnecessários
  const handleEventFilterChange = useCallback((filter) => {
    setEventFilter(filter);
    setUpcomingEventsPage(1);
  }, []);

  const handleEventClick = useCallback((event) => {
    setSelectedEvent(event);
    setShowEventDetailsModal(true);
  }, []);

  const handleStudentClick = useCallback((studentId) => {
    navigate(`/dashboard/students/${studentId}`);
  }, [navigate]);

  // Hooks granulares - cache Redis independente por seção
  const { data: stats, loading: statsLoading, refetch: refetchStats } = useDashboardStats();
  const { data: eventsData, loading: eventsLoading, refetch: refetchEvents } = useDashboardEvents(eventFilter);
  const { data: submissions, loading: submissionsLoading, refetch: refetchSubmissions } = useDashboardSubmissions();
  const { data: alertStudents, loading: alertsLoading } = useDashboardAlerts();
  const { data: recentData, loading: recentLoading } = useDashboardRecentData();

  // Notificações recentes (inclui alertas de plágio / IA)
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.id) {
        setRecentNotifications([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        setRecentNotifications(data || []);
      } catch (error) {
        logger.error('[TeacherDashboard] Error loading notifications for feed:', error);
      }
    };

    loadNotifications();
  }, [user?.id]);

  // Callbacks que dependem dos hooks devem vir depois da declaração
  const handlePostActivitySuccess = useCallback(() => {
    refetchEvents();
    refetchSubmissions();
  }, [refetchEvents, refetchSubmissions]);

  const handleEventDelete = useCallback(() => {
    refetchEvents();
  }, [refetchEvents]);

  // Paginação dos eventos da semana
  const paginatedUpcomingEvents = eventsData?.upcoming?.slice(
    (upcomingEventsPage - 1) * EVENTS_PER_PAGE,
    upcomingEventsPage * EVENTS_PER_PAGE
  );
  const totalPages = Math.ceil(eventsData?.upcoming?.length / EVENTS_PER_PAGE);

  const handlePageChange = useCallback((page) => {
    setUpcomingEventsPage(page);
  }, []);

  const { today: todayEvents = [], upcoming: upcomingEvents = [] } = eventsData || {};
  const { classes: recentClasses = [], activities: recentActivities = [] } = recentData || {};

  const pendingSubmissions = submissions?.submissions || [];
  const weeklySubmissions = submissions?.weeklySubmissions || [];
  const weeklyTotal = submissions?.weeklyTotal || 0;

  const isActivityPublished = (activity) => {
    if (!activity) return false;
    if (activity.is_published) return true;
    if (activity.is_draft === false) return true;
    if (activity.status && activity.status !== 'draft') return true;
    return false;
  };

  // Loading inicial apenas se TODOS os hooks estão carregando
  const isInitialLoading = statsLoading && eventsLoading && submissionsLoading && recentLoading;

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando dashboard..." />
      </div>
    );
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Professor';

  const statsCards = [
    {
      title: 'Total de Turmas',
      value: stats?.totalClasses || 0,
      icon: BookOpen,
      gradient: 'from-blue-600 to-cyan-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      change: `${stats?.totalStudents || 0} alunos`
    },
    {
      title: 'Total de Alunos',
      value: stats?.totalStudents || 0,
      icon: Users,
      gradient: 'from-cyan-500 to-blue-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/30'
    },
    {
      title: 'Média Geral',
      value: stats?.avgGrade || 0,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      change: (stats?.avgGrade || 0) >= 7 ? 'Excelente' : 'Pode melhorar'
    },
    {
      title: 'Aguardando Correção',
      value: stats?.pendingGrading || 0,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      change: `${stats?.todayCorrections || 0} hoje`
    }
  ];

  // Construir feed cronológico unificado (submissões, prazos, plágio/IA)
  const plagiarismNotifications = (recentNotifications || []).filter(
    (n) => n.type === 'plagiarism_alert' || n.type === 'ai_detection'
  );

  const feedItems = [];

  // Submissões recentes (já pendentes de correção)
  pendingSubmissions.forEach((sub) => {
    if (sub.submitted_at) {
      feedItems.push({
        id: `submission-${sub.id}`,
        kind: 'submission',
        timestamp: new Date(sub.submitted_at),
        sub,
      });
    }
  });

  // Prazos de atividades (eventos de calendário do tipo deadline)
  [...todayEvents, ...upcomingEvents].forEach((event) => {
    if (event.type === 'deadline' && event.start_time) {
      feedItems.push({
        id: `deadline-${event.id}`,
        kind: 'deadline',
        timestamp: new Date(event.start_time),
        event,
      });
    }
  });

  // Notificações de plágio / detecção de IA
  plagiarismNotifications.forEach((notification) => {
    if (notification.created_at) {
      feedItems.push({
        id: `notification-${notification.id}`,
        kind: notification.type === 'ai_detection' ? 'ai_detection' : 'plagiarism',
        timestamp: new Date(notification.created_at),
        notification,
      });
    }
  });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const filteredFeedItems = feedItems.filter((item) => {
    if (!item.timestamp) return false;
    return item.timestamp >= sevenDaysAgo && item.timestamp <= sevenDaysAhead;
  });

  filteredFeedItems.sort((a, b) => b.timestamp - a.timestamp);

  const limitedFeedItems = filteredFeedItems.slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      {/* Header personalizado com nova identidade visual */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Olá, {firstName}</h1>
              <p className="text-blue-100 mt-1">Vamos reduzir seu trabalho extraclasse hoje</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{stats?.totalClasses || 0} turmas</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{stats?.totalStudents || 0} alunos</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{stats?.pendingGrading || 0} correções</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Ações prioritárias */}
      <PriorityActions stats={stats} />

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            gradient={stat.gradient}
            bgColor={stat.bgColor}
            change={stat.change}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Seção "HOJE" - Agenda + Submissões pendentes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <Target className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Hoje</h2>
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {format(new Date(), "EEEE, d MMMM", { locale: ptBR })}
          </Badge>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agenda de Hoje */}
          <Card className="p-6 border-2 border-blue-100 dark:border-blue-800/30 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Agenda de Hoje</h3>
              </div>
              <Link to="/dashboard/calendar">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                  Ver Calendário
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {todayEvents.length > 0 ? (
                todayEvents.map((event, index) => {
                  const isMeeting = event.type === 'meeting';
                  const isActivity = event.type === 'activity';
                  const isDeadline = event.type === 'deadline';
                  const EventIcon = isMeeting ? Video : isActivity ? FileText : isDeadline ? AlertTriangle : Calendar;

                  // Cores da borda esquerda por tipo
                  const borderColors = {
                    meeting: 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20',
                    activity: 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20',
                    deadline: 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
                    event: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                  };

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleEventClick(event)}
                      className={`p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 cursor-pointer transition-all border-l-4 ${borderColors[event.type] || borderColors.event}`}
                    >
                      {/* Header Principal - CONTEXTO */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`p-3 rounded-lg ${isMeeting ? 'bg-purple-100' : isActivity ? 'bg-orange-100' : isDeadline ? 'bg-red-100' : 'bg-blue-100'}`}>
                          <EventIcon className={`w-6 h-6 ${isMeeting ? 'text-purple-600' : isActivity ? 'text-orange-600' : isDeadline ? 'text-red-600' : 'text-blue-600'}`} />
                        </div>
                        <div className="flex-1">
                          {/* TÍTULO PRINCIPAL - CONTEXTO DA TURMA/ATIVIDADE */}
                          {event.class_name ? (
                            <div className="mb-2">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                                {event.class_name}
                                {event.class_subject && (
                                  <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-medium">
                                    {event.class_subject}
                                  </span>
                                )}
                              </h3>
                            </div>
                          ) : (
                            <div className="mb-2">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-gray-600" />
                                Evento Geral
                              </h3>
                            </div>
                          )}

                          {/* SUBTÍTULO - O QUE É */}
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            {event.title}
                          </h4>

                          {/* CONTEXTO DA ATIVIDADE (SE HOUVER) */}
                          {event.activity_title && (
                            <div className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 mb-2">
                              <FileText className="w-4 h-4 text-orange-600" />
                              <span className="font-medium text-gray-700 dark:text-gray-300">{event.activity_title}</span>
                              {event.activity_type && (
                                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded font-medium">
                                  {event.activity_type}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer - DATA E HORA */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(event.start_time), "HH:mm")}</span>
                          {event.end_time && (
                            <span>- {format(new Date(event.end_time), "HH:mm")}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(event.start_time), "dd/MM", { locale: ptBR })}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <EmptyState icon={Calendar} title="Nenhum evento hoje" description="Sua agenda está livre hoje." />
              )}
            </div>
          </Card>

          {/* Submissões Pendentes */}
          <Card className="p-6 border-2 border-amber-100 dark:border-amber-800/30 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Correções Pendentes</h3>
              </div>
              <Link to="/dashboard/corrections">
                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700">
                  Ver Todas
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {pendingSubmissions.length > 0 ? (
                pendingSubmissions.slice(0, 5).map((sub, index) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
                        {sub.student_name?.[0] || 'A'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{sub.student_name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{sub.activity_title}</p>
                      </div>
                    </div>
                    <Link to={`/dashboard/grading/${sub.id}`}>
                      <Button size="sm" className="bg-gradient-to-r from-amber-600 to-orange-600">Corrigir</Button>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <EmptyState icon={CheckCircle2} title="Nenhuma correção pendente!" description="Parabéns! Você está em dia " />
              )}
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Seção "ESTA SEMANA" - Próximos eventos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Esta Semana</h2>
        </div>
        <Card className="p-6 border-2 border-indigo-100 dark:border-indigo-800/30 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Próximos Eventos</h3>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={eventFilter === 1 ? 'default' : 'outline'}
                onClick={() => handleEventFilterChange(1)}
              >
                Hoje
              </Button>
              <Button
                size="sm"
                variant={eventFilter === 3 ? 'default' : 'outline'}
                onClick={() => handleEventFilterChange(3)}
              >
                3 dias
              </Button>
              <Button
                size="sm"
                variant={eventFilter === 7 ? 'default' : 'outline'}
                onClick={() => handleEventFilterChange(7)}
              >
                7 dias
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate('/dashboard/calendar')}>
                Ver Todos
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paginatedUpcomingEvents?.length > 0 ? (
              paginatedUpcomingEvents.map((event, index) => {
                const isMeeting = event.type === 'meeting';
                const isActivity = event.type === 'activity';
                const isDeadline = event.type === 'deadline';
                const EventIcon = isMeeting ? Video : isActivity ? FileText : isDeadline ? AlertTriangle : Calendar;

                // Cores da borda esquerda por tipo
                const borderColors = {
                  meeting: 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20',
                  activity: 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20',
                  deadline: 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
                  event: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                };

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleEventClick(event)}
                    className={`p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-400 cursor-pointer transition-all border-l-4 ${borderColors[event.type] || borderColors.event}`}
                  >
                    {/* Header Compacto - CONTEXTO */}
                    <div className="flex items-start gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${isMeeting ? 'bg-purple-100' : isActivity ? 'bg-orange-100' : isDeadline ? 'bg-red-100' : 'bg-blue-100'}`}>
                        <EventIcon className={`w-4 h-4 ${isMeeting ? 'text-purple-600' : isActivity ? 'text-orange-600' : isDeadline ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* TÍTULO PRINCIPAL - CONTEXTO DA TURMA */}
                        {event.class_name ? (
                          <div className="mb-1">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1 truncate">
                              <BookOpen className="w-3 h-3 text-blue-600 flex-shrink-0" />
                              <span className="truncate">{event.class_name}</span>
                              {event.class_subject && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded font-medium flex-shrink-0">
                                  {event.class_subject}
                                </span>
                              )}
                            </h3>
                          </div>
                        ) : (
                          <div className="mb-1">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-600" />
                              Evento Geral
                            </h3>
                          </div>
                        )}

                        {/* SUBTÍTULO - O QUE É */}
                        <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1 truncate">
                          {event.title}
                        </h4>

                        {/* CONTEXTO DA ATIVIDADE (SE HOUVER) */}
                        {event.activity_title && (
                          <div className="flex items-center gap-1 text-xs bg-white dark:bg-gray-800 p-1 rounded border border-gray-200 dark:border-gray-700 mb-1">
                            <FileText className="w-3 h-3 text-orange-600 flex-shrink-0" />
                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{event.activity_title}</span>
                            {event.activity_type && (
                              <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1 py-0.5 rounded font-medium flex-shrink-0">
                                {event.activity_type}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Compacto - DATA E HORA */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                        <Clock className="w-3 h-3" />
                        <span>{format(new Date(event.start_time), "HH:mm")}</span>
                        {event.end_time && (
                          <span>- {format(new Date(event.end_time), "HH:mm")}</span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs px-1 py-0.5">
                        {format(new Date(event.start_time), "dd/MM", { locale: ptBR })}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-2">
                <EmptyState icon={Calendar} title="Nenhum evento próximo" description="Seus próximos eventos aparecerão aqui." />
              </div>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {((upcomingEventsPage - 1) * EVENTS_PER_PAGE) + 1}-{Math.min(upcomingEventsPage * EVENTS_PER_PAGE, upcomingEvents?.length || 0)} de {upcomingEvents?.length || 0} eventos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(upcomingEventsPage - 1)}
                  disabled={upcomingEventsPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      size="sm"
                      variant={upcomingEventsPage === page ? 'default' : 'outline'}
                      onClick={() => handlePageChange(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(upcomingEventsPage + 1)}
                  disabled={upcomingEventsPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Alunos em Risco */}
      {alertStudents && alertStudents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Alunos em Risco</h2>
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              {alertStudents.length} alunos
            </Badge>
          </div>
          <Card className="p-6 border-2 border-red-100 dark:border-red-800/30 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Alunos que Precisam de Atenção</h3>
              </div>
              <Link to="/dashboard/students">
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                  Ver Todos
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alertStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold">
                    {student.name?.[0] || 'A'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{student.name}</h4>
                    <Badge className="bg-red-100 text-red-700 text-xs mt-1">Média: {student.avgGrade.toFixed(1)}</Badge>
                  </div>
                  <Button size="sm" onClick={() => handleStudentClick(student.id)}>Ver Detalhes</Button>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Feed cronológico de atividades recentes (submissões, prazos, alertas) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Feed de Atividades e Alertas</h2>
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            Beta
          </Badge>
        </div>

        <Card className="p-6 border-2 border-blue-100 dark:border-blue-800/30 shadow-lg">
          {limitedFeedItems.length > 0 ? (
            <div className="space-y-3">
              {limitedFeedItems.map((item, index) => {
                if (item.kind === 'submission') {
                  const sub = item.sub;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                          {sub.student_name?.[0] || 'A'}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            {sub.student_name} enviou{' '}
                            <span className="font-semibold">"{sub.activity_title}"</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.timestamp
                              ? formatDistanceToNow(item.timestamp, {
                                  locale: ptBR,
                                  addSuffix: true,
                                })
                              : ''}
                          </p>
                        </div>
                      </div>
                      <Link to={`/dashboard/grading/${sub.id}`}>
                        <Button size="sm" variant="outline">
                          Corrigir
                        </Button>
                      </Link>
                    </motion.div>
                  );
                }

                if (item.kind === 'deadline') {
                  const event = item.event;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-800 cursor-pointer"
                      onClick={() => navigate('/dashboard/calendar')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            Prazo da atividade{' '}
                            <span className="font-semibold">"{event.activity_title || event.title}"</span>
                            {event.class_name && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{' '}• Turma {event.class_name}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.timestamp
                              ? formatDistanceToNow(item.timestamp, {
                                  locale: ptBR,
                                  addSuffix: true,
                                })
                              : ''}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Ver calendário
                      </Button>
                    </motion.div>
                  );
                }

                const notification = item.notification;
                const data = notification?.data || notification?.metadata || {};
                const submissionId = data.submissionId || data.submission_id;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-red-100 dark:border-red-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-300" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {notification.title || (item.kind === 'ai_detection' ? 'Conteúdo gerado por IA detectado' : 'Plágio detectado')}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {item.timestamp
                            ? formatDistanceToNow(item.timestamp, {
                                locale: ptBR,
                                addSuffix: true,
                              })
                            : ''}
                        </p>
                      </div>
                    </div>
                    <Link to={submissionId ? `/dashboard/grading/${submissionId}` : '/dashboard/corrections'}>
                      <Button size="sm" variant="outline">
                        Ver detalhes
                      </Button>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="Nenhuma atividade recente"
              description="Novas submissões, prazos e alertas aparecerão aqui em ordem cronológica."
            />
          )}
        </Card>
      </motion.div>

      {/* Turmas e Atividades Recentes - Layout 3 colunas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-4"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Visão Geral</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Turmas Recentes */}
          <Card className="p-6 border-2 border-green-100 dark:border-green-800/30 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Turmas Recentes</h3>
              </div>
              <Link to="/dashboard/classes">
                <Button variant="ghost" size="sm">Ver Todas</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentClasses.length > 0 ? (
                recentClasses.slice(0, 3).map((cls, index) => (
                  <Link key={cls.id} to={`/dashboard/classes/${cls.id}`}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${cls.color || 'from-blue-500 to-indigo-500'} flex items-center justify-center text-white font-bold`}>
                          {cls.name?.[0] || 'T'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{cls.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{cls.subject} • {cls.student_count} alunos</p>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))
              ) : (
                <EmptyState icon={BookOpen} title="Nenhuma turma encontrada" description="Crie sua primeira turma para começar." />
              )}
            </div>
          </Card>

          {/* Atividades Recentes */}
          <Card className="p-6 border-2 border-purple-100 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Atividades Recentes</h3>
              </div>
              <Link to="/dashboard/activities">
                <Button variant="ghost" size="sm">Ver Todas</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 3).map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex-1">{activity.title}</h4>
                      <Badge variant={isActivityPublished(activity) ? 'default' : 'secondary'} className="ml-2">
                        {isActivityPublished(activity) ? 'Postada' : 'Rascunho'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{activity.class_name}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={new Date(activity.due_date) < new Date() ? 'destructive' : 'default'} className="text-xs">
                          {new Date(activity.due_date) < new Date() ? 'Encerrada' : 'Aberta'}
                        </Badge>
                        {activity.submission_count !== undefined && (
                          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {activity.submission_count} {activity.submission_count === 1 ? 'submissão' : 'submissões'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(activity.due_date), 'dd/MM', { locale: ptBR })}
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <EmptyState icon={FileText} title="Nenhuma atividade" description="Suas atividades aparecerão aqui." />
              )}
            </div>
          </Card>

          {/* Atividades para Postar */}
          <Card className="p-6 border-2 border-orange-100 dark:border-orange-800/30 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Para Postar</h3>
              </div>
              <Link to="/dashboard/activities?filter=drafts">
                <Button variant="ghost" size="sm">Ver Todas</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {recentActivities.filter(a => !isActivityPublished(a)).length > 0 ? (
                recentActivities.filter(a => !isActivityPublished(a)).slice(0, 3).map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex-1">{activity.title}</h4>
                      <Badge variant="secondary" className="ml-2">
                        Rascunho
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{activity.class_name}</p>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setActivityToPost(activity);
                        setShowPostModal(true);
                      }}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Postar Agora
                    </Button>
                  </motion.div>
                ))
              ) : (
                <EmptyState icon={Clock} title="Nenhum rascunho" description="Atividades não postadas aparecerão aqui." />
              )}
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Performance Insights - Novo conteúdo abaixo do layout 3 colunas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-2"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Insights</h2>
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Últimos 7 dias
          </Badge>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Atividade Semanal */}
          <Card className="p-6 border-2 border-emerald-100 dark:border-emerald-800/30 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Atividade da Semana</h3>
              </div>
              <Link to="/dashboard/analytics">
                <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
                  Ver Analytics
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {/* Gráfico Simples de Barras */}
              <div className="space-y-3">
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, index) => {
                  // Dados reais de submissões por dia da semana
                  const values = weeklySubmissions.length === 7 ? weeklySubmissions : [0, 0, 0, 0, 0, 0, 0];
                  const maxValue = Math.max(...values, 1);
                  const percentage = (values[index] / maxValue) * 100;
                  
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <div className="w-8 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {day}
                      </div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-end pr-2"
                        >
                          <span className="text-xs text-white font-medium">{values[index]}</span>
                        </motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total de submissões</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {weeklyTotal || 0} {weeklyTotal === 1 ? 'submissão' : 'submissões'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Top Turmas */}
          <Card className="p-6 border-2 border-purple-100 dark:border-purple-800/30 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Turmas em Destaque</h3>
              </div>
              <Link to="/dashboard/classes">
                <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
                  Ver Todas
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {(recentClasses?.slice(0, 4) || []).length > 0 ? (
                recentClasses.slice(0, 4).map((turma, index) => (
                  <motion.div
                    key={turma.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${turma.color || 'from-purple-500 to-pink-500'} flex items-center justify-center text-white font-bold`}>
                      {turma.name?.[0] || 'T'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{turma.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          {turma.student_count} {turma.student_count === 1 ? 'aluno' : 'alunos'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {turma.subject}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </motion.div>
                ))
              ) : (
                <EmptyState icon={TrendingUp} title="Nenhuma turma" description="Crie turmas para ver estatísticas." />
              )}
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Modais */}
      <PostActivityModal
        open={showPostModal}
        onClose={() => { setShowPostModal(false); setActivityToPost(null); }}
        activity={activityToPost}
        onSuccess={handlePostActivitySuccess}
      />

      {showEventDetailsModal && selectedEvent && (
        <EventDetailsModal
          isOpen={showEventDetailsModal}
          onClose={() => { setShowEventDetailsModal(false); setSelectedEvent(null); }}
          event={selectedEvent}
          onEdit={() => navigate('/dashboard/calendar')}
          onDelete={handleEventDelete}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;