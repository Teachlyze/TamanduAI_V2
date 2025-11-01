import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, ClipboardList, Clock, AlertCircle, TrendingUp, CheckCircle,
  Calendar, Filter, Download, Share2, Bell, BookOpen, Shield, Activity,
  BarChart3, PieChart, LineChart, Target, Award, Zap, TrendingDown
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Progress } from '@/shared/components/ui/progress';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader, StatsCard, gradients } from '@/shared/design';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import {
  LineChart as RechartsLine, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, Area, AreaChart, ScatterChart, Scatter
} from 'recharts';
import { supabase } from '@/shared/services/supabaseClient';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TeacherAnalyticsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30'); // dias
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [activityTypes, setActivityTypes] = useState(['all']);
  const [statusFilter, setStatusFilter] = useState(['graded']);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Dados
  const [classes, setClasses] = useState([]);
  const [kpis, setKpis] = useState({
    totalStudents: 0,
    totalActivities: 0,
    pendingCorrections: 0,
    avgGrade: 0,
    onTimeRate: 0,
    openActivities: 0
  });
  const [gradeEvolution, setGradeEvolution] = useState([]);
  const [classComparison, setClassComparison] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [weeklyTrends, setWeeklyTrends] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [plagiarismStats, setPlagiarismStats] = useState(null);
  const [engagementStats, setEngagementStats] = useState(null);

  useEffect(() => {
    loadAllData();
  }, [user, period, selectedClasses, activityTypes, statusFilter]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadAllData, 5 * 60 * 1000); // 5 minutos
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadAllData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadClasses(),
        loadKPIs(),
        loadGradeEvolution(),
        loadClassComparison(),
        loadGradeDistribution(),
        loadWeeklyTrends(),
        loadTopStudents(),
        loadPlagiarismStats(),
        loadEngagementStats()
      ]);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de analytics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, subject, color')
      .eq('created_by', user.id)
      .eq('is_active', true);

    if (!error && data) {
      setClasses(data);
      if (selectedClasses.length === 0) {
        setSelectedClasses(data.map(c => c.id));
      }
    }
  };

  const loadKPIs = async () => {
    const dateFilter = period === 'all' ? null : format(subDays(new Date(), parseInt(period)), 'yyyy-MM-dd');

    // Total de alunos únicos
    const { data: membersData } = await supabase
      .from('class_members')
      .select('user_id')
      .in('class_id', selectedClasses)
      .eq('role', 'student');

    const uniqueStudents = new Set(membersData?.map(m => m.user_id) || []).size;

    // Atividades postadas no período
    let activitiesQuery = supabase
      .from('activity_class_assignments')
      .select('activity_id, activities!inner(id, created_at, status)')
      .in('class_id', selectedClasses);

    if (dateFilter) {
      activitiesQuery = activitiesQuery.gte('activities.created_at', dateFilter);
    }

    const { data: activitiesData } = await activitiesQuery;
    const totalActivities = new Set(activitiesData?.map(a => a.activity_id) || []).size;

    // Correções pendentes
    const { data: pendingData } = await supabase
      .from('submissions')
      .select('id, activity_id, activities!inner(id, activity_class_assignments!inner(class_id))')
      .eq('status', 'submitted')
      .in('activities.activity_class_assignments.class_id', selectedClasses);

    const pendingCorrections = pendingData?.length || 0;

    // Média geral de notas
    let gradesQuery = supabase
      .from('submissions')
      .select('grade, activity_id, activities!inner(id, activity_class_assignments!inner(class_id))')
      .not('grade', 'is', null)
      .in('activities.activity_class_assignments.class_id', selectedClasses);

    if (dateFilter) {
      gradesQuery = gradesQuery.gte('graded_at', dateFilter);
    }

    const { data: gradesData } = await gradesQuery;
    const avgGrade = gradesData?.length > 0
      ? (gradesData.reduce((sum, s) => sum + (s.grade || 0), 0) / gradesData.length).toFixed(1)
      : 0;

    // Taxa de entrega no prazo
    const { data: onTimeData } = await supabase
      .from('submissions')
      .select('submitted_at, activity_id, activities!inner(due_date, activity_class_assignments!inner(class_id))')
      .eq('status', 'submitted')
      .in('activities.activity_class_assignments.class_id', selectedClasses)
      .not('submitted_at', 'is', null)
      .not('activities.due_date', 'is', null);

    const onTime = onTimeData?.filter(s => 
      new Date(s.submitted_at) <= new Date(s.activities.due_date)
    ).length || 0;
    const onTimeRate = onTimeData?.length > 0
      ? Math.round((onTime / onTimeData.length) * 100)
      : 0;

    // Atividades em aberto
    const { data: openData } = await supabase
      .from('activity_class_assignments')
      .select('activity_id, activities!inner(status, due_date)')
      .in('class_id', selectedClasses)
      .eq('activities.status', 'active')
      .gte('activities.due_date', new Date().toISOString());

    const openActivities = openData?.length || 0;

    setKpis({
      totalStudents: uniqueStudents,
      totalActivities,
      pendingCorrections,
      avgGrade: parseFloat(avgGrade),
      onTimeRate,
      openActivities
    });
  };

  const loadGradeEvolution = async () => {
    const days = period === 'all' ? 90 : parseInt(period);
    const data = [];

    for (let i = days; i >= 0; i -= days > 90 ? 7 : days > 30 ? 3 : 1) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const { data: grades } = await supabase
        .from('submissions')
        .select('grade, activity_id, activities!inner(activity_class_assignments!inner(class_id))')
        .not('grade', 'is', null)
        .in('activities.activity_class_assignments.class_id', selectedClasses)
        .eq('graded_at', dateStr);

      const avg = grades?.length > 0
        ? grades.reduce((sum, s) => sum + s.grade, 0) / grades.length
        : null;

      if (avg !== null) {
        data.push({
          date: format(date, 'dd/MM'),
          media: parseFloat(avg.toFixed(2)),
          submissoes: grades.length
        });
      }
    }

    setGradeEvolution(data);
  };

  const loadClassComparison = async () => {
    const comparison = [];

    for (const classItem of classes.filter(c => selectedClasses.includes(c.id))) {
      // Média da turma
      const { data: grades } = await supabase
        .from('submissions')
        .select('grade, activity_id, activities!inner(activity_class_assignments!inner(class_id))')
        .not('grade', 'is', null)
        .eq('activities.activity_class_assignments.class_id', classItem.id);

      const avgGrade = grades?.length > 0
        ? grades.reduce((sum, s) => sum + s.grade, 0) / grades.length
        : 0;

      // Total de alunos
      const { data: students } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classItem.id)
        .eq('role', 'student');

      // Taxa de entrega
      const { data: onTime } = await supabase
        .from('submissions')
        .select('submitted_at, activity_id, activities!inner(due_date, activity_class_assignments!inner(class_id))')
        .eq('activities.activity_class_assignments.class_id', classItem.id)
        .not('submitted_at', 'is', null)
        .not('activities.due_date', 'is', null);

      const onTimeCount = onTime?.filter(s => 
        new Date(s.submitted_at) <= new Date(s.activities.due_date)
      ).length || 0;
      const deliveryRate = onTime?.length > 0
        ? Math.round((onTimeCount / onTime.length) * 100)
        : 0;

      comparison.push({
        name: classItem.name,
        subject: classItem.subject,
        students: students?.length || 0,
        avgGrade: parseFloat(avgGrade.toFixed(2)),
        deliveryRate,
        color: classItem.color || '#3B82F6'
      });
    }

    setClassComparison(comparison);
  };

  const loadGradeDistribution = async () => {
    const { data: grades } = await supabase
      .from('submissions')
      .select('grade, activity_id, activities!inner(activity_class_assignments!inner(class_id))')
      .not('grade', 'is', null)
      .in('activities.activity_class_assignments.class_id', selectedClasses);

    const distribution = [
      { range: '0-2', count: 0, color: '#EF4444' },
      { range: '2-4', count: 0, color: '#F97316' },
      { range: '4-6', count: 0, color: '#F59E0B' },
      { range: '6-8', count: 0, color: '#3B82F6' },
      { range: '8-10', count: 0, color: '#10B981' }
    ];

    grades?.forEach(({ grade }) => {
      if (grade < 2) distribution[0].count++;
      else if (grade < 4) distribution[1].count++;
      else if (grade < 6) distribution[2].count++;
      else if (grade < 8) distribution[3].count++;
      else distribution[4].count++;
    });

    setGradeDistribution(distribution);
  };

  const loadWeeklyTrends = async () => {
    const weeks = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = subDays(new Date(), i * 7);
      const weekEnd = subDays(new Date(), (i - 1) * 7);

      const { data: submissions } = await supabase
        .from('submissions')
        .select('submitted_at, status, activity_id, activities!inner(due_date, activity_class_assignments!inner(class_id))')
        .in('activities.activity_class_assignments.class_id', selectedClasses)
        .gte('submitted_at', format(weekStart, 'yyyy-MM-dd'))
        .lte('submitted_at', format(weekEnd, 'yyyy-MM-dd'));

      const onTime = submissions?.filter(s => 
        s.activities?.due_date && new Date(s.submitted_at) <= new Date(s.activities.due_date)
      ).length || 0;

      const late = submissions?.filter(s =>
        s.activities?.due_date && new Date(s.submitted_at) > new Date(s.activities.due_date)
      ).length || 0;

      weeks.push({
        week: `S${12 - i}`,
        noPrazo: onTime,
        atrasadas: late,
        total: submissions?.length || 0
      });
    }

    setWeeklyTrends(weeks);
  };

  const loadTopStudents = async () => {
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        grade,
        student_id,
        student:profiles!submissions_student_id_fkey(id, full_name, avatar_url),
        activity_id,
        activities!inner(activity_class_assignments!inner(class_id))
      `)
      .not('grade', 'is', null)
      .in('activities.activity_class_assignments.class_id', selectedClasses);

    const studentGrades = {};
    submissions?.forEach(s => {
      if (!studentGrades[s.student_id]) {
        studentGrades[s.student_id] = {
          student: s.student,
          grades: [],
          total: 0
        };
      }
      studentGrades[s.student_id].grades.push(s.grade);
      studentGrades[s.student_id].total++;
    });

    const ranked = Object.entries(studentGrades)
      .map(([id, data]) => ({
        id,
        name: data.student?.full_name || 'Sem nome',
        avatar: data.student?.avatar_url,
        avgGrade: data.grades.reduce((sum, g) => sum + g, 0) / data.grades.length,
        activities: data.total
      }))
      .sort((a, b) => b.avgGrade - a.avgGrade)
      .slice(0, 10);

    setTopStudents(ranked);
  };

  const loadPlagiarismStats = async () => {
    const { data: checks } = await supabase
      .from('plagiarism_checks')
      .select(`
        plagiarism_percentage,
        ai_generated,
        submission_id,
        submissions!inner(activity_id, activities!inner(activity_class_assignments!inner(class_id)))
      `)
      .in('submissions.activities.activity_class_assignments.class_id', selectedClasses);

    if (!checks || checks.length === 0) {
      setPlagiarismStats(null);
      return;
    }

    const avgOriginality = checks.reduce((sum, c) => sum + (100 - (c.plagiarism_percentage || 0)), 0) / checks.length;
    const casesDetected = checks.filter(c => (100 - c.plagiarism_percentage) < 70).length;

    setPlagiarismStats({
      avgOriginality: Math.round(avgOriginality),
      totalChecks: checks.length,
      casesDetected,
      aiDetected: checks.filter(c => c.ai_generated).length
    });
  };

  const loadEngagementStats = async () => {
    // Placeholder - requires activity tracking implementation
    setEngagementStats({
      uniqueAccess: 0,
      avgSessionTime: 0,
      returnRate: 0,
      interactions: 0
    });
  };

  const handleExportDashboard = () => {
    toast({ title: 'Em desenvolvimento', description: 'Exportação de dashboard será implementada em breve' });
  };

  const handleConfigureAlerts = () => {
    toast({ title: 'Em desenvolvimento', description: 'Configuração de alertas será implementada em breve' });
  };

  const applyFilters = () => {
    loadAllData();
    toast({ title: 'Filtros aplicados' });
  };

  const clearFilters = () => {
    setPeriod('30');
    setSelectedClasses(classes.map(c => c.id));
    setActivityTypes(['all']);
    setStatusFilter(['graded']);
    toast({ title: 'Filtros limpos' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header */}
      <DashboardHeader
        title="Analytics e Insights"
        subtitle="Análise completa de desempenho e tendências"
        role="teacher"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleConfigureAlerts}>
              <Bell className="w-4 h-4 mr-2" />
              Configurar Alertas
            </Button>
            <Button variant="outline" onClick={handleExportDashboard}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Dashboard
            </Button>
          </div>
        }
      />

      {/* Filtros Globais */}
      <Card className="p-6 mb-6 sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-lg">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Período
            </label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 180 dias</SelectItem>
                <SelectItem value="all">Todo o Período</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={applyFilters}>
              <Filter className="w-4 h-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Limpar
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              id="auto-refresh"
            />
            <label htmlFor="auto-refresh" className="text-sm cursor-pointer">
              Auto-atualizar (5min)
            </label>
          </div>
        </div>

        {selectedClasses.length < classes.length && (
          <Badge className="mt-3">
            {selectedClasses.length} de {classes.length} turmas selecionadas
          </Badge>
        )}
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatsCard
          title="Total de Alunos"
          value={kpis.totalStudents}
          icon={Users}
          gradient={gradients.primary}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
        />
        <StatsCard
          title="Atividades Postadas"
          value={kpis.totalActivities}
          icon={ClipboardList}
          gradient={gradients.info}
          bgColor="bg-cyan-50 dark:bg-cyan-950/30"
        />
        <StatsCard
          title="Atividades Abertas"
          value={kpis.openActivities}
          icon={Clock}
          gradient={gradients.warning}
          bgColor="bg-yellow-50 dark:bg-yellow-950/30"
        />
        <StatsCard
          title="Aguardando Correção"
          value={kpis.pendingCorrections}
          icon={AlertCircle}
          gradient={gradients.danger}
          bgColor="bg-red-50 dark:bg-red-950/30"
        />
        <StatsCard
          title="Nota Média Geral"
          value={kpis.avgGrade.toFixed(1)}
          icon={TrendingUp}
          gradient={kpis.avgGrade >= 7 ? gradients.success : kpis.avgGrade >= 5 ? gradients.warning : gradients.danger}
          bgColor={kpis.avgGrade >= 7 ? "bg-green-50 dark:bg-green-950/30" : "bg-yellow-50 dark:bg-yellow-950/30"}
        />
        <StatsCard
          title="Taxa Entrega no Prazo"
          value={`${kpis.onTimeRate}%`}
          icon={CheckCircle}
          gradient={gradients.success}
          bgColor="bg-green-50 dark:bg-green-950/30"
        />
      </div>

      {/* Continue com os outros componentes... */}
      
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">Demais seções em implementação...</p>
      </div>
    </div>
  );
};

export default TeacherAnalyticsPage;
