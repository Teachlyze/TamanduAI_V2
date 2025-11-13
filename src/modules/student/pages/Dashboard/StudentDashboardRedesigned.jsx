import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';
import { 
  StatCard, 
  ActivityCard, 
  EventCard, 
  EmptyState 
} from '@/modules/student/components/redesigned';
import { 
  BookOpen, 
  FileText, 
  Star, 
  Target,
  Calendar,
  CheckCircle2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { format, startOfDay, endOfDay, isToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const StudentDashboardRedesigned = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    pendingActivities: 0,
    completedActivities: 0,
    avgGrade: 0,
    completionRate: 0,
    gradeTrend: 0
  });
  const [pendingActivities, setPendingActivities] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [topClasses, setTopClasses] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadPendingActivities(),
        loadTodayEvents(),
        loadPerformanceData(),
        loadTopClasses(),
        loadAlerts()
      ]);
    } catch (error) {
      logger.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Buscar turmas do aluno
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];
      const totalClasses = classIds.length;

      if (classIds.length === 0) {
        setStats({ totalClasses: 0, pendingActivities: 0, completedActivities: 0, avgGrade: 0, completionRate: 0, gradeTrend: 0 });
        return;
      }

      // Buscar atividades atribuídas
      const { data: assignments } = await supabase
        .from('activity_class_assignments')
        .select('activity_id, activity:activities(id, title, due_date, max_score)')
        .in('class_id', classIds);

      const activityIds = assignments?.map(a => a.activity_id).filter(Boolean) || [];

      // Buscar submissões do aluno
      const { data: submissions } = await supabase
        .from('submissions')
        .select('activity_id, status, grade, submitted_at')
        .eq('student_id', user.id)
        .in('activity_id', activityIds);

      const submittedIds = new Set(submissions?.map(s => s.activity_id) || []);
      const pendingActivities = activityIds.length - submittedIds.size;
      const completedActivities = submittedIds.size;

      // Calcular média geral
      const gradesData = submissions?.filter(s => s.grade !== null) || [];
      const avgGrade = gradesData.length > 0
        ? gradesData.reduce((sum, s) => sum + parseFloat(s.grade), 0) / gradesData.length
        : 0;

      // Taxa de conclusão
      const completionRate = activityIds.length > 0
        ? Math.round((completedActivities / activityIds.length) * 100)
        : 0;

      setStats({
        totalClasses,
        pendingActivities,
        completedActivities,
        avgGrade,
        completionRate,
        gradeTrend: 5 // TODO: Calcular tendência real
      });
    } catch (error) {
      logger.error('Erro ao carregar stats:', error);
    }
  };

  const loadPendingActivities = async () => {
    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      if (classIds.length === 0) {
        setPendingActivities([]);
        return;
      }

      // Buscar atividades atribuídas
      const { data: assignments } = await supabase
        .from('activity_class_assignments')
        .select('activity_id, class_id, assigned_at')
        .in('class_id', classIds);

      const activityIds = assignments?.map(a => a.activity_id).filter(Boolean) || [];

      // Buscar dados das atividades
      const { data: activities } = await supabase
        .from('activities')
        .select('id, title, description, type, due_date, max_score')
        .in('id', activityIds);

      // Buscar dados das classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, subject')
        .in('id', classIds);

      const activitiesMap = {};
      activities?.forEach(a => { activitiesMap[a.id] = a; });

      const classesMap = {};
      classes?.forEach(c => { classesMap[c.id] = c; });

      // Buscar submissões
      const { data: submissions } = await supabase
        .from('submissions')
        .select('activity_id, status, grade')
        .eq('student_id', user.id)
        .in('activity_id', activityIds);

      const submittedIds = new Set(submissions?.map(s => s.activity_id) || []);

      // Filtrar não submetidas e mapear
      const pending = (assignments || [])
        .filter(a => activitiesMap[a.activity_id] && !submittedIds.has(a.activity_id))
        .map(a => {
          const activity = activitiesMap[a.activity_id];
          const classInfo = classesMap[a.class_id];
          return {
            ...activity,
            class_name: classInfo?.name,
            class_subject: classInfo?.subject,
            status: new Date(activity.due_date) < new Date() ? 'late' : 'pending'
          };
        })
        .slice(0, 5); // Top 5

      setPendingActivities(pending);
    } catch (error) {
      logger.error('Erro ao carregar atividades pendentes:', error);
    }
  };

  const loadTodayEvents = async () => {
    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      const today = new Date();
      const start = startOfDay(today);
      const end = endOfDay(today);

      // Eventos da turma
      const { data: classEvents } = await supabase
        .from('calendar_events')
        .select('id, title, description, start_time, end_time, type, modality, location, meeting_link, class_id')
        .in('class_id', classIds)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      // Eventos onde é participante
      const { data: attendeeEvents } = await supabase
        .from('calendar_events')
        .select('id, title, description, start_time, end_time, type, modality, location, meeting_link, attendees, class_id')
        .contains('attendees', [user.id])
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });

      // Buscar nomes das classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds);

      const classNamesMap = {};
      classesData?.forEach(c => { classNamesMap[c.id] = c.name; });

      // Combinar e remover duplicatas
      const eventIds = new Set();
      const allEvents = [
        ...(classEvents || []),
        ...(attendeeEvents || [])
      ].filter(event => {
        if (eventIds.has(event.id)) return false;
        eventIds.add(event.id);
        return true;
      }).map(event => ({
        ...event,
        class_name: classNamesMap[event.class_id]
      }));

      setTodayEvents(allEvents);
    } catch (error) {
      logger.error('Erro ao carregar eventos de hoje:', error);
    }
  };

  const loadPerformanceData = async () => {
    try {
      // Buscar últimas 10 notas
      const { data: submissions } = await supabase
        .from('submissions')
        .select(`
          id, grade, submitted_at,
          activity:activities(title, max_score)
        `)
        .eq('student_id', user.id)
        .not('grade', 'is', null)
        .order('submitted_at', { ascending: true })
        .limit(10);

      const data = (submissions || []).map(s => ({
        date: format(new Date(s.submitted_at), 'dd/MM', { locale: ptBR }),
        avgGrade: parseFloat(s.grade) || 0,
        activity: s.activity?.title
      }));

      setPerformanceData(data);
    } catch (error) {
      logger.error('Erro ao carregar dados de desempenho:', error);
    }
  };

  const loadTopClasses = async () => {
    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      if (classIds.length === 0) {
        setTopClasses([]);
        return;
      }

      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, subject')
        .in('id', classIds);

      // Para cada turma, calcular média
      const classesWithGrades = await Promise.all(
        (classes || []).map(async (cls) => {
          const { data: assignments } = await supabase
            .from('activity_class_assignments')
            .select('activity_id')
            .eq('class_id', cls.id);

          const activityIds = assignments?.map(a => a.activity_id) || [];

          const { data: submissions } = await supabase
            .from('submissions')
            .select('grade')
            .eq('student_id', user.id)
            .in('activity_id', activityIds)
            .not('grade', 'is', null);

          const grades = submissions?.map(s => parseFloat(s.grade)) || [];
          const avgGrade = grades.length > 0
            ? grades.reduce((sum, g) => sum + g, 0) / grades.length
            : 0;

          return {
            name: cls.name,
            value: avgGrade
          };
        })
      );

      setTopClasses(classesWithGrades.sort((a, b) => b.value - a.value).slice(0, 5));
    } catch (error) {
      logger.error('Erro ao carregar top turmas:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      // Atividades atrasadas
      const { data: assignments } = await supabase
        .from('activity_class_assignments')
        .select(`
          activity_id,
          activity:activities(id, title, due_date)
        `)
        .in('class_id', classIds);

      const activityIds = assignments?.map(a => a.activity_id).filter(Boolean) || [];

      const { data: submissions } = await supabase
        .from('submissions')
        .select('activity_id')
        .eq('student_id', user.id)
        .in('activity_id', activityIds);

      const submittedIds = new Set(submissions?.map(s => s.activity_id) || []);

      const lateActivities = (assignments || [])
        .filter(a => 
          a.activity && 
          !submittedIds.has(a.activity.id) &&
          new Date(a.activity.due_date) < new Date()
        );

      const alertsData = [];

      if (lateActivities.length > 0) {
        alertsData.push({
          type: 'warning',
          message: `Você tem ${lateActivities.length} atividade${lateActivities.length > 1 ? 's' : ''} atrasada${lateActivities.length > 1 ? 's' : ''}!`
        });
      }

      setAlerts(alertsData);
    } catch (error) {
      logger.error('Erro ao carregar alertas:', error);
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
      {/* Header Personalizado */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-8 mb-8 text-white shadow-xl"
      >
        <h1 className="text-3xl font-bold mb-2">
          👋 Olá, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Estudante'}!
        </h1>
        <p className="text-blue-100 text-lg">
          {stats.avgGrade >= 8 ? '🎉 Seu desempenho está ótimo! Continue assim!' :
           stats.avgGrade >= 6 ? '👍 Você está indo bem! Mantenha o foco!' :
           stats.avgGrade > 0 ? '💪 Vamos melhorar juntos! Você consegue!' :
           '📚 Comece suas atividades e acompanhe seu progresso!'}
          {stats.avgGrade > 0 && ` Média atual: ${stats.avgGrade.toFixed(1)}`}
        </p>
      </motion.div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {alerts.map((alert, index) => (
            <Card key={index} className="p-4 bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <p className="text-orange-900 dark:text-orange-200 font-medium">
                  {alert.message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/students/activities')}
                  className="ml-auto"
                >
                  Ver Atividades
                </Button>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <StatCard
          icon={BookOpen}
          value={stats.totalClasses}
          label="Turmas Ativas"
          gradient="blue"
        />
        <StatCard
          icon={FileText}
          value={stats.pendingActivities}
          label="Atividades Pendentes"
          gradient="orange"
        />
        <StatCard
          icon={Star}
          value={stats.avgGrade > 0 ? stats.avgGrade.toFixed(1) : '--'}
          label="Média Geral"
          gradient="yellow"
          trend={stats.gradeTrend}
        />
        <StatCard
          icon={Target}
          value={`${stats.completionRate}%`}
          label="Taxa de Conclusão"
          gradient="green"
        />
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-8">
        {/* Atividades Pendentes (2/3) */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6 lg:space-y-8">
          {/* Atividades */}
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                🎯 Próximas Atividades
              </h2>
              <Button
                variant="ghost"
                onClick={() => navigate('/students/activities')}
                className="text-blue-600 hover:text-blue-700"
              >
                Ver todas →
              </Button>
            </div>

            {pendingActivities.length > 0 ? (
              <div className="space-y-4">
                {pendingActivities.map((activity, index) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onStart={() => navigate(`/students/activities/${activity.id}`)}
                    onView={() => navigate(`/students/activities/${activity.id}`)}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Tudo em dia!"
                description="Você não tem atividades pendentes no momento. Parabéns!"
                variant="success"
              />
            )}
          </Card>

          {/* Gráfico de Desempenho */}
          {performanceData.length > 0 && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Sua Evolução
              </h2>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={300} className="min-w-[400px]">
                  <LineChart data={performanceData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                      dataKey="avgGrade"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 6 }}
                      activeDot={{ r: 8 }}
                      name="Média"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Top Turmas */}
          {topClasses.length > 0 && (
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                ⭐ Melhores Turmas
              </h2>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={250} className="min-w-[350px]">
                  <BarChart data={topClasses} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                    <YAxis stroke="#64748b" domain={[0, 10]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} name="Média" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>

        {/* Agenda (1/3) */}
        <div className="space-y-8">
          {/* Eventos de Hoje */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Hoje
            </h2>

            {todayEvents.length > 0 ? (
              <div className="space-y-3">
                {todayEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => navigate('/students/calendar')}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="Nenhum evento"
                description="Sua agenda está livre hoje!"
                variant="info"
              />
            )}
          </Card>

          {/* Atalhos Rápidos */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              🚀 Atalhos Rápidos
            </h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/students/activities')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Minhas Atividades
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/students/classes')}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Minhas Turmas
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/students/calendar')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Agenda
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/students/performance')}
              >
                <Star className="w-4 h-4 mr-2" />
                Minhas Notas
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardRedesigned;
