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
  TrendingUp
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    activeActivities: 0,
    completedActivities: 0,
    upcomingDeadlines: 0,
    completionRate: 0,
    avgGrade: 0
  });
  const [myClasses, setMyClasses] = useState([]);
  const [pendingActivities, setPendingActivities] = useState([]);
  const [recentGrades, setRecentGrades] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    } else {
      // Se não tem user ainda, não está carregando
      setLoading(false);
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('[StudentDashboard] Carregando dados...');
      
      if (!user?.id) {
        console.log('[StudentDashboard] Usuário não autenticado');
        setLoading(false);
        return;
      }

      // 1. Buscar turmas do aluno - OTIMIZADO: Duas queries simples ao invés de JOIN
      let classes = [];
      let classIds = [];
      
      try {
        // Primeira query: Buscar apenas os IDs (rápido, sem JOIN)
        const membershipPromise = supabase
          .from('class_members')
          .select('class_id')
          .eq('user_id', user.id)
          .eq('role', 'student');

        const timeout1 = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 3000)
        );

        const { data: memberships } = await Promise.race([membershipPromise, timeout1]);
        classIds = memberships?.map(m => m.class_id) || [];
        
        if (classIds.length === 0) {
          console.log('[StudentDashboard] Nenhuma turma encontrada');
        } else {
          console.log('[StudentDashboard] IDs de turmas encontrados:', classIds.length);
          
          // Segunda query: Buscar detalhes das turmas (rápido, query direta)
          const classesPromise = supabase
            .from('classes')
            .select('id, name, subject, color, banner_color')
            .in('id', classIds);

          const timeout2 = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 3000)
          );

          const { data: classesData } = await Promise.race([classesPromise, timeout2]);
          classes = classesData || [];
          console.log('[StudentDashboard] Turmas carregadas:', classes.length);
        }
      } catch (err) {
        console.error('[StudentDashboard] Erro ao buscar turmas:', err.message);
        // Continua com arrays vazios
      }

      if (classIds.length === 0) {
        // Sem turmas ainda
        setStats({
          totalClasses: 0,
          activeActivities: 0,
          completedActivities: 0,
          upcomingDeadlines: 0,
          completionRate: 0,
          avgGrade: 0
        });
        setMyClasses([]);
        setPendingActivities([]);
        setRecentGrades([]);
        setUpcomingDeadlines([]);
        setAlerts([{
          id: 1,
          type: 'info',
          message: 'Você ainda não está em nenhuma turma',
          action: 'Entrar'
        }]);
        setLoading(false);
        return;
      }

      // 2. Buscar atividades das turmas com timeout
      let allActivities = [];
      let publishedActivities = [];
      
      try {
        const activitiesPromise = supabase
          .from('activity_class_assignments')
          .select(`
            activity_id,
            activity:activities(
              id,
              title,
              due_date,
              max_score,
              type,
              is_published,
              status
            )
          `)
          .in('class_id', classIds);

        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 5000)
        );

        const { data: activityAssignments } = await Promise.race([
          activitiesPromise,
          timeout
        ]);

        allActivities = activityAssignments
          ?.map(a => a.activity)
          .filter(Boolean) || [];
        
        publishedActivities = allActivities.filter(a => 
          a.is_published && a.status === 'active'
        );
        
        console.log('[StudentDashboard] Atividades carregadas:', publishedActivities.length);
      } catch (err) {
        console.error('[StudentDashboard] Timeout ou erro ao buscar atividades:', err.message);
      }

      // 3. Buscar submissões do aluno com timeout
      let submissions = [];
      
      try {
        const submissionsPromise = supabase
          .from('submissions')
          .select('id, activity_id, status, grade, submitted_at, graded_at')
          .eq('student_id', user.id);

        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 5000)
        );

        const { data } = await Promise.race([submissionsPromise, timeout]);
        submissions = data || [];
        console.log('[StudentDashboard] Submissões carregadas:', submissions.length);
      } catch (err) {
        console.error('[StudentDashboard] Timeout ou erro ao buscar submissões:', err.message);
      }

      const submissionsMap = new Map(
        submissions?.map(s => [s.activity_id, s]) || []
      );

      // 4. Calcular estatísticas
      const now = new Date();
      
      // Atividades com prazo próximo (48h)
      const upcoming = publishedActivities.filter(act => {
        if (!act.due_date) return false;
        const due = new Date(act.due_date);
        const hoursLeft = (due - now) / (1000 * 60 * 60);
        return hoursLeft > 0 && hoursLeft <= 48 && !submissionsMap.has(act.id);
      });

      // Submissões completas (submetidas ou corrigidas)
      const completed = submissions?.filter(s =>
        s.status === 'submitted' || s.status === 'graded'
      ) || [];

      // Submissões com nota
      const graded = submissions?.filter(s => s.grade !== null) || [];

      // Média das notas
      const avgGrade = graded.length > 0
        ? graded.reduce((sum, s) => sum + parseFloat(s.grade), 0) / graded.length
        : 0;

      // Taxa de conclusão
      const completionRate = publishedActivities.length > 0
        ? (completed.length / publishedActivities.length) * 100
        : 0;

      // Atividades pendentes (sem submissão)
      const pending = publishedActivities.filter(act =>
        !submissionsMap.has(act.id)
      ).map(act => ({
        ...act,
        dueDate: act.due_date,
        className: classes.find(c => c.id)?.name || 'Turma'
      }));

      // Notas recentes (últimas 5)
      const recent = graded
        .sort((a, b) => new Date(b.graded_at || b.submitted_at) - new Date(a.graded_at || a.submitted_at))
        .slice(0, 5);

      // 5. Criar alertas dinâmicos
      const alerts = [];
      
      if (upcoming.length > 0) {
        alerts.push({
          id: 1,
          type: 'warning',
          message: `${upcoming.length} atividade${upcoming.length > 1 ? 's' : ''} com prazo em 48h`,
          action: 'Ver'
        });
      }
      
      if (pending.length > 0) {
        alerts.push({
          id: 2,
          type: 'info',
          message: `${pending.length} atividade${pending.length > 1 ? 's' : ''} pendente${pending.length > 1 ? 's' : ''}`,
          action: 'Acessar'
        });
      }
      
      const recentFeedback = graded.filter(s => {
        if (!s.graded_at) return false;
        const gradedDate = new Date(s.graded_at);
        const daysSince = (now - gradedDate) / (1000 * 60 * 60 * 24);
        return daysSince <= 7;
      });
      
      if (recentFeedback.length > 0) {
        alerts.push({
          id: 3,
          type: 'success',
          message: `${recentFeedback.length} feedback${recentFeedback.length > 1 ? 's' : ''} recebido${recentFeedback.length > 1 ? 's' : ''}`,
          action: 'Ler'
        });
      }

      // Atualizar estado com dados reais
      setStats({
        totalClasses: classes.length,
        activeActivities: pending.length,
        completedActivities: completed.length,
        upcomingDeadlines: upcoming.length,
        completionRate: Math.round(completionRate),
        avgGrade: parseFloat(avgGrade.toFixed(1))
      });

      setMyClasses(classes);
      setPendingActivities(pending.slice(0, 5));
      setRecentGrades(recent);
      setUpcomingDeadlines(upcoming);
      setAlerts(alerts.length > 0 ? alerts : [{
        id: 1,
        type: 'success',
        message: 'Tudo em dia! Continue assim!',
        action: ''
      }]);

      console.log('[StudentDashboard] Dados carregados com sucesso');
    } catch (error) {
      console.error('[StudentDashboard] Erro ao carregar dashboard:', error);
      // Manter valores padrão em caso de erro
    } finally {
      setLoading(false);
      console.log('[StudentDashboard] Loading finalizado');
    }
  };

  const statsCards = [
    { title: 'Minhas Turmas', value: stats.totalClasses, icon: BookOpen, gradient: 'from-cyan-500 to-sky-500' },
    { title: 'Atividades Ativas', value: stats.activeActivities, icon: FileText, gradient: 'from-sky-500 to-blue-500' },
    { title: 'Atividades Concluídas', value: stats.completedActivities, icon: CheckCircle2, gradient: 'from-blue-500 to-indigo-500' },
    { title: 'Prazos Próximos (48h)', value: stats.upcomingDeadlines, icon: Clock, gradient: 'from-orange-500 to-amber-500' },
    { title: 'Taxa de Conclusão', value: `${stats.completionRate}%`, icon: BarChart3, gradient: 'from-cyan-500 to-blue-600' },
    { title: 'Nota Média', value: stats.avgGrade.toFixed(1), icon: Trophy, gradient: 'from-yellow-500 to-orange-500' }
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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6">
      {/* Skip to main content - Acessibilidade WCAG 2.2 */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Pular para o conteúdo principal
      </a>

      {/* Header Animado */}
      <header 
        className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 dark:from-cyan-700 dark:via-sky-700 dark:to-blue-800 p-6 md:p-8 text-white shadow-lg"
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

        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" aria-hidden="true" />
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
        <Card className="p-6 bg-white dark:bg-slate-900">
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
                    <Card className="p-4 hover:shadow-md transition-all border-2 hover:border-purple-200 dark:hover:border-purple-800 bg-white dark:bg-slate-800">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                            {activity.title}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {activity.class_name}
                          </p>
                        </div>
                        <Badge variant={priority.variant}>
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
                        {grade.score.toFixed(1)}
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
