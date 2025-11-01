import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Users,
  FileText,
  Clock,
  Plus,
  BarChart3,
  ChevronRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Bell,
  Video,
  MapPin,
  Target
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { 
  StatsCard, 
  DashboardHeader, 
  EmptyState,
  gradients,
  valueOrEmpty,
  formatNumber
} from '@/shared/design';
import { ClassService } from '@/shared/services/classService';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { format, formatDistanceToNow, addDays, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalActivities: 0,
    pendingGrading: 0,
    avgGrade: 0,
    todayCorrections: 0
  });
  const [recentClasses, setRecentClasses] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [alertStudents, setAlertStudents] = useState([]);
  const [scheduledActivities, setScheduledActivities] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[TeacherDashboard] Carregando dados...');

      // 1. Buscar turmas do professor
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          class_members(count)
        `)
        .eq('created_by', user.id)
        .eq('is_active', true);

      if (classesError) throw classesError;

      const classesWithCount = classes?.map(cls => ({
        ...cls,
        student_count: cls.class_members?.[0]?.count || 0
      })) || [];

      // 2. Buscar atividades do professor
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          *,
          activity_class_assignments(class:classes(name))
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activitiesError) throw activitiesError;

      const activitiesWithClass = activities?.map(act => ({
        ...act,
        class_name: act.activity_class_assignments?.[0]?.class?.name || 'Sem turma'
      })) || [];

      // 3. Buscar submissões pendentes
      const activityIds = activities?.map(a => a.id) || [];
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          *,
          activity:activities(title),
          student:profiles!student_id(full_name)
        `)
        .in('activity_id', activityIds)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true })
        .limit(10);

      if (submissionsError) throw submissionsError;

      const submissionsFormatted = submissions?.map(sub => ({
        ...sub,
        student_name: sub.student?.full_name || 'Aluno',
        activity_title: sub.activity?.title || 'Atividade'
      })) || [];

      // 4. Calcular média geral
      const { data: allGrades, error: gradesError } = await supabase
        .from('submissions')
        .select('grade')
        .in('activity_id', activityIds)
        .not('grade', 'is', null);

      if (gradesError) throw gradesError;

      const avgGrade = allGrades?.length > 0
        ? allGrades.reduce((sum, s) => sum + s.grade, 0) / allGrades.length
        : 0;

      // 5. Correções do dia
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: todayGraded, error: todayError } = await supabase
        .from('submissions')
        .select('id')
        .in('activity_id', activityIds)
        .gte('graded_at', today.toISOString())
        .lt('graded_at', tomorrow.toISOString());

      if (todayError) throw todayError;

      // 6. Buscar eventos próximos
      const sevenDaysFromNow = addDays(new Date(), 7);
      const { data: events, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('created_by', user.id)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', sevenDaysFromNow.toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      if (!eventsError && events) {
        setUpcomingEvents(events);
        setTodayEvents(events.filter(e => isToday(new Date(e.start_time))));
      }

      // 7. Buscar reuniões
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .eq('created_by', user.id)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', sevenDaysFromNow.toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      if (!meetingsError && meetings) {
        const meetingsAsEvents = meetings.map(m => ({
          ...m,
          title: m.title,
          start_time: m.start_time,
          event_type: 'meeting'
        }));
        setUpcomingEvents(prev => [...prev, ...meetingsAsEvents].sort((a, b) => 
          new Date(a.start_time) - new Date(b.start_time)
        ).slice(0, 5));
      }

      // 8. Identificar alunos em alerta
      const { data: studentGrades, error: studentGradesError } = await supabase
        .from('submissions')
        .select(`
          student_id,
          grade,
          student:profiles!student_id(full_name)
        `)
        .in('activity_id', activityIds)
        .not('grade', 'is', null);

      if (!studentGradesError && studentGrades) {
        const studentAvgs = {};
        studentGrades.forEach(sub => {
          if (!studentAvgs[sub.student_id]) {
            studentAvgs[sub.student_id] = {
              grades: [],
              name: sub.student?.full_name || 'Aluno'
            };
          }
          studentAvgs[sub.student_id].grades.push(sub.grade);
        });

        const alerts = Object.entries(studentAvgs)
          .map(([id, data]) => ({
            id,
            name: data.name,
            avgGrade: data.grades.reduce((s, g) => s + g, 0) / data.grades.length,
            totalActivities: data.grades.length
          }))
          .filter(s => s.avgGrade < 6)
          .sort((a, b) => a.avgGrade - b.avgGrade)
          .slice(0, 10);

        setAlertStudents(alerts);
      }

      // 9. Atividades agendadas para hoje
      const { data: scheduled, error: scheduledError } = await supabase
        .from('activities')
        .select('*')
        .eq('created_by', user.id)
        .eq('status', 'draft')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (!scheduledError) {
        setScheduledActivities(scheduled || []);
      }

      // Calcular estatísticas totais
      const totalStudents = classesWithCount.reduce((sum, cls) => sum + (cls.student_count || 0), 0);

      setStats({
        totalClasses: classesWithCount.length,
        totalStudents,
        totalActivities: activities?.length || 0,
        pendingGrading: submissions?.length || 0,
        avgGrade: Number(avgGrade.toFixed(1)),
        todayCorrections: todayGraded?.length || 0
      });

      setRecentClasses(classesWithCount.slice(0, 5));
      setRecentActivities(activitiesWithClass.slice(0, 5));
      setPendingSubmissions(submissionsFormatted);
      
      console.log('[TeacherDashboard] Dados carregados com sucesso');
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setError('Erro ao carregar dados do dashboard. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Total de Turmas',
      value: stats.totalClasses,
      icon: BookOpen,
      gradient: 'from-blue-600 to-cyan-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      change: `${stats.totalStudents} alunos`
    },
    {
      title: 'Total de Alunos',
      value: stats.totalStudents,
      icon: Users,
      gradient: 'from-cyan-500 to-blue-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/30'
    },
    {
      title: 'Média Geral',
      value: stats.avgGrade,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      change: stats.avgGrade >= 7 ? 'Excelente' : 'Pode melhorar'
    },
    {
      title: 'Aguardando Correção',
      value: stats.pendingGrading,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      change: `${stats.todayCorrections} hoje`
    }
  ];

  const quickActions = [
    {
      label: 'Nova Turma',
      icon: Plus,
      href: '/dashboard/classes/new',
      gradient: 'from-blue-600 to-indigo-600'
    },
    {
      label: 'Nova Atividade',
      icon: Plus,
      href: '/dashboard/activities/new',
      gradient: 'from-blue-600 to-cyan-600'
    },
    {
      label: 'Ver Analytics',
      icon: BarChart3,
      href: '/dashboard/analytics',
      gradient: 'from-emerald-600 to-teal-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header usando Design System */}
      <DashboardHeader
        title="Dashboard do Professor"
        subtitle="Bem-vindo de volta! Aqui está um resumo das suas turmas e atividades."
        role="teacher"
      />

      {/* Stats Cards usando Design System */}
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

      {/* Agenda e Eventos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Próximos Eventos */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Próximos Eventos (7 dias)
            </h2>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex flex-col items-center justify-center text-white">
                    <div className="text-2xl font-bold">
                      {format(new Date(event.start_time), 'd')}
                    </div>
                    <div className="text-xs uppercase">
                      {format(new Date(event.start_time), 'MMM', { locale: ptBR })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {event.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {format(new Date(event.start_time), "HH:mm")}
                    </p>
                    <Badge className={`mt-1 ${
                      event.event_type === 'meeting' ? 'bg-purple-100 text-purple-700' :
                      event.event_type === 'exam' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {event.event_type || 'evento'}
                    </Badge>
                  </div>
                </motion.div>
              ))
            ) : (
              <EmptyState
                icon={Calendar}
                title="Nenhum evento próximo"
                description="Seus próximos eventos aparecerão aqui."
              />
            )}
          </div>
        </Card>

        {/* Eventos de Hoje + Atividades Agendadas */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Agenda de Hoje
            </h2>
          </div>
          <div className="space-y-4">
            {todayEvents.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Eventos</h3>
                {todayEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                  >
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{event.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {format(new Date(event.start_time), "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum evento hoje</p>
            )}

            {scheduledActivities.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Atividades para Postar
                </h3>
                {scheduledActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-2"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {activity.title}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-blue-600 to-cyan-600"
                      onClick={() => navigate(`/dashboard/activities/${activity.id}`)}
                    >
                      Publicar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Turmas Recentes */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Turmas Recentes
            </h2>
            <Link to="/dashboard/classes">
              <Button variant="ghost" size="sm" className="whitespace-nowrap inline-flex items-center gap-2">
                <span>Ver Todas</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {recentClasses.length > 0 ? (
              recentClasses.map((cls, index) => (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={`/dashboard/classes/${cls.id}`}>
                    <Card className="p-4 hover:shadow-md transition-all border-2 hover:border-blue-200 dark:hover:border-blue-800 bg-white dark:bg-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${cls.color || 'from-blue-500 to-indigo-500'} flex items-center justify-center text-white font-bold`}>
                            {cls.name?.[0] || 'T'}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {cls.name}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {cls.subject || 'Sem matéria'} • {cls.student_count || 0} alunos
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="whitespace-nowrap">
                          Ver Turma
                        </Button>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))
            ) : (
              <EmptyState
                icon={BookOpen}
                title="Nenhuma turma encontrada"
                description="Crie sua primeira turma para começar a gerenciar suas aulas e atividades."
                actionLabel="Criar Primeira Turma"
                actionIcon={Plus}
                action={() => window.location.href = '/dashboard/classes/new'}
              />
            )}
          </div>
        </Card>

        {/* Atividades Recentes */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Atividades Recentes
            </h2>
            <Link to="/dashboard/activities">
              <Button variant="ghost" size="sm" className="whitespace-nowrap inline-flex items-center gap-2">
                <span>Ver Todas</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all bg-white dark:bg-slate-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                        {activity.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {activity.class_name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(activity.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={activity.status === 'active' ? 'default' : 'secondary'}
                      className="whitespace-nowrap"
                    >
                      {activity.status === 'active' ? 'Ativa' : 'Encerrada'}
                    </Badge>
                  </div>
                </motion.div>
              ))
            ) : (
              <EmptyState
                icon={FileText}
                title="Nenhuma atividade encontrada"
                description="Suas atividades recentes aparecerão aqui."
              />
            )}
          </div>
        </Card>
      </div>

      {/* Alunos em Alerta */}
      {alertStudents.length > 0 && (
        <Card className="p-6 mb-8 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-2 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/40">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Alunos que Precisam de Atenção
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {alertStudents.length} aluno{alertStudents.length > 1 ? 's' : ''} com desempenho abaixo de 6.0
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-lg bg-white dark:bg-slate-900 border-2 border-yellow-200 dark:border-yellow-800 hover:shadow-md transition-all"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                  {student.name?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {student.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs">
                      Média: {student.avgGrade.toFixed(1)}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {student.totalActivities} atividade{student.totalActivities > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="whitespace-nowrap border-yellow-600 text-yellow-700 hover:bg-yellow-50"
                  onClick={() => navigate(`/dashboard/students/${student.id}`)}
                >
                  Ver Detalhes
                </Button>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Submissões Pendentes */}
      <Card className="p-6 mb-8 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Submissões Pendentes de Correção
          </h2>
          <Link to="/dashboard/grading">
            <Button variant="ghost" size="sm" className="whitespace-nowrap inline-flex items-center gap-2">
              <span>Ver Todas</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {pendingSubmissions.length > 0 ? (
            pendingSubmissions.map((submission, index) => (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all bg-white dark:bg-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
                    {submission.student_name?.[0] || 'A'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {submission.student_name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {submission.activity_title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      Enviado em {new Date(submission.submitted_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <Link to={`/dashboard/grading/${submission.id}`}>
                  <Button size="sm" className="whitespace-nowrap bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
                    Corrigir Agora
                  </Button>
                </Link>
              </motion.div>
            ))
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="Nenhuma correção pendente!"
              description="Parabéns! Você está em dia com as correções. 🎉"
            />
          )}
        </div>
      </Card>

      {/* Botões de Ação Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={action.href}>
              <Button
                size="lg"
                className={`w-full whitespace-nowrap inline-flex items-center justify-center gap-2 bg-gradient-to-r ${action.gradient} hover:opacity-90 text-white h-16 text-lg`}
              >
                <action.icon className="w-6 h-6" />
                <span>{action.label}</span>
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TeacherDashboard;
