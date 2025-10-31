import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart2, TrendingUp, TrendingDown, Users, Target,
  Award, Clock, CheckCircle, AlertCircle, Calendar
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { toast } from '@/shared/components/ui/use-toast';

const MetricsTab = ({ classId }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    avgGrade: 0,
    deliveryRate: 0,
    engagement: 0,
    totalStudents: 0,
    activeStudents: 0,
    totalActivities: 0,
    completedActivities: 0,
    pendingCorrections: 0
  });
  const [topStudents, setTopStudents] = useState([]);
  const [activityMetrics, setActivityMetrics] = useState([]);

  useEffect(() => {
    loadMetrics();
  }, [classId]);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      // Buscar total de alunos
      const { count: studentCount } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('role', 'student');

      // Buscar atividades
      const { data: activities } = await supabase
        .from('activity_class_assignments')
        .select('activity_id')
        .eq('class_id', classId);

      const activityIds = activities?.map(a => a.activity_id) || [];

      // Buscar todas as submissões
      let allSubmissions = [];
      if (activityIds.length > 0) {
        const { data: submissions } = await supabase
          .from('submissions')
          .select('student_id, activity_id, grade, status')
          .in('activity_id', activityIds);

        allSubmissions = submissions || [];
      }

      // Calcular métricas
      const grades = allSubmissions
        .filter(s => s.grade !== null)
        .map(s => parseFloat(s.grade));
      
      const avgGrade = grades.length > 0
        ? grades.reduce((sum, g) => sum + g, 0) / grades.length
        : 0;

      const totalExpected = studentCount * activityIds.length;
      const deliveryRate = totalExpected > 0
        ? (allSubmissions.length / totalExpected) * 100
        : 0;

      const pendingCorrections = allSubmissions.filter(s => s.status === 'submitted').length;

      // Calcular top alunos
      const studentStats = {};
      allSubmissions.forEach(sub => {
        if (!studentStats[sub.student_id]) {
          studentStats[sub.student_id] = { grades: [], submissions: 0 };
        }
        studentStats[sub.student_id].submissions++;
        if (sub.grade !== null) {
          studentStats[sub.student_id].grades.push(parseFloat(sub.grade));
        }
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Object.keys(studentStats));

      const studentsWithAvg = Object.entries(studentStats)
        .map(([studentId, stats]) => {
          const profile = profiles?.find(p => p.id === studentId);
          const avg = stats.grades.length > 0
            ? stats.grades.reduce((sum, g) => sum + g, 0) / stats.grades.length
            : 0;
          
          return {
            id: studentId,
            name: profile?.full_name || 'Desconhecido',
            avgGrade: avg,
            submissions: stats.submissions,
            deliveryRate: (stats.submissions / activityIds.length) * 100
          };
        })
        .sort((a, b) => b.avgGrade - a.avgGrade)
        .slice(0, 5);

      setTopStudents(studentsWithAvg);

      // Métricas por atividade (top 5 com mais submissões)
      const activityStats = {};
      allSubmissions.forEach(sub => {
        if (!activityStats[sub.activity_id]) {
          activityStats[sub.activity_id] = { count: 0, grades: [] };
        }
        activityStats[sub.activity_id].count++;
        if (sub.grade !== null) {
          activityStats[sub.activity_id].grades.push(parseFloat(sub.grade));
        }
      });

      const { data: activitiesData } = await supabase
        .from('activities')
        .select('id, title')
        .in('id', Object.keys(activityStats));

      const activitiesWithStats = Object.entries(activityStats)
        .map(([actId, stats]) => {
          const activity = activitiesData?.find(a => a.id === actId);
          const avgGrade = stats.grades.length > 0
            ? stats.grades.reduce((sum, g) => sum + g, 0) / stats.grades.length
            : 0;
          
          return {
            title: activity?.title || 'Sem título',
            submissions: stats.count,
            avgGrade: avgGrade,
            rate: (stats.count / studentCount) * 100
          };
        })
        .sort((a, b) => b.submissions - a.submissions)
        .slice(0, 5);

      setActivityMetrics(activitiesWithStats);

      setMetrics({
        avgGrade,
        deliveryRate,
        engagement: deliveryRate, // Simplificado
        totalStudents: studentCount || 0,
        activeStudents: Object.keys(studentStats).length,
        totalActivities: activityIds.length,
        completedActivities: activityIds.length, // Simplificado
        pendingCorrections
      });

    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      toast({
        title: 'Erro ao carregar métricas',
        description: error.message,
        variant: 'destructive'
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

  return (
    <div className="space-y-6">
      {/* ========== HEADER ========== */}
      <div>
        <h2 className="text-2xl font-bold">Métricas da Turma</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Análise de desempenho e engajamento
        </p>
      </div>

      {/* ========== CARDS DE KPIs PRINCIPAIS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
              <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600 mb-1">
            {metrics.avgGrade.toFixed(1)}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Nota Média Geral</div>
          <div className="mt-2">
            <Progress value={(metrics.avgGrade / 10) * 100} className="h-2" />
          </div>
        </Card>

        <Card className="p-6 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
              <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {metrics.deliveryRate.toFixed(0)}%
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Taxa de Entrega</div>
          <div className="mt-2">
            <Progress value={metrics.deliveryRate} className="h-2" />
          </div>
        </Card>

        <Card className="p-6 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
              <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {metrics.engagement.toFixed(0)}%
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Engajamento</div>
          <div className="mt-2">
            <Progress value={metrics.engagement} className="h-2" />
          </div>
        </Card>

        <Card className="p-6 border-2 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            {metrics.pendingCorrections > 0 ? (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>
          <div className="text-3xl font-bold text-yellow-600 mb-1">
            {metrics.pendingCorrections}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Correções Pendentes</div>
        </Card>
      </div>

      {/* ========== ESTATÍSTICAS GERAIS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{metrics.totalStudents}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Total de Alunos</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{metrics.activeStudents}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Alunos Ativos</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold">{metrics.totalActivities}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Total Atividades</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-orange-600" />
            <div>
              <div className="text-2xl font-bold">{metrics.completedActivities}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Concluídas</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ========== TOP ALUNOS ========== */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-600" />
          Top 5 Alunos por Desempenho
        </h3>
        
        {topStudents.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Nenhum dado disponível ainda
          </div>
        ) : (
          <div className="space-y-3">
            {topStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold
                    ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-slate-200 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-600'}
                  `}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{student.name}</div>
                    <div className="text-xs text-slate-500">
                      {student.submissions} submissões • {student.deliveryRate.toFixed(0)}% entrega
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {student.avgGrade.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500">Nota Média</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* ========== ATIVIDADES COM MAIS SUBMISSÕES ========== */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-600" />
          Top 5 Atividades por Engajamento
        </h3>
        
        {activityMetrics.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Nenhuma atividade com submissões ainda
          </div>
        ) : (
          <div className="space-y-4">
            {activityMetrics.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">{activity.title}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {activity.submissions} submissões • Média: {activity.avgGrade.toFixed(1)}
                      </div>
                    </div>
                    <Badge className={
                      activity.rate >= 80 ? 'bg-green-100 text-green-700' :
                      activity.rate >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {activity.rate.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={activity.rate} className="h-2" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* ========== PLACEHOLDER PARA GRÁFICOS FUTUROS ========== */}
      <Card className="p-12 text-center border-2 border-dashed">
        <BarChart2 className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
        <h3 className="text-lg font-semibold mb-2">Gráficos Detalhados</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Gráficos de evolução temporal, distribuição de notas e comparativos<br/>
          podem ser adicionados aqui usando Recharts ou Chart.js
        </p>
        <Badge variant="secondary">Em Breve</Badge>
      </Card>
    </div>
  );
};

export default MetricsTab;
