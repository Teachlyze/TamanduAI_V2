import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, CheckCircle, Clock, Calendar, Plus, FileText, AlertCircle, Megaphone, CheckSquare } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { redisCache } from '@/shared/services/redisCache';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/shared/components/ui/use-toast';

const OverviewTab = ({ classId, classData, onTabChange }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgGrade: 0,
    onTimeRate: 0,
    openActivities: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);

  const handleQuickAction = (actionLabel) => {
    switch (actionLabel) {
      case 'Criar Atividade':
        navigate(`/dashboard/activities/create?classId=${classId}`);
        break;
      case 'Adicionar Aluno':
        onTabChange?.('students');
        break;
      case 'Novo Material':
        onTabChange?.('library');
        break;
      case 'Agendar Aula':
        onTabChange?.('schedule');
        break;
      case 'Postar Comunicado':
        onTabChange?.('announcements');
        break;
      case 'Corrigir Trabalhos':
        onTabChange?.('activities');
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    loadStats();
  }, [classId]);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Usar cache Redis para estatísticas
      const cachedStats = await redisCache.getClassStats(classId, async () => {
        // Buscar atividades desta turma (com dados básicos) para métricas e lista recente
        const { data: assignments } = await supabase
          .from('activity_class_assignments')
          .select(`
            id,
            assigned_at,
            activity:activities(
              id,
              title,
              type,
              due_date,
              max_score,
              status,
              created_at
            )
          `)
          .eq('class_id', classId)
          .order('assigned_at', { ascending: false });

        const activityIds = (assignments || [])
          .map(a => a.activity?.id)
          .filter(Boolean);

        // Total de alunos na turma
        const { count: studentsCount } = await supabase
          .from('class_members')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classId)
          .eq('role', 'student');

        // Se não há atividades, retornar estatísticas zeradas
        if (!activityIds || activityIds.length === 0) {
          return {
            totalStudents: studentsCount || 0,
            avgGrade: 0,
            onTimeRate: 0,
            openActivities: 0,
            recentActivities: [],
            timestamp: new Date().toISOString()
          };
        }

        // Submissões somente das atividades desta turma
        const { data: subs, count: subsCount } = await supabase
          .from('submissions')
          .select('grade, submitted_at', { count: 'exact' })
          .in('activity_id', activityIds)
          .not('grade', 'is', null)
          .limit(1000);

        const grades = subs?.filter(s => s.grade !== null) || [];
        const avgGrade = grades.length > 0
          ? grades.reduce((sum, s) => sum + parseFloat(s.grade), 0) / grades.length
          : 0;

        const onTimeSubmissions = subs?.filter(s => !!s.submitted_at) || [];
        const onTimeRate = subsCount > 0
          ? Math.round((onTimeSubmissions.length / subsCount) * 100)
          : 0;

        // Montar lista das últimas atividades postadas (até 3)
        const recent = (assignments || [])
          .filter(a => a.activity)
          .slice(0, 3)
          .map(a => ({
            id: a.activity.id,
            title: a.activity.title,
            type: a.activity.type,
            due_date: a.activity.due_date,
            status: a.activity.status,
            assigned_at: a.assigned_at
          }));

        return {
          totalStudents: studentsCount || 0,
          avgGrade: Number(avgGrade.toFixed(1)),
          onTimeRate,
          openActivities: activityIds.length,
          recentActivities: recent,
          timestamp: new Date().toISOString()
        };
      });

      if (cachedStats) {
        setStats({
          totalStudents: cachedStats.totalStudents || 0,
          avgGrade: typeof cachedStats.avgGrade === 'number' ? cachedStats.avgGrade : 0,
          onTimeRate: cachedStats.onTimeRate || 0,
          openActivities: cachedStats.openActivities || 0
        });
        setRecentActivities(Array.isArray(cachedStats.recentActivities) ? cachedStats.recentActivities : []);
      } else {
        setStats({
          totalStudents: 0,
          avgGrade: 0,
          onTimeRate: 0,
          openActivities: 0
        });
        setRecentActivities([]);
      }

    } catch (error) {
      logger.error('Erro ao carregar estatísticas:', error)
      // Fallback para valores padrão em caso de erro
      setStats({
        totalStudents: 0,
        avgGrade: 0,
        onTimeRate: 0,
        openActivities: 0
      });
      setRecentActivities([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Alunos',
      value: stats.totalStudents,
      icon: Users,
      color: 'blue',
      description:
        stats.totalStudents === 0
          ? 'Nenhum aluno matriculado ainda'
          : stats.totalStudents === 1
          ? '1 aluno matriculado na turma'
          : `${stats.totalStudents} alunos matriculados na turma`
    },
    {
      title: 'Nota Média da Turma',
      value: stats.avgGrade.toFixed(1),
      icon: TrendingUp,
      color: stats.avgGrade >= 7 ? 'green' : stats.avgGrade >= 5 ? 'yellow' : 'red',
      description:
        stats.avgGrade === 0
          ? 'Ainda não há notas lançadas para esta turma'
          : 'Baseada nas notas das atividades corrigidas'
    },
    {
      title: 'Taxa de Entrega no Prazo',
      value: `${stats.onTimeRate}%`,
      icon: CheckCircle,
      color: stats.onTimeRate >= 80 ? 'green' : stats.onTimeRate >= 60 ? 'yellow' : 'red',
      description:
        stats.onTimeRate === 0
          ? 'Nenhuma submissão com prazo registrada ainda'
          : 'Entre todas as submissões desta turma'
    },
    {
      title: 'Atividades em Aberto',
      value: stats.openActivities,
      icon: Clock,
      color: stats.openActivities > 10 ? 'red' : stats.openActivities > 5 ? 'yellow' : 'blue',
      description:
        stats.openActivities === 0
          ? 'Nenhuma atividade aberta no momento'
          : 'Atividades já postadas para esta turma'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    red: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
  };

  return (
    <div className="space-y-8">
      {/* ========== SEÇÃO 1: CARDS DE ESTATÍSTICAS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-6 border-2 ${colorClasses[stat.color]}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm font-medium mb-2">{stat.title}</div>
                {stat.description && (
                  <div className="text-xs opacity-75">{stat.description}</div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ========== SEÇÃO 2: PRÓXIMAS AULAS AGENDADAS ========== */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Agenda de Aulas
          </h3>
          <Button variant="outline" size="sm" onClick={() => onTabChange?.('schedule')}>Ver Completa</Button>
        </div>
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Nenhuma aula agendada nos próximos dias
          </p>
          <Button variant="outline" size="sm" onClick={() => handleQuickAction('Agendar Aula')}>
            <Plus className="w-4 h-4 mr-2" />
            Agendar Aula
          </Button>
        </div>
      </Card>

      {/* ========== SEÇÃO 3: ATIVIDADES RECENTES ========== */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Últimas Atividades Postadas
          </h3>
          <Button variant="link" size="sm" onClick={() => onTabChange?.('activities')}>Ver todas</Button>
        </div>
        {recentActivities.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">Nenhuma atividade postada para esta turma.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {activity.title || 'Sem título'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activity.due_date
                      ? `Prazo: ${new Date(activity.due_date).toLocaleDateString('pt-BR')}`
                      : 'Sem prazo definido'}
                  </p>
                </div>
                <div className="ml-4 text-xs text-slate-500 dark:text-slate-400 flex flex-col items-end">
                  <span>
                    Postada{' '}
                    {activity.assigned_at
                      ? new Date(activity.assigned_at).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ========== SEÇÃO 4: ALUNOS EM ALERTA ========== */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            Alunos que Precisam de Atenção
          </h3>
          <Button variant="link" size="sm" onClick={() => onTabChange?.('students')}>Ver todos</Button>
        </div>
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-300 dark:text-green-700 mx-auto mb-3" />
          <p className="text-green-600 dark:text-green-400 font-medium mb-2">
            Nenhum aluno em situação de alerta
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Parabéns! Todos estão acompanhando bem.
          </p>
        </div>
      </Card>

      {/* ========== SEÇÃO 5: AÇÕES RÁPIDAS ========== */}
      <div>
        <h3 className="text-lg font-bold mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: Plus, label: 'Criar Atividade', color: 'blue' },
            { icon: Users, label: 'Adicionar Aluno', color: 'green' },
            { icon: FileText, label: 'Novo Material', color: 'purple' },
            { icon: Calendar, label: 'Agendar Aula', color: 'orange' },
            { icon: Megaphone, label: 'Postar Comunicado', color: 'yellow' },
            { icon: CheckSquare, label: 'Corrigir Trabalhos', color: 'red' }
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Card 
                key={action.label}
                className="p-4 hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleQuickAction(action.label)}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
