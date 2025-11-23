import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/components/ui/use-toast';
import {
  DashboardHeader,
  StatsCard,
  SearchInput,
  SubmissionCard,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import Breadcrumb from '@/shared/components/ui/Breadcrumb';

const ActivitySubmissionsPage = () => {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    graded: 0,
    pending: 0
  });

  useEffect(() => {
    loadData();
  }, [activityId]);

  useEffect(() => {
    applySearch();
  }, [submissions, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Debug simples no console
      console.log('🔍 ActivitySubmissionsPage - activityId:', activityId);
      
      if (!activityId) {
        console.error('❌ activityId é undefined!');
        throw new Error('ID da atividade não fornecido');
      }

      // Load activity
      const { data: activityData, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .single();

      if (activityError) {
        logger.error('Erro ao carregar atividade:', activityError);
        throw activityError;
      }
      setActivity(activityData);
      logger.debug('Atividade carregada:', activityData?.title);

      // Load submissions
      logger.debug('Carregando submissões para activity_id:', activityId);
      
      // Primeiro, tentar query simples sem joins
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('activity_id', activityId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) {
        logger.error('Erro ao carregar submissões:', submissionsError);
        throw submissionsError;
      }

      logger.debug('Submissões carregadas:', submissionsData?.length || 0);
      
      // Se temos submissões, buscar dados dos alunos
      let submissionsWithProfiles = submissionsData || [];
      if (submissionsData && submissionsData.length > 0) {
        const studentIds = submissionsData.map(s => s.student_id).filter(Boolean);
        if (studentIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', studentIds);
            
          if (profilesError) {
            logger.error('Erro ao carregar perfis:', profilesError);
          } else {
            // Combinar dados
            submissionsWithProfiles = submissionsData.map(submission => ({
              ...submission,
              profiles: profilesData.find(profile => profile.id === submission.student_id)
            }));
          }
        }
      }
      
      setSubmissions(submissionsWithProfiles);

      // Calculate stats
      const gradedCount = submissionsData?.filter(s => s.status === 'graded').length || 0;
      const pendingCount = submissionsData?.filter(s => s.status === 'pending').length || 0;

      setStats({
        total: submissionsData?.length || 0,
        graded: gradedCount,
        pending: pendingCount
      });

    } catch (error) {
      logger.error('Erro ao carregar submissões:', error)
      console.error('ActivitySubmissionsPage - Erro completo:', error);
      toast({ 
        title: 'Erro ao carregar submissões',
        description: error?.message || 'Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      logger.debug('ActivitySubmissionsPage: setLoading(false)');
      setLoading(false);
    }
  };

  const applySearch = () => {
    if (!searchQuery) {
      setFilteredSubmissions(submissions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = submissions.filter(submission =>
      submission.profiles?.full_name?.toLowerCase().includes(query) ||
      submission.profiles?.email?.toLowerCase().includes(query)
    );
    setFilteredSubmissions(filtered);
  };

  const handleViewSubmission = (submission) => {
    navigate(`/dashboard/grading/${submission.id}`);
  };

  const handleGradeSubmission = (submission) => {
    navigate(`/dashboard/grading/${submission.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando submissões..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <Breadcrumb
        items={[
          { label: 'Atividades', path: '/dashboard/activities' },
          { label: activity?.title || 'Atividade' }
        ]}
        className="mb-4"
      />

      {/* Header */}
      <DashboardHeader
        title={activity?.title || 'Atividade'}
        subtitle={`Submissões dos alunos • Prazo: ${activity?.due_date ? new Date(activity.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}`}
        role="teacher"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total de Submissões"
          value={stats.total}
          icon={FileText}
          gradient={gradients.stats.activities}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
          delay={0}
        />
        <StatsCard
          title="Corrigidas"
          value={stats.graded}
          icon={CheckCircle2}
          gradient={gradients.success}
          bgColor="bg-green-50 dark:bg-green-950/30"
          delay={0.1}
        />
        <StatsCard
          title="Pendentes"
          value={stats.pending}
          icon={Clock}
          gradient={gradients.warning}
          bgColor="bg-amber-50 dark:bg-amber-950/30"
          delay={0.2}
        />
      </div>

      {/* Search */}
      <div className="mb-8">
        <SearchInput
          placeholder="Buscar por nome ou email do aluno..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* Submissions Grid */}
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
                  name: submission.profiles?.full_name || 'Aluno',
                  avatar: submission.profiles?.avatar_url
                },
                activity: {
                  title: activity?.title
                },
                submittedAt: submission.submitted_at,
                status: submission.status || 'pending',
                grade: submission.grade,
                feedback: submission.feedback,
                isLate: submission.due_date && new Date(submission.submitted_at) > new Date(submission.due_date)
              }}
              onView={handleViewSubmission}
              onGrade={handleGradeSubmission}
              delay={index * 0.05}
            />
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={AlertCircle}
          title={searchQuery ? 'Nenhuma submissão encontrada' : 'Nenhuma submissão ainda'}
          description={
            searchQuery
              ? 'Tente buscar por outro termo.'
              : 'Os alunos ainda não enviaram suas respostas para esta atividade.'
          }
        />
      )}
    </div>
  );
};

export default ActivitySubmissionsPage;
