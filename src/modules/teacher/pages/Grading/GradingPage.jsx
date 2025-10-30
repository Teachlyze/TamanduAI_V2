import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  DashboardHeader,
  GradeForm
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';

const GradingPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [activity, setActivity] = useState(null);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);

      // Load submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .select(`
          *,
          student:profiles!submissions_user_id_fkey(id, name, email, avatar_url),
          activity:activities(id, title, max_grade, due_date)
        `)
        .eq('id', submissionId)
        .single();

      if (submissionError) throw submissionError;
      setSubmission(submissionData);
      setActivity(submissionData.activity);

      // Load all submissions for this activity (for navigation)
      const { data: allSubs, error: allSubsError } = await supabase
        .from('submissions')
        .select('id, user_id, status')
        .eq('activity_id', submissionData.activity_id)
        .order('submitted_at', { ascending: true });

      if (!allSubsError) {
        setAllSubmissions(allSubs || []);
        const index = allSubs?.findIndex(s => s.id === submissionId) ?? 0;
        setCurrentIndex(index);
      }

    } catch (error) {
      console.error('Erro ao carregar submissão:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGrade = async ({ grade, feedback }) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('submissions')
        .update({
          grade,
          feedback,
          status: 'graded',
          graded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      alert('Nota salva com sucesso!');
      
      // Navigate to next submission or back
      if (currentIndex < allSubmissions.length - 1) {
        const nextSubmission = allSubmissions[currentIndex + 1];
        navigate(`/teacher/grading/${nextSubmission.id}`);
      } else {
        navigate(`/teacher/activities/${activity?.id}/submissions`);
      }

    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      alert('Erro ao salvar nota. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleNavigate = (direction) => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < allSubmissions.length) {
      const targetSubmission = allSubmissions[newIndex];
      navigate(`/teacher/grading/${targetSubmission.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando submissão..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(`/teacher/activities/${activity?.id}/submissions`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Submissões
      </Button>

      {/* Header */}
      <DashboardHeader
        title="Corrigir Submissão"
        subtitle={`${activity?.title || 'Atividade'} • ${currentIndex + 1} de ${allSubmissions.length}`}
        role="teacher"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Info & Submission Content */}
        <div className="space-y-6">
          {/* Student Card */}
          <Card className="p-6 bg-white dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações do Aluno
            </h3>
            
            <div className="flex items-center gap-4 mb-4">
              {submission?.student?.avatar_url ? (
                <img
                  src={submission.student.avatar_url}
                  alt={submission.student.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                  {submission?.student?.name?.[0] || 'A'}
                </div>
              )}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-lg">
                  {submission?.student?.name || 'Aluno'}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {submission?.student?.email || 'Sem email'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600 dark:text-slate-400">Data de Envio:</span>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {submission?.submitted_at 
                    ? new Date(submission.submitted_at).toLocaleString('pt-BR')
                    : 'Não enviada'
                  }
                </p>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Status:</span>
                <div className="mt-1">
                  <Badge className={
                    submission?.status === 'graded'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  }>
                    {submission?.status === 'graded' ? 'Corrigida' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Submission Content */}
          <Card className="p-6 bg-white dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Conteúdo da Submissão
            </h3>
            
            <div className="prose dark:prose-invert max-w-none">
              {submission?.content ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {typeof submission.content === 'string' 
                      ? submission.content 
                      : JSON.stringify(submission.content, null, 2)
                    }
                  </pre>
                </div>
              ) : (
                <p className="text-slate-600 dark:text-slate-400">
                  Nenhum conteúdo enviado.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Grading Form */}
        <div className="space-y-6">
          <GradeForm
            maxGrade={activity?.max_grade || 10}
            initialGrade={submission?.grade}
            initialFeedback={submission?.feedback || ''}
            onSave={handleSaveGrade}
            onCancel={() => navigate(`/teacher/activities/${activity?.id}/submissions`)}
            loading={saving}
          />

          {/* Navigation */}
          <Card className="p-4 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => handleNavigate('prev')}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
              
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {currentIndex + 1} de {allSubmissions.length}
              </span>

              <Button
                variant="outline"
                onClick={() => handleNavigate('next')}
                disabled={currentIndex >= allSubmissions.length - 1}
              >
                Próxima
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GradingPage;
