import { logger } from '@/shared/utils/logger';
/**
 * StudentActivityDetailsPage - REDESIGNED
 * Layout 2 colunas com StatusBadge e GradeChart
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Award, FileText, Upload, Save, Send, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import StatusBadge from '@/shared/components/ui/StatusBadge';
import GradeChart from '@/shared/components/ui/GradeChart';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { format, isPast, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TextWithLineBreaks from '@/shared/components/ui/TextWithLineBreaks';

const StudentActivityDetailsPageRedesigned = () => {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activity, setActivity] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answer, setAnswer] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [classStats, setClassStats] = useState(null);

  useEffect(() => {
    loadActivityAndSubmission();
  }, [activityId]);

  const loadActivityAndSubmission = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();

      // Buscar atividade
      const { data: activityData, error: actError } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .single();

      if (actError) throw actError;

      // Buscar assignment para pegar class_id
      const { data: assignment } = await supabase
        .from('activity_class_assignments')
        .select('class_id')
        .eq('activity_id', activityId)
        .single();

      let classData = null;
      if (assignment) {
        // Buscar dados da turma
        const { data: cls } = await supabase
          .from('classes')
          .select('id, name, color')
          .eq('id', assignment.class_id)
          .single();
        
        classData = cls;
      }

      // Buscar submissão existente
      const { data: submissionData } = await supabase
        .from('submissions')
        .select('*')
        .eq('activity_id', activityId)
        .eq('student_id', user.user.id)
        .single();

      // Buscar estatísticas da turma (se corrigida)
      if (submissionData?.status === 'graded') {
        const { data: stats } = await supabase
          .from('submissions')
          .select('grade')
          .eq('activity_id', activityId)
          .eq('status', 'graded')
          .not('grade', 'is', null);

        if (stats && stats.length > 0) {
          const grades = stats.map(s => parseFloat(s.grade));
          const average = grades.reduce((a, b) => a + b, 0) / grades.length;
          const max = Math.max(...grades);
          
          setClassStats({
            average,
            maxGrade: max,
            totalSubmissions: stats.length
          });
        }
      }

      // Adicionar dados da turma à atividade
      const activityWithClass = {
        ...activityData,
        class_name: classData?.name,
        class_color: classData?.color,
        class_id: classData?.id
      };

      setActivity(activityWithClass);
      setSubmission(submissionData);
      setAnswer(submissionData?.content?.answer || '');
    } catch (error) {
      logger.error('Erro ao carregar atividade:', error)
      toast({
        title: '❌ Erro ao carregar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const submissionData = {
        activity_id: activityId,
        student_id: user.user.id,
        content: { answer },
        status: 'draft'
      };

      if (submission) {
        await supabase
          .from('submissions')
          .update(submissionData)
          .eq('id', submission.id);
      } else {
        await supabase
          .from('submissions')
          .insert(submissionData);
      }

      toast({
        title: '✓ Rascunho salvo',
        description: 'Suas alterações foram salvas'
      });
    } catch (error) {
      logger.error('Erro ao salvar rascunho:', error)
      toast({
        title: '❌ Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) {
      toast({
        title: '⚠️ Resposta vazia',
        description: 'Digite sua resposta antes de enviar',
        variant: 'destructive'
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmModal(false);

    try {
      setSubmitting(true);
      
      // Preparar conteúdo baseado no tipo de atividade
      let submissionContent = { answer };
      
      if (activity?.type === 'quiz' || activity?.type === 'multiple_choice') {
        submissionContent.selectedAnswers = selectedAnswers;
      }
      const { data: user } = await supabase.auth.getUser();

      const submissionData = {
        activity_id: activityId,
        student_id: user.user.id,
        content: submissionContent,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      };

      if (submission) {
        await supabase
          .from('submissions')
          .update(submissionData)
          .eq('id', submission.id);
      } else {
        await supabase
          .from('submissions')
          .insert(submissionData);
      }

      toast({
        title: '✓ Atividade enviada!',
        description: 'Aguarde a correção do professor'
      });

      loadActivityAndSubmission();
    } catch (error) {
      logger.error('Erro ao enviar:', error)
      toast({
        title: '❌ Erro ao enviar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Determinar status da atividade
  const getActivityStatus = () => {
    if (submission?.status === 'graded') return 'graded';
    if (submission?.status === 'submitted') return 'submitted';
    if (activity?.due_date && isPast(new Date(activity.due_date))) return 'late';
    return 'pending';
  };

  const activityStatus = activity ? getActivityStatus() : 'pending';
  const dueDate = activity?.due_date ? new Date(activity.due_date) : null;
  const isUrgent = dueDate && differenceInHours(dueDate, new Date()) < 24 && activityStatus === 'pending';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header com Status */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 p-8 shadow-xl">
        <div className="container mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar à Turma
          </Button>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {activity?.title}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge 
                  status={activityStatus} 
                  size="lg" 
                  score={submission?.grade}
                />
                {dueDate && (
                  <div className="flex items-center gap-2 text-white/90">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      Prazo: {format(dueDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isUrgent && (
            <div className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg animate-pulse">
              ⏰ ATENÇÃO: Menos de 24 horas para o prazo!
            </div>
          )}
        </div>
      </div>

      {/* Layout 2 Colunas */}
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Descrição (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Descrição */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Descrição
              </h2>
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: activity?.description || 'Sem descrição' }}
              />
            </Card>

            {/* Critérios de Avaliação */}
            {activity?.content?.rubric && (
              <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  Critérios de Avaliação
                </h3>
                <div className="prose dark:prose-invert max-w-none text-sm">
                  {activity.content.rubric}
                </div>
              </Card>
            )}

            {/* Perguntas/Opções (para atividades de múltipla escolha) */}
            {(activity?.type === 'quiz' || activity?.type === 'multiple_choice') && activity?.content?.questions && activityStatus !== 'graded' && (
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Questões
                </h3>
                
                {activity.content.questions.map((question, index) => (
                  <div key={index} className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <h4 className="font-semibold mb-3">
                      {index + 1}. {question.question}
                    </h4>
                    
                    {question.type === 'multiple_choice' && (
                      <RadioGroup
                        value={selectedAnswers[index]}
                        onValueChange={(value) => setSelectedAnswers({ ...selectedAnswers, [index]: value })}
                      >
                        {question.options?.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-2 mb-2">
                            <RadioGroupItem value={option} id={`q${index}-${optIndex}`} />
                            <Label htmlFor={`q${index}-${optIndex}`}>{option}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                    
                    {question.type === 'checkbox' && (
                      <div className="space-y-2">
                        {question.options?.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`q${index}-${optIndex}`}
                              checked={selectedAnswers[index]?.includes(option)}
                              onCheckedChange={(checked) => {
                                const current = selectedAnswers[index] || [];
                                setSelectedAnswers({
                                  ...selectedAnswers,
                                  [index]: checked 
                                    ? [...current, option]
                                    : current.filter(o => o !== option)
                                });
                              }}
                            />
                            <Label htmlFor={`q${index}-${optIndex}`}>{option}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            )}

            {/* Seção de Submissão */}
            {activityStatus !== 'graded' && (
              <Card className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-green-600" />
                  {activityStatus === 'submitted' ? 'Sua Resposta (Enviada)' : 'Sua Resposta'}
                </h3>

                {activityStatus === 'submitted' ? (
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                      ✓ Atividade enviada em {format(new Date(submission.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <div className="w-full max-w-full break-words">
                      <TextWithLineBreaks 
                        text={answer} 
                        className="whitespace-pre-wrap break-words w-full"
                        preserveWhitespace={true}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Digite sua resposta aqui..."
                      rows={10}
                      className="mb-4"
                    />

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={!answer.trim()}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Rascunho
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={!answer.trim() || submitting}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {submitting ? 'Enviando...' : 'Enviar Atividade'}
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* Resultado e Feedback (após correção) */}
            {activityStatus === 'graded' && (
              <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    🎯 RESULTADO
                  </h3>
                  {activity?.class_name && (
                    <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        {activity.class_name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Gráfico Comparativo */}
                {classStats && (
                  <GradeChart
                    studentGrade={submission.grade}
                    classAverage={classStats.average}
                    maxGrade={activity.max_score || 100}
                    className="mb-6"
                  />
                )}

                {/* Feedback do Professor */}
                {submission.feedback && (
                  <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      💬 FEEDBACK DO PROFESSOR
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {submission.feedback}
                    </p>
                  </div>
                )}

                {/* Sua Resposta */}
                <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold mb-2">📝 SUA RESPOSTA</h4>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {answer}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Coluna Direita - Informações (1/3) */}
          <div className="space-y-6">
            <Card className="p-6 sticky top-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                📋 Informações
              </h3>

              <div className="space-y-4">
                {/* Prazo */}
                {dueDate && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Prazo de Entrega</p>
                    <p className="font-semibold text-lg">
                      {format(dueDate, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {format(dueDate, "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}

                {/* Nota Máxima */}
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Nota Máxima</p>
                  <p className="font-semibold text-2xl text-blue-600">
                    {activity?.max_score || 100} pontos
                  </p>
                </div>

                {/* Status */}
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Status Atual</p>
                  <StatusBadge status={activityStatus} size="md" score={submission?.grade} />
                </div>

                {/* Turma */}
                {activity?.class_name && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Turma</p>
                    <p className="font-semibold">{activity.class_name}</p>
                  </div>
                )}
              </div>

              {/* Countdown Timer (se urgente) */}
              {isUrgent && dueDate && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">
                    ⏰ {Math.floor(differenceInHours(dueDate, new Date()))} horas restantes!
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              Confirmar Envio
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja enviar esta atividade? 
              <br />
              <strong>Você não poderá editar depois do envio.</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                ℹ️ Após o envio, o professor será notificado e poderá avaliar sua atividade.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmSubmit} 
              className="bg-green-600 hover:bg-green-700"
              disabled={submitting}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {submitting ? 'Enviando...' : 'Confirmar Envio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentActivityDetailsPageRedesigned;
