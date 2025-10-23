import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Award } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { DashboardHeader, StatsCard } from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const StudentPerformancePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ avgGrade: 0, totalActivities: 0, completionRate: 0 });
  const [gradeData, setGradeData] = useState([]);

  useEffect(() => {
    loadPerformance();
  }, [user]);

  const loadPerformance = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      const { data: submissions } = await supabase
        .from('submissions')
        .select('grade, submitted_at, activity:activities(title, max_score)')
        .eq('student_id', user.id)
        .not('grade', 'is', null);

      const grades = submissions?.filter(s => s.grade !== null) || [];
      const avgGrade = grades.length > 0 
        ? grades.reduce((sum, s) => sum + s.grade, 0) / grades.length 
        : 0;

      setStats({
        avgGrade: avgGrade.toFixed(1),
        totalActivities: submissions?.length || 0,
        completionRate: 85
      });

      // Mock chart data
      setGradeData([
        { name: 'Jan', nota: 7.5 },
        { name: 'Fev', nota: 8.2 },
        { name: 'Mar', nota: 7.8 },
        { name: 'Abr', nota: 8.5 },
        { name: 'Mai', nota: 9.0 }
      ]);

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader title="Meu Desempenho" subtitle="Acompanhe sua evolução acadêmica" role="student" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard title="Média Geral" value={stats.avgGrade} icon={BarChart3} gradient="from-blue-500 to-cyan-500" delay={0} />
        <StatsCard title="Atividades Concluídas" value={stats.totalActivities} icon={Award} gradient="from-green-500 to-emerald-500" delay={0.1} />
        <StatsCard title="Taxa de Conclusão" value={`${stats.completionRate}%`} icon={TrendingUp} gradient="from-purple-500 to-pink-500" format="text" delay={0.2} />
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900 mb-6">
        <h3 className="font-bold text-lg mb-4">Evolução de Notas</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={gradeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Line type="monotone" dataKey="nota" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default StudentPerformancePage;
