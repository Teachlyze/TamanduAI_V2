import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Calendar, TrendingUp, Award, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  DashboardHeader,
  StatsCard,
  DataTable,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';

const StudentDetailPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({
    average: 0,
    completed: 0,
    pending: 0,
    xp: 0
  });

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get student profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single();

      // Get classes
      const { data: memberClasses } = await supabase
        .from('class_members')
        .select('class:classes(id, name)')
        .eq('user_id', studentId)
        .eq('role', 'student');

      // Get submissions
      const { data: subs } = await supabase
        .from('submissions')
        .select(`
          *,
          activity:activities(
            id, 
            title, 
            max_score,
            assignments:activity_class_assignments(
              class:classes(name)
            )
          )
        `)
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false });

      // Get gamification
      const { data: gamification } = await supabase
        .from('gamification_profiles')
        .select('*')
        .eq('user_id', studentId)
        .single();

      // Calculate stats
      const grades = subs?.filter(s => s.grade !== null).map(s => s.grade) || [];
      const average = grades.length > 0
        ? grades.reduce((a, b) => a + b, 0) / grades.length
        : 0;

      const completed = subs?.filter(s => s.status === 'graded').length || 0;
      const pending = subs?.filter(s => s.status === 'pending').length || 0;

      setStudent({
        ...profile,
        name: profile?.full_name || profile?.name || profile?.email || 'Aluno',
        classes: memberClasses?.map(m => m.class).filter(Boolean) || []
      });

      setSubmissions(subs || []);

      setStats({
        average: Number(average.toFixed(2)),
        completed,
        pending,
        xp: gamification?.xp_total || 0
      });

    } catch (error) {
      logger.error('Erro:', error)
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'activity',
      label: 'Atividade',
      render: (_, row) => row.activity?.title || 'Sem título'
    },
    {
      key: 'class',
      label: 'Turma',
      render: (_, row) => row.activity?.assignments?.[0]?.class?.name || '-'
    },
    {
      key: 'submitted_at',
      label: 'Data de Envio',
      type: 'date'
    },
    {
      key: 'grade',
      label: 'Nota',
      render: (_, row) => {
        if (row.grade === null) return '-';
        return (
          <span className="font-semibold">
            {row.grade.toFixed(2)} / {row.activity?.max_score || 10}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      render: (_, row) => (
        <Badge className={
          row.status === 'graded'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
        }>
          {row.status === 'graded' ? 'Corrigida' : 'Pendente'}
        </Badge>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard/students')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <DashboardHeader
        title="Perfil do Aluno"
        subtitle={student?.name || 'Aluno'}
        role="teacher"
      />

      {/* Student Info Card */}
      <Card className="p-6 bg-white dark:bg-slate-900 mb-8">
        <div className="flex items-center gap-6 mb-6">
          {student?.avatar_url ? (
            <img src={student.avatar_url} alt={student.name} className="w-24 h-24 rounded-full" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-4xl font-bold">
              {student?.name?.[0] || 'A'}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {student?.name || 'Sem nome'}
            </h2>
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {student?.email}
              </div>
              {student?.created_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Desde {new Date(student.created_at).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {student?.classes.map((cls, i) => (
            <Badge key={i} variant="secondary">{cls.name}</Badge>
          ))}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Média Geral"
          value={stats.average.toFixed(2)}
          icon={TrendingUp}
          gradient={gradients.primary}
          format="text"
          delay={0}
        />
        <StatsCard
          title="Atividades Concluídas"
          value={stats.completed}
          icon={CheckCircle2}
          gradient={gradients.success}
          delay={0.1}
        />
        <StatsCard
          title="Pendentes"
          value={stats.pending}
          icon={Clock}
          gradient={gradients.warning}
          delay={0.2}
        />
        <StatsCard
          title="XP Total"
          value={stats.xp}
          icon={Award}
          gradient="from-amber-500 to-orange-500"
          delay={0.3}
        />
      </div>

      {/* Banner PRO */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 mb-8">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          💎 <strong>Versão PRO:</strong> Gráficos de evolução, análise detalhada de desempenho e comparação com a turma.
        </p>
      </Card>

      {/* Submissions Table */}
      <Card className="p-6 bg-white dark:bg-slate-900">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
          Histórico de Atividades
        </h3>
        
        {submissions.length > 0 ? (
          <DataTable
            columns={columns}
            data={submissions}
            sortBy="submitted_at"
            sortOrder="desc"
          />
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="Nenhuma atividade ainda"
            description="O aluno ainda não enviou atividades."
          />
        )}
      </Card>
    </div>
  );
};

export default StudentDetailPage;
