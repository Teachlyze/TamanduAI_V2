import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  FileText,
  CheckCircle2,
  Clock,
  BarChart3,
  Trophy,
  Calendar,
  ChevronRight,
  AlertCircle,
  Info,
  TrendingUp,
  Snowflake,
  ThermometerSnowflake,
  Video,
  Star,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useAuth } from '@/shared/hooks/useAuth';
import { useStudentDashboardData } from '@/modules/student/hooks/useStudentDashboardData';
import { useStudentDashboardEvents } from '@/modules/student/hooks/useStudentDashboardEvents';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [eventsDaysRange, setEventsDaysRange] = useState(3); // 3 ou 7 dias

  const {
    data: dashboardData,
    loading: dashboardLoading,
  } = useStudentDashboardData();

  const {
    data: cachedEvents,
    loading: eventsLoading,
    refetch: refetchEvents,
  } = useStudentDashboardEvents(eventsDaysRange);

  const loading = dashboardLoading || eventsLoading;

  const stats = dashboardData?.stats || {
    totalClasses: 0,
    activeActivities: 0,
    completedActivities: 0,
    upcomingDeadlines: 0,
    completionRate: 0,
    avgGrade: 0,
  };

  const myClasses = dashboardData?.myClasses || [];
  const pendingActivities = dashboardData?.pendingActivities || [];
  const recentGrades = dashboardData?.recentGrades || [];
  const upcomingDeadlines = dashboardData?.upcomingDeadlines || [];
  const alerts = dashboardData?.alerts || [];
  const classPerformance = dashboardData?.classPerformance || [];
  const events = cachedEvents || [];

  const statsCards = [
    { title: 'Minhas Turmas', value: stats.totalClasses, icon: BookOpen, gradient: 'from-sky-500 to-blue-600' },
    { title: 'Atividades Ativas', value: stats.activeActivities, icon: FileText, gradient: 'from-blue-600 to-slate-600' },
    { title: 'Atividades Concluídas', value: stats.completedActivities, icon: CheckCircle2, gradient: 'from-cyan-500 to-blue-500' },
    { title: 'Prazos Próximos (48h)', value: stats.upcomingDeadlines, icon: Clock, gradient: 'from-slate-500 to-slate-700' },
    { title: 'Taxa de Conclusão', value: `${stats.completionRate}%`, icon: BarChart3, gradient: 'from-emerald-500 to-cyan-500' },
    { title: 'Nota Média', value: stats.avgGrade.toFixed(1), icon: Trophy, gradient: 'from-blue-500 to-indigo-500' }
  ];

  const getPriorityBadge = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const hoursLeft = (due - now) / (1000 * 60 * 60);

    if (hoursLeft < 24) return { label: 'Urgente', variant: 'destructive' };
    if (hoursLeft < 48) return { label: 'Em breve', variant: 'warning' };
    return { label: 'Normal', variant: 'default' };
  };

  const getGradeColor = (grade) => {
    if (grade >= 8) return 'text-green-600 dark:text-green-400';
    if (grade >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6">
      {/* Skip to main content - Acessibilidade WCAG 2.2 */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Pular para o conteúdo principal
      </a>

      {/* Header Animado */}
      <header 
        className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-slate-600 to-slate-800 dark:from-slate-800 dark:via-slate-900 dark:to-blue-900 p-6 md:p-8 text-white shadow-lg"
        role="banner"
      >
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" aria-hidden="true" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Meu Dashboard
          </h1>
          <p className="text-cyan-100 dark:text-cyan-200 text-sm md:text-base">
            Acompanhe seu progresso, atividades e desempenho acadêmico
          </p>
        </motion.div>

        <ThermometerSnowflake className="absolute top-6 right-6 w-16 h-16 text-white/20" />
        <Snowflake className="absolute bottom-6 left-8 w-12 h-12 text-white/15" />
      </header>

      {/* Stats Cards - Main Content */}
      <main id="main-content" role="main" aria-label="Estatísticas do estudante">
        <section aria-labelledby="stats-heading" className="mb-8">
          <h2 id="stats-heading" className="sr-only">Estatísticas gerais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {statsCards.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <motion.article
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  aria-label={`${stat.title}: ${stat.value}`}
                >
                  <Card className="p-4 md:p-6 hover:shadow-xl transition-all duration-200 bg-white dark:bg-slate-900 border-2 border-transparent hover:border-cyan-200 dark:hover:border-cyan-800 focus-within:ring-2 focus-within:ring-cyan-400 focus-within:ring-offset-2">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <div 
                        className={`p-2 md:p-3 rounded-xl bg-gradient-to-r ${stat.gradient} shadow-md`}
                        aria-hidden="true"
                      >
                        <IconComponent className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-1">
                      {stat.value}
                    </p>
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium">
                      {stat.title}
                    </p>
                  </Card>
                </motion.article>
              );
            })}
          </div>
        </section>

        {classPerformance.length > 0 && (
          <Card className="p-6 mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Desempenho por Turma
              </h2>
              <Badge variant="secondary" className="whitespace-nowrap">
                Média por turma (%)
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={classPerformance} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} stroke="#64748B" />
                <YAxis type="category" dataKey="className" width={140} stroke="#64748B" />
                <Tooltip 
                  formatter={(value) => `${value}%`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                />
                <Bar dataKey="average" radius={[0, 12, 12, 0]}>
                  {classPerformance.map((item) => (
                    <Cell key={item.classId} fill={item.classColor || '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

      {/* Eventos próximos (3/7 dias) - APRIMORADO */}
      <Card className="p-6 mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Agenda Curta
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant={eventsDaysRange === 3 ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEventsDaysRange(3)}
              className="whitespace-nowrap"
            >
              3 dias
            </Button>
            <Button
              variant={eventsDaysRange === 7 ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEventsDaysRange(7)}
              className="whitespace-nowrap"
            >
              7 dias
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum evento nos próximos {eventsDaysRange} dias</p>
            </div>
          ) : (
            events.map((ev, idx) => {
              const eventDate = new Date(ev.start);
              const dayMonth = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
              const time = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              
              // Definir cor e ícone por tipo
              const typeConfig = {
                prazo: { 
                  badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                  icon: AlertTriangle,
                  bgColor: 'bg-blue-50 dark:bg-blue-950/30',
                  borderColor: 'border-blue-200 dark:border-blue-800'
                },
                reunião: { 
                  badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
                  icon: Video,
                  bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
                  borderColor: 'border-cyan-200 dark:border-cyan-800'
                },
                aula: { 
                  badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                  icon: BookOpen,
                  bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
                  borderColor: 'border-emerald-200 dark:border-emerald-800'
                },
                prova: { 
                  badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
                  icon: Star,
                  bgColor: 'bg-red-50 dark:bg-red-950/30',
                  borderColor: 'border-red-200 dark:border-red-800'
                },
                evento: { 
                  badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                  icon: Calendar,
                  bgColor: 'bg-slate-50 dark:bg-slate-900/50',
                  borderColor: 'border-slate-200 dark:border-slate-700'
                }
              };
              
              const config = typeConfig[ev.type] || typeConfig.evento;
              const EventIcon = config.icon;
              
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-lg border-2 ${config.borderColor} ${config.bgColor} hover:shadow-lg transition-all`}
                >
                  <div className="flex items-start gap-4">
                    {/* Data em destaque */}
                    <div className="flex-shrink-0 text-center">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex flex-col items-center justify-center text-white shadow-md">
                        <span className="text-xs font-semibold uppercase">{dayMonth.split(' ')[1]}</span>
                        <span className="text-xl font-bold">{dayMonth.split(' ')[0]}</span>
                      </div>
                    </div>
                    
                    {/* Informações do evento */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                          {ev.title}
                        </h3>
                        <Badge className={`${config.badge} flex-shrink-0 text-xs px-2 py-1`}>
                          <EventIcon className="w-3 h-3 mr-1" />
                          {ev.type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {time}
                        </span>
                        {ev.className && (
                          <span className="flex items-center gap-1 truncate">
                            <BookOpen className="w-3 h-3" />
                            {ev.className}
                          </span>
                        )}
                      </div>
                      
                      {ev.link && (
                        <a 
                          href={ev.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-2 inline-flex items-center gap-1"
                        >
                          Acessar
                          <ChevronRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
        
        {events.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <Link to="/students/calendar">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                Ver calendário completo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Minhas Turmas */}
      <Card className="p-6 mb-8 bg-white dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Minhas Turmas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myClasses.map((cls, index) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/students/classes/${cls.id}`}>
                <Card className="p-4 hover:shadow-lg transition-all border-2 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800">
                  <div className={`w-full h-2 rounded-full bg-gradient-to-r ${cls.color || 'from-blue-500 to-indigo-500'} mb-4`} />
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                    {cls.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {cls.teacher_name}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-500">
                      {cls.active_activities || 0} atividades
                    </span>
                    <Button size="sm" variant="ghost" className="whitespace-nowrap">
                      Ver Turma
                    </Button>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Atividades Pendentes */}
        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Atividades Pendentes
            </h2>
            <Link to="/students/activities">
              <Button variant="ghost" size="sm" className="whitespace-nowrap inline-flex items-center gap-2">
                <span>Ver Todas</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {pendingActivities.map((activity, index) => {
              const priority = getPriorityBadge(activity.due_date);
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/students/activities/${activity.id}`}>
                    <Card className="p-4 hover:shadow-lg transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                            {activity.title}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {activity.class_name}
                          </p>
                        </div>
                        <Badge className={`px-3 py-1 rounded-full text-xs font-semibold ${priority.variant === 'destructive' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' : priority.variant === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                          {priority.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(activity.due_date).toLocaleDateString('pt-BR')}
                        </span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                          Fazer Atividade
                        </Button>
                      </div>
                      {activity.progress > 0 && (
                        <Progress value={activity.progress} className="h-1 mt-2" />
                      )}
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Atividades Recentemente Corrigidas */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Recentemente Corrigidas
            </h2>
          </div>

          <div className="space-y-3">
            {recentGrades.map((grade, index) => (
              <motion.div
                key={grade.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all bg-white dark:bg-slate-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                      {grade.activity_title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {grade.class_name}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${getGradeColor(grade.score)}`}>
                        {grade.score !== null && grade.max_score ? 
                          ((grade.score / grade.max_score) * 100).toFixed(0) : '0'}%
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-500">
                        Corrigido em {new Date(grade.graded_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="whitespace-nowrap">
                    Ver Detalhes
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alertas */}
      <Card className="p-6 mb-8 bg-white dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Alertas e Lembretes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border-2 ${
                alert.type === 'warning'
                  ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
                  : alert.type === 'info'
                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  {alert.type === 'warning' ? (
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : alert.type === 'info' ? (
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {alert.message}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="whitespace-nowrap text-xs h-7">
                  {alert.action}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Botões de Ação Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/students/activities">
          <Button
            size="lg"
            className="w-full whitespace-nowrap inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-sky-600 hover:opacity-90 text-white h-14 shadow-lg"
          >
            <FileText className="w-5 h-5" />
            <span>Ver Todas as Atividades</span>
          </Button>
        </Link>
        
        <Link to="/students/performance">
          <Button
            size="lg"
            className="w-full whitespace-nowrap inline-flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:opacity-90 text-white h-14 shadow-lg"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Meu Desempenho Completo</span>
          </Button>
        </Link>
        
        <Link to="/students/calendar">
          <Button
            size="lg"
            className="w-full whitespace-nowrap inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white h-14 shadow-lg"
          >
            <Calendar className="w-5 h-5" />
            <span>Calendário de Prazos</span>
          </Button>
        </Link>
      </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
