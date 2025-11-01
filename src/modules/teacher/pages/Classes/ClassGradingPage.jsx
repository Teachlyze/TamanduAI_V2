import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DashboardHeader,
  StatsCard,
  SearchInput,
  FilterBar,
  SubmissionCard,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { ClassService } from '@/shared/services/classService';

const ClassGradingPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: null, activityId: null });
  const [stats, setStats] = useState({ total: 0, graded: 0, pending: 0 });
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadData();
  }, [classId]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [submissions, searchQuery, filters]);

  const loadData = async () => {
    try {
      setLoading(true);

      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);

      // Get activities for this class
      const { data: acts } = await supabase
        .from('activity_class_assignments')
        .select('activity:activities(id, title)')
        .eq('class_id', classId);

      const actsList = acts?.map(a => a.activity).filter(Boolean) || [];
      setActivities(actsList);

      // Get submissions for activities in this class
      const activityIds = actsList.map(a => a.id);
      
      if (activityIds.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const { data: subs } = await supabase
        .from('submissions')
        .select(`
          *,
          student:profiles!submissions_user_id_fkey(id, name, email, avatar_url),
          activity:activities(id, title)
        `)
        .in('activity_id', activityIds)
        .order('submitted_at', { ascending: false });

      setSubmissions(subs || []);

      const gradedCount = subs?.filter(s => s.status === 'graded').length || 0;
      const pendingCount = subs?.filter(s => s.status === 'pending').length || 0;

      setStats({
        total: subs?.length || 0,
        graded: gradedCount,
        pending: pendingCount
      });

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...submissions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.student?.name?.toLowerCase().includes(query) ||
        s.activity?.title?.toLowerCase().includes(query)
      );
    }

    if (filters.status) {
      result = result.filter(s => s.status === filters.status);
    }

    if (filters.activityId) {
      result = result.filter(s => s.activity_id === filters.activityId);
    }

    setFilteredSubmissions(result);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
      <Button
        variant="ghost"
        onClick={() => navigate(`/dashboard/classes/${classId}`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <DashboardHeader
        title={`Correções - ${classData?.name || 'Turma'}`}
        subtitle="Submissões para corrigir"
        role="teacher"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total de Submissões"
          value={stats.total}
          icon={CheckCircle2}
          gradient={gradients.primary}
          delay={0}
        />
        <StatsCard
          title="Corrigidas"
          value={stats.graded}
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
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar por aluno ou atividade..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        
        <FilterBar
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'pending', label: 'Pendentes' },
                { value: 'graded', label: 'Corrigidas' }
              ]
            },
            ...(activities.length > 0 ? [{
              key: 'activityId',
              label: 'Atividade',
              options: activities.map(a => ({ value: a.id, label: a.title }))
            }] : [])
          ]}
          activeFilters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={() => {
            setFilters({ status: null, activityId: null });
            setSearchQuery('');
          }}
        />
      </div>

      {filteredSubmissions.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredSubmissions.map((submission, index) => (
            <SubmissionCard
              key={submission.id}
              submission={{
                id: submission.id,
                student: {
                  name: submission.student?.name,
                  avatar: submission.student?.avatar_url
                },
                activity: { title: submission.activity?.title },
                submittedAt: submission.submitted_at,
                status: submission.status,
                grade: submission.grade,
                feedback: submission.feedback
              }}
              onView={() => navigate(`/dashboard/grading/${submission.id}`)}
              onGrade={() => navigate(`/dashboard/grading/${submission.id}`)}
              delay={index * 0.05}
            />
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title={searchQuery || filters.status ? 'Nenhuma submissão encontrada' : 'Nenhuma submissão nesta turma'}
          description={searchQuery || filters.status ? 'Ajuste os filtros.' : 'Aguardando submissões dos alunos.'}
        />
      )}
    </div>
  );
};

export default ClassGradingPage;
