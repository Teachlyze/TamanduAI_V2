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
// import { ClassService } from '@/shared/services/classService';
// import { SubmissionService } from '@/shared/services/submissionService';

const StudentDashboard = () => {
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
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // TODO: Integrar com services quando tiver dados reais
      setStats({
        totalClasses: 6,
        activeActivities: 8,
        completedActivities: 15,
        upcomingDeadlines: 3,
        completionRate: 75,
        avgGrade: 8.5
      });

      setMyClasses([]);
      setPendingActivities([]);
      setRecentGrades([]);
      setUpcomingDeadlines([]);
      
      // Mock de alertas
      setAlerts([
        { id: 1, type: 'warning', message: '3 atividades com prazo em 24h', action: 'Ver' },
        { id: 2, type: 'info', message: '2 novas atividades disponíveis', action: 'Acessar' },
        { id: 3, type: 'success', message: '1 feedback recebido', action: 'Ler' }
      ]);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { title: 'Minhas Turmas', value: stats.totalClasses, icon: BookOpen, gradient: 'from-blue-500 to-indigo-500' },
    { title: 'Atividades Ativas', value: stats.activeActivities, icon: FileText, gradient: 'from-purple-500 to-pink-500' },
    { title: 'Atividades Concluídas', value: stats.completedActivities, icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-500' },
    { title: 'Prazos Próximos (48h)', value: stats.upcomingDeadlines, icon: Clock, gradient: 'from-amber-500 to-orange-500' },
    { title: 'Taxa de Conclusão', value: `${stats.completionRate}%`, icon: BarChart3, gradient: 'from-cyan-500 to-blue-500' },
    { title: 'Nota Média', value: stats.avgGrade.toFixed(1), icon: Trophy, gradient: 'from-yellow-500 to-amber-500' }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      {/* Header Animado */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <h1 className="text-4xl font-bold mb-2">
            Meu Dashboard
          </h1>
          <p className="text-blue-100">
            Acompanhe seu progresso, atividades e desempenho
          </p>
        </motion.div>

        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {stat.title}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

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
            className="w-full whitespace-nowrap inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white h-14"
          >
            <FileText className="w-5 h-5" />
            <span>Ver Todas as Atividades</span>
          </Button>
        </Link>
        
        <Link to="/students/performance">
          <Button
            size="lg"
            className="w-full whitespace-nowrap inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white h-14"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Meu Desempenho Completo</span>
          </Button>
        </Link>
        
        <Link to="/students/calendar">
          <Button
            size="lg"
            className="w-full whitespace-nowrap inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white h-14"
          >
            <Calendar className="w-5 h-5" />
            <span>Calendário de Prazos</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default StudentDashboard;
