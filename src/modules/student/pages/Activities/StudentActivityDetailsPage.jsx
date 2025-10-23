import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import { DashboardHeader } from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const StudentActivityDetailsPage = () => {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activity, setActivity] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadActivity();
  }, [activityId, user]);

  const loadActivity = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get activity details
      const { data: act } = await supabase
        .from('activities')
        .select(`
          *,
          created_by_user:profiles!activities_created_by_fkey (
            id,
            name
          )
        `)
        .eq('id', activityId)
        .single();

      setActivity(act);

      // Check for existing submission
      const { data: sub } = await supabase
        .from('submissions')
        .select(`
          *,
          feedback:feedbacks (*)
        `)
        .eq('activity_id', activityId)
        .eq('student_id', user.id)
        .single();

      if (sub) {
        setSubmission(sub);
        setContent(sub.content || '');
      }

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert('Por favor, escreva sua resposta');
      return;
    }

    try {
      setSubmitting(true);

      if (submission) {
        // Update existing submission
        const { error } = await supabase
          .from('submissions')
          .update({
            content,
            submitted_at: new Date().toISOString(),
            status: 'submitted'
          })
          .eq('id', submission.id);

        if (error) throw error;
      } else {
        // Create new submission
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            activity_id: activityId,
            student_id: user.id,
            content,
            submitted_at: new Date().toISOString(),
            status: 'submitted'
          })
          .select()
          .single();

        if (error) throw error;
        setSubmission(data);
      }

      alert('Atividade enviada com sucesso!');
      loadActivity();

    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao enviar atividade');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isLate = activity?.due_date && new Date(activity.due_date) < new Date();
  const hasGrade = submission?.grade !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/student/activities')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <DashboardHeader
        title={activity?.title || 'Atividade'}
        subtitle={`Por ${activity?.created_by_user?.name || 'Professor'}`}
        role="student"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Info */}
          <Card className="p-6 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-4">
              <Badge className={
                activity?.status === 'active' ? 'bg-green-100 text-green-700' :
                'bg-slate-100 text-slate-700'
              }>
                {activity?.status === 'active' ? 'Ativa' : 'Encerrada'}
              </Badge>
              {isLate && <Badge className="bg-red-100 text-red-700">Atrasada</Badge>}
              {hasGrade && <Badge className="bg-blue-100 text-blue-700">Corrigida</Badge>}
            </div>

            <h3 className="font-bold text-lg mb-2">Instruções</h3>
            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {activity?.description || 'Sem descrição'}
            </p>
          </Card>

          {/* Submission Area */}
          {!hasGrade && activity?.status === 'active' ? (
            <Card className="p-6 bg-white dark:bg-slate-900">
              <h3 className="font-bold text-lg mb-4">Sua Resposta</h3>
              
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite sua resposta aqui..."
                className="mb-4 min-h-[300px]"
                disabled={hasGrade}
              />

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || hasGrade}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {submission ? 'Atualizar Resposta' : 'Enviar Resposta'}
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ) : hasGrade ? (
            <Card className="p-6 bg-white dark:bg-slate-900">
              <h3 className="font-bold text-lg mb-4">Sua Resposta (Corrigida)</h3>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mb-4">
                <p className="whitespace-pre-wrap">{submission?.content}</p>
              </div>
            </Card>
          ) : null}

          {/* Feedback */}
          {hasGrade && (
            <Card className="p-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Feedback do Professor
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {submission?.feedback?.[0]?.comment || 'Sem comentários'}
              </p>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-slate-600">Nota:</span>
                  <div className="text-3xl font-bold text-blue-600">
                    {submission?.grade}/{activity?.max_score}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <Card className="p-6 bg-white dark:bg-slate-900">
            <h3 className="font-bold mb-4">Detalhes</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-600 dark:text-slate-400">Prazo:</span>
                <div className="font-semibold">
                  {activity?.due_date 
                    ? new Date(activity.due_date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Sem prazo'}
                </div>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Pontuação:</span>
                <div className="font-semibold">{activity?.max_score} pontos</div>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">Tipo:</span>
                <div className="font-semibold capitalize">{activity?.type || 'Tarefa'}</div>
              </div>
              {submission && (
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Status:</span>
                  <div className="font-semibold">
                    {hasGrade ? 'Corrigida' : 
                     submission.submitted_at ? 'Enviada' : 'Rascunho'}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentActivityDetailsPage;
