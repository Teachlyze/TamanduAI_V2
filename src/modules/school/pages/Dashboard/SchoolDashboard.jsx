import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  FileText,
  UserCheck,
  TrendingUp,
  AlertCircle,
  Info,
  ChevronRight,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// import { SchoolService } from '@/shared/services/schoolService';

const SchoolDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0,
    totalActivities: 0,
    activeTeachers: 0,
    avgClassSize: 0,
    engagementRate: 0,
    growthRate: 0
  });
  const [recentTeachers, setRecentTeachers] = useState([]);
  const [topClasses, setTopClasses] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [growthData, setGrowthData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // TODO: Integrar com services quando tiver dados reais
      setStats({
        totalTeachers: 15,
        totalStudents: 450,
        totalClasses: 20,
        totalActivities: 80,
        activeTeachers: 14,
        avgClassSize: 22,
        engagementRate: 85,
        growthRate: 12
      });

      setRecentTeachers([]);
      setTopClasses([]);
      
      // Mock de alertas
      setAlerts([
        { id: 1, type: 'warning', message: '3 turmas atingiram capacidade máxima', action: 'Ver Turmas' },
        { id: 2, type: 'info', message: '5 novos professores aguardando aprovação', action: 'Revisar' }
      ]);

      // Mock de dados de crescimento
      setGrowthData([
        { month: 'Jan', students: 120 },
        { month: 'Fev', students: 145 },
        { month: 'Mar', students: 168 },
        { month: 'Abr', students: 195 },
        { month: 'Mai', students: 220 },
        { month: 'Jun', students: 250 }
      ]);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { title: 'Total de Professores', value: stats.totalTeachers, icon: Users, gradient: 'from-blue-500 to-indigo-500' },
    { title: 'Total de Alunos', value: stats.totalStudents, icon: Users, gradient: 'from-purple-500 to-pink-500' },
    { title: 'Total de Turmas', value: stats.totalClasses, icon: BookOpen, gradient: 'from-emerald-500 to-teal-500' },
    { title: 'Total de Atividades', value: stats.totalActivities, icon: FileText, gradient: 'from-amber-500 to-orange-500' },
    { title: 'Professores Ativos', value: stats.activeTeachers, icon: UserCheck, gradient: 'from-green-500 to-emerald-500' },
    { title: 'Tamanho Médio de Turma', value: stats.avgClassSize, icon: BarChart3, gradient: 'from-cyan-500 to-blue-500' },
    { title: 'Taxa de Engajamento', value: `${stats.engagementRate}%`, icon: TrendingUp, gradient: 'from-indigo-500 to-purple-500' },
    { title: 'Taxa de Crescimento', value: `+${stats.growthRate}%`, icon: TrendingUp, gradient: 'from-pink-500 to-rose-500' }
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header Animado */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <h1 className="text-4xl font-bold mb-2">
            Dashboard da Escola
          </h1>
          <p className="text-slate-300">
            Visão geral completa da sua instituição de ensino
          </p>
        </motion.div>

        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-4 hover:shadow-lg transition-shadow bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.gradient}`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {stat.value}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {stat.title}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Professores Recentes */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Professores Recentes
          </h2>

          <div className="space-y-3">
            {recentTeachers.map((teacher, index) => (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/dashboard/school/teachers/${teacher.id}`}>
                  <Card className="p-4 hover:shadow-md transition-all border-2 hover:border-blue-200 dark:hover:border-blue-800 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                          {teacher.name?.[0] || 'P'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {teacher.name}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {teacher.email}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500">
                            {teacher.class_count || 0} turmas
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="whitespace-nowrap">
                        Ver Perfil
                      </Button>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Top 5 Turmas */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Top 5 Turmas
          </h2>

          <div className="space-y-4">
            {topClasses.map((cls, index) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {cls.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {cls.teacher_name} • {cls.student_count || 0} alunos
                      </p>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      #{index + 1}
                    </span>
                  </div>
                  <Progress value={(cls.student_count || 0) * 3} className="h-2" />
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alertas e Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Alertas e Notificações
          </h2>

          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 ${
                  alert.type === 'warning'
                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
                    : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {alert.type === 'warning' ? (
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    ) : (
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="whitespace-nowrap">
                    {alert.action}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Gráfico de Crescimento */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Crescimento de Alunos
          </h2>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Line
                type="monotone"
                dataKey="students"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default SchoolDashboard;
