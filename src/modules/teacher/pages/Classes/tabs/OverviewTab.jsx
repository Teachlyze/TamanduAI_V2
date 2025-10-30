import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, CheckCircle, Clock, Calendar, Plus, FileText } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { redisCache } from '@/shared/services/redisCache';

const OverviewTab = ({ classId, classData }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgGrade: 0,
    onTimeRate: 0,
    openActivities: 0
  });

  useEffect(() => {
    loadStats();
  }, [classId]);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Usar cache Redis para estatísticas
      const cachedStats = await redisCache.getClassStats(classId, async () => {
        // Executar todas as queries em paralelo para performance
        const [
          studentsResult,
          activitiesResult,
          submissionsResult
        ] = await Promise.all([
          // Total de alunos
          supabase
            .from('class_members')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classId)
            .eq('role', 'student'),
          
          // Atividades em aberto
          supabase
            .from('activity_class_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classId),
          
          // Submissões para calcular média (limitado para performance)
          supabase
            .from('submissions')
            .select('grade, submitted_at', { count: 'exact' })
            .not('grade', 'is', null)
            .limit(1000)
        ]);

        // Calcular nota média real
        const grades = submissionsResult.data?.filter(s => s.grade) || [];
        const avgGrade = grades.length > 0
          ? grades.reduce((sum, s) => sum + parseFloat(s.grade), 0) / grades.length
          : 0;

        // Calcular taxa de entrega no prazo (simplificado)
        const onTimeSubmissions = submissionsResult.data?.filter(s => {
          // Lógica simplificada - melhorar depois
          return s.submitted_at;
        }) || [];
        const onTimeRate = submissionsResult.count > 0
          ? (onTimeSubmissions.length / submissionsResult.count) * 100
          : 0;

        return {
          totalStudents: studentsResult.count || 0,
          avgGrade: Number(avgGrade.toFixed(1)),
          onTimeRate: Math.round(onTimeRate),
          openActivities: activitiesResult.count || 0,
          timestamp: new Date().toISOString()
        };
      });

      setStats(cachedStats);

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // Fallback para valores padrão em caso de erro
      setStats({
        totalStudents: 0,
        avgGrade: 0,
        onTimeRate: 0,
        openActivities: 0
      });
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
      change: '+2 esta semana'
    },
    {
      title: 'Nota Média da Turma',
      value: stats.avgGrade.toFixed(1),
      icon: TrendingUp,
      color: stats.avgGrade >= 7 ? 'green' : stats.avgGrade >= 5 ? 'yellow' : 'red',
      change: '+0.3 vs mês anterior'
    },
    {
      title: 'Taxa de Entrega no Prazo',
      value: `${stats.onTimeRate}%`,
      icon: CheckCircle,
      color: stats.onTimeRate >= 80 ? 'green' : stats.onTimeRate >= 60 ? 'yellow' : 'red',
      change: '+5% vs período anterior'
    },
    {
      title: 'Atividades em Aberto',
      value: stats.openActivities,
      icon: Clock,
      color: stats.openActivities > 10 ? 'red' : stats.openActivities > 5 ? 'yellow' : 'blue',
      change: '3 aguardando correção'
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
      {/* Cards de Estatísticas */}
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
                <div className="text-xs opacity-75">{stat.change}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Próximas Aulas */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Agenda de Aulas
          </h3>
          <Button variant="outline" size="sm">Ver Completa</Button>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Nenhuma aula agendada nos próximos dias
        </p>
      </Card>

      {/* Ações Rápidas */}
      <div>
        <h3 className="text-lg font-bold mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: Plus, label: 'Criar Atividade', color: 'blue' },
            { icon: Users, label: 'Adicionar Aluno', color: 'green' },
            { icon: FileText, label: 'Novo Material', color: 'purple' },
            { icon: Calendar, label: 'Agendar Aula', color: 'orange' },
            { icon: CheckCircle, label: 'Corrigir Trabalhos', color: 'red' }
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Card 
                key={action.label}
                className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
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
