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
  AlertCircle
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
// SubmissionService não tem método getPendingSubmissions ainda

const TeacherDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalActivities: 0,
    pendingGrading: 0
  });
  const [recentClasses, setRecentClasses] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[TeacherDashboard] Carregando dados...');

      // Buscar turmas
      const classes = await ClassService.getClasses();
      console.log('[TeacherDashboard] Classes carregadas:', classes?.length || 0);
      
      // Buscar atividades recentes (se o método existir)
      let activities = [];
      try {
        const activitiesResult = await ClassService.getRecentActivities?.(5);
        activities = activitiesResult?.data || [];
      } catch (err) {
        console.log('getRecentActivities não disponível:', err.message);
      }
      
      // Buscar submissões pendentes (método não implementado ainda)
      let submissions = [];

      // Calcular estatísticas
      const totalStudents = classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0);
      const totalActivities = activities.length;
      const pendingGrading = submissions.length;

      setStats({
        totalClasses: classes.length,
        totalStudents,
        totalActivities,
        pendingGrading
      });

      setRecentClasses(classes.slice(0, 5));
      setRecentActivities(activities);
      setPendingSubmissions(submissions);
      
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
      gradient: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30'
    },
    {
      title: 'Total de Alunos',
      value: stats.totalStudents,
      icon: Users,
      gradient: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30'
    },
    {
      title: 'Total de Atividades',
      value: stats.totalActivities,
      icon: FileText,
      gradient: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30'
    },
    {
      title: 'Correções Pendentes',
      value: stats.pendingGrading,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30'
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
      gradient: 'from-purple-600 to-pink-600'
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
            delay={index * 0.1}
          />
        ))}
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
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all bg-white dark:bg-slate-800"
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
