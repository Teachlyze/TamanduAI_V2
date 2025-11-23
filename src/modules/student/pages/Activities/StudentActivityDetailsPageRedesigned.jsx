import { logger } from '@/shared/utils/logger';
/**
 * StudentActivityDetailsPage - REDESIGNED
 * Layout 2 colunas com StatusBadge e GradeChart
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Award, FileText, Upload, Save, Send, Download, AlertCircle, CheckCircle, User } from 'lucide-react';
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
import { calculateAutoGrade, generateAutoFeedback, canAutoGrade, shouldShowScoreImmediately } from '@/shared/services/autoGradingService';
import useActivityFiles from '@/shared/hooks/useActivityFiles';

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
  const [submissionAttempts, setSubmissionAttempts] = useState(0);
  const [isNewAttempt, setIsNewAttempt] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const {
    uploadSubmission,
    isUploading,
    uploadProgress
  } = useActivityFiles(activityId, currentUser?.id, false);

  useEffect(() => {
    loadActivityAndSubmission();
  }, [activityId]);

  const loadActivityAndSubmission = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user?.id) {
        throw new Error('Usuário não autenticado');
      }

      setCurrentUser(user.user);

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

      // Buscar dados do professor que criou a atividade
      let teacherData = null;
      if (activityData?.created_by) {
        const { data: teacher } = await supabase
          .from('profiles')
          .select('id, full_name, name, email')
          .eq('id', activityData.created_by)
          .maybeSingle();

        teacherData = teacher;
      }

      // Buscar submissão existente (há UNIQUE em activity_id + student_id, então só pode haver uma linha)
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('activity_id', activityId)
        .eq('student_id', user.user.id)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (submissionsError) throw submissionsError;

      const submissionData = submissionsData?.[0] || null;

      // Contar tentativas anteriores usando campo attemptNumber salvo no content
      // Se não existir (submissões antigas), considerar pelo menos 1 tentativa
      const attemptsCount = submissionData
        ? (typeof submissionData.content?.attemptNumber === 'number'
            ? submissionData.content.attemptNumber
            : 1)
        : 0;

      setSubmissionAttempts(attemptsCount);

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
        class_id: classData?.id,
        teacher_name: teacherData?.full_name || teacherData?.name || teacherData?.email || null,
      };

      setActivity(activityWithClass);
      setSubmission(submissionData);

      const submissionContent = submissionData?.content || {};
      setAnswer(submissionContent.answer || '');
      setSelectedAnswers(submissionContent.selectedAnswers || {});
      setAttachments(Array.isArray(submissionContent.attachments) ? submissionContent.attachments : []);
      setIsNewAttempt(false);
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
        title: 'Rascunho salvo',
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
    logger.debug('[handleSubmit] Botão clicado!', { 
      activityType: activity?.type,
      selectedAnswersCount: Object.keys(selectedAnswers).length,
      selectedAnswers,
      activityStatus
    });

    // Validar questões objetivas (se aplicável)
    if (isObjectiveActivity) {
      const questions = activity.content?.questions || [];
      
      logger.debug('[handleSubmit] Validando questões:', {
        totalQuestions: questions.length,
        answeredQuestions: Object.keys(selectedAnswers).length
      });
      
      const allAnswered = questions.every((q, index) => {
        const questionId = q.id || index;
        const hasAnswer = selectedAnswers[questionId] !== undefined && selectedAnswers[questionId] !== null;
        logger.debug('[handleSubmit] Questão:', { questionId, hasAnswer, answer: selectedAnswers[questionId] });
        return hasAnswer;
      });

      if (!allAnswered) {
        logger.warn('[handleSubmit] Nem todas questões respondidas');
        toast({
          title: 'Questões não respondidas',
          description: 'Responda todas as questões antes de enviar',
          variant: 'destructive'
        });
        return;
      }
    } else if (isProjectUploadOnly) {
      if (!attachments || attachments.length === 0) {
        logger.warn('[handleSubmit] Nenhum arquivo anexado para atividade project');
        toast({
          title: 'Nenhum arquivo anexado',
          description: 'Envie pelo menos um arquivo com sua resposta antes de enviar a atividade.',
          variant: 'destructive'
        });
        return;
      }
    } else {
      // Validar resposta dissertativa
      if (!answer.trim()) {
        logger.warn('[handleSubmit] Resposta dissertativa vazia');
        toast({
          title: 'Resposta vazia',
          description: 'Digite sua resposta antes de enviar',
          variant: 'destructive'
        });
        return;
      }
    }

    logger.debug('[handleSubmit] Validação passou! Abrindo modal...');
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmModal(false);

    try {
      setSubmitting(true);
      
      // Preparar conteúdo baseado no tipo de atividade
      let submissionContent;

      if (isProjectUploadOnly) {
        submissionContent = {
          attachments
        };
      } else {
        submissionContent = { answer };
        
        if (isObjectiveActivity) {
          submissionContent.selectedAnswers = selectedAnswers;
        }
      }

      // Calcular número da tentativa atual
      // Usamos um campo attemptNumber dentro de content para registrar o histórico
      let attemptNumber = 1;
      if (submission) {
        const previousAttempt = submission.content?.attemptNumber;
        if (typeof previousAttempt === 'number' && previousAttempt > 0) {
          attemptNumber = previousAttempt + 1;
        } else {
          attemptNumber = 2; // havia uma submissão sem attemptNumber, então esta é a segunda tentativa
        }
      }
      submissionContent.attemptNumber = attemptNumber;

      const { data: user } = await supabase.auth.getUser();

      // Verificar se pode corrigir automaticamente
      let autoGradingResult = null;
      let submissionStatus = 'submitted';
      let autoGrade = null;
      let autoFeedback = null;

      if (canAutoGrade(activity) && shouldShowScoreImmediately(activity)) {
        const questions = activity?.content?.questions || [];
        autoGradingResult = calculateAutoGrade(questions, selectedAnswers, activity.max_score);
        
        if (autoGradingResult) {
          submissionStatus = 'graded';
          autoGrade = autoGradingResult.grade;
          autoFeedback = generateAutoFeedback(autoGradingResult);
          
          logger.debug('[Submission] Correção automática aplicada:', autoGradingResult);
        }
      }

      const submissionData = {
        activity_id: activityId,
        student_id: user.user.id,
        content: submissionContent,
        status: submissionStatus,
        submitted_at: new Date().toISOString()
      };

      // Adicionar grade apenas se for número válido e dentro do range
      if (autoGrade !== null && autoGrade !== undefined) {
        const gradeValue = parseFloat(autoGrade);
        const maxScore = parseFloat(activity?.max_score || 10);
        
        // Normalizar grade para escala 0-10 se maxScore for diferente
        let normalizedGrade = gradeValue;
        if (maxScore !== 10 && maxScore > 0) {
          normalizedGrade = (gradeValue / maxScore) * 10;
        }
        
        // Garantir que está no range 0-10
        normalizedGrade = Math.max(0, Math.min(10, normalizedGrade));
        // Arredondar para 2 casas decimais
        normalizedGrade = Math.round(normalizedGrade * 100) / 100;
        
        logger.debug('[confirmSubmit] Validando grade:', { 
          autoGrade, 
          gradeValue, 
          maxScore,
          normalizedGrade,
          isValid: !isNaN(gradeValue) && gradeValue >= 0 && gradeValue <= maxScore
        });
        
        if (!isNaN(normalizedGrade) && normalizedGrade >= 0 && normalizedGrade <= 10) {
          submissionData.grade = normalizedGrade;
          submissionData.graded_at = new Date().toISOString();
          submissionData.feedback = autoFeedback;
        } else {
          logger.warn('[confirmSubmit] Grade inválida, não será enviada:', { normalizedGrade });
        }
      }

      logger.debug('[confirmSubmit] Dados finais para envio:', submissionData);

      // Sempre manter apenas um registro por (activity_id, student_id)
      // Se já existe submissão, atualizamos; se não, inserimos
      if (submission) {
        const { error: updateError } = await supabase
          .from('submissions')
          .update(submissionData)
          .eq('id', submission.id);
        
        if (updateError) throw updateError;
        logger.debug('[confirmSubmit] Submissão atualizada (tentativa múltipla)');
      } else {
        const { error: insertError } = await supabase
          .from('submissions')
          .insert(submissionData);
        
        if (insertError) throw insertError;
        logger.debug('[confirmSubmit] Nova submissão criada (primeira tentativa)');
      }

      if (autoGrade !== null) {
        toast({
          title: 'Atividade corrigida!',
          description: `Sua nota: ${autoGrade}/${activity.max_score} (${autoGradingResult.percentage}%)`
        });
      } else {
        toast({
          title: 'Atividade enviada!',
          description: 'Aguarde a correção do professor'
        });
      }

      loadActivityAndSubmission();
    } catch (error) {
      logger.error('Erro ao enviar:', error);
      logger.error('[confirmSubmit] Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      });
      
      toast({
        title: '❌ Erro ao enviar',
        description: error.message || 'Erro desconhecido ao enviar atividade',
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

  const isObjectiveActivity = activity?.type === 'quiz' || activity?.type === 'multiple_choice' || activity?.type === 'closed';
  const isProjectUploadOnly = activity?.type === 'project' || activity?.content?.advanced_settings?.submissionMode === 'file_upload';
  const maxAttempts = activity?.content?.advanced_settings?.maxAttempts || 1;
  const allowsMultipleAttempts = maxAttempts > 1;
  const hasRemainingAttempts = allowsMultipleAttempts && submissionAttempts < maxAttempts;
  const isReadOnlyAnswers = !isNewAttempt && (activityStatus === 'submitted' || activityStatus === 'graded');

  // Debug log
  logger.debug('[StudentActivityDetails] Estado atual:', {
    activityStatus,
    hasActivity: !!activity,
    activityType: activity?.type,
    questionsCount: activity?.content?.questions?.length,
    selectedAnswersCount: Object.keys(selectedAnswers).length,
    selectedAnswers,
    hasSubmission: !!submission,
    submissionStatus: submission?.status,
    advancedSettings: activity?.content?.advanced_settings
  });

  const handleUploadAttachment = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activity || !currentUser) return;

    try {
      let currentSubmission = submission;

      if (!currentSubmission) {
        const { data: newSubmission, error: insertError } = await supabase
          .from('submissions')
          .insert({
            activity_id: activityId,
            student_id: currentUser.id,
            content: { attachments: [] },
            status: 'draft',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;
        currentSubmission = newSubmission;
        setSubmission(newSubmission);
      }

      const meta = await uploadSubmission(file, currentSubmission.id);

      const nextAttachments = [
        ...(Array.isArray(currentSubmission.content?.attachments) ? currentSubmission.content.attachments : []),
        {
          name: meta.name,
          url: meta.url,
          path: meta.path,
          size: meta.size,
          type: meta.type
        }
      ];

      const { data: updated, error: updateError } = await supabase
        .from('submissions')
        .update({
          content: {
            ...(currentSubmission.content || {}),
            attachments: nextAttachments
          },
          status: currentSubmission.status || 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSubmission.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSubmission(updated);
      setAttachments(nextAttachments);

      toast({
        title: 'Arquivo anexado',
        description: 'Seu arquivo foi enviado com sucesso.'
      });
    } catch (error) {
      logger.error('Erro ao enviar anexo da atividade:', error);
      toast({
        title: 'Erro ao enviar arquivo',
        description: error.message || 'Tente novamente em instantes.',
        variant: 'destructive'
      });
    } finally {
      event.target.value = '';
    }
  };

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
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 shadow-md">
        <div className="container mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/15 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar à Turma
          </Button>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {activity?.title}
              </h1>

              {(activity?.class_name || activity?.teacher_name) && (
                <div className="flex flex-wrap items-center gap-2 mb-3 text-xs sm:text-sm text-white/90">
                  {activity?.class_name && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10">
                      <Calendar className="w-3 h-3" />
                      <span>{activity.class_name}</span>
                    </span>
                  )}
                  {activity?.teacher_name && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10">
                      <User className="w-3 h-3" />
                      <span>Professor(a) {activity.teacher_name}</span>
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge 
                  status={activityStatus} 
                  size="lg" 
                  score={submission?.grade}
                  maxScore={activity?.max_score || 10}
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
            <div className="mt-4 inline-flex items-center gap-2 max-w-xl px-4 py-3 rounded-lg border border-red-200 bg-red-50/90 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>ATENÇÃO: menos de 24 horas para o prazo desta atividade.</span>
            </div>
          )}
        </div>
      </div>

      {/* Layout 2 Colunas */}
      <div className="container mx-auto p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Coluna Esquerda - Descrição (2/3) */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Descrição */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Descrição
              </h2>
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: activity?.description || 'Sem descrição' }}
              />

              {Array.isArray(activity?.content?.attachments) && activity.content.attachments.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-600" />
                    Arquivos da Atividade
                  </h3>
                  <ul className="space-y-2">
                    {activity.content.attachments.map((file, index) => (
                      <li key={file.path || file.url || index} className="flex items-center justify-between text-sm">
                        <span className="truncate mr-2">{file.name}</span>
                        {file.url && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 px-3"
                          >
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-1" />
                              Baixar
                            </a>
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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

            {/* Perguntas/Opções (para atividades objetivas) */}
            {isObjectiveActivity && activity?.content?.questions && (activityStatus !== 'graded' || isNewAttempt) && (
              <Card className="p-4 sm:p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Questões
                </h3>
                
                {activity.content.questions.map((question, index) => {
                  const questionId = question.id || index;
                  
                  return (
                    <div key={questionId} className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <h4 className="font-semibold mb-3">
                        {index + 1}. {question.text || question.question}
                      </h4>
                      
                      {/* Questões objetivas (closed) com alternativas A, B, C, D, E */}
                      {question.alternatives && question.alternatives.length > 0 && (
                        <div className="space-y-2">
                          {question.alternatives.map((alt) => (
                            <div 
                              key={alt.id} 
                              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              onClick={() => {
                                if (!isReadOnlyAnswers) {
                                  logger.debug('[Alternativa] Clicada:', { questionId, altId: alt.id, letter: alt.letter });
                                  setSelectedAnswers({ ...selectedAnswers, [questionId]: String(alt.id) });
                                }
                              }}
                            >
                              <input
                                type="radio"
                                name={`question-${questionId}`}
                                id={`q${questionId}-${alt.id}`}
                                value={String(alt.id)}
                                checked={String(selectedAnswers[questionId]) === String(alt.id)}
                                onChange={(e) => {
                                  logger.debug('[Radio] Changed:', { questionId, value: e.target.value });
                                  if (!isReadOnlyAnswers) {
                                    setSelectedAnswers({ ...selectedAnswers, [questionId]: e.target.value });
                                  }
                                }}
                                disabled={isReadOnlyAnswers}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                              />
                              <Label htmlFor={`q${questionId}-${alt.id}`} className="flex-1 cursor-pointer">
                                <span className="font-semibold mr-2">{alt.letter})</span>
                                {alt.text}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Questões antigas com options */}
                      {!question.alternatives && question.options && question.options.length > 0 && (
                        <RadioGroup
                          value={selectedAnswers[questionId]}
                          onValueChange={(value) => {
                            if (!isReadOnlyAnswers) {
                              setSelectedAnswers({ ...selectedAnswers, [questionId]: value });
                            }
                          }}
                        >
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center space-x-2 mb-2">
                              <RadioGroupItem value={option} id={`q${questionId}-${optIndex}`} disabled={isReadOnlyAnswers} />
                              <Label htmlFor={`q${questionId}-${optIndex}`}>{option}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  );
                })}
              </Card>
            )}

            {/* Seção de Submissão */}
            {(activityStatus !== 'graded' || isNewAttempt) && (
              <Card className="p-4 sm:p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-green-600" />
                  {activityStatus === 'submitted' && !isNewAttempt ? 'Status da Submissão' : 'Enviar Atividade'}
                </h3>

                {activityStatus === 'submitted' && !isNewAttempt ? (
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                      Atividade enviada em {format(new Date(submission.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      Aguardando correção do professor...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Textarea apenas para atividades dissertativas (não objetivas, não project) */}
                    {!isObjectiveActivity && !isProjectUploadOnly && (
                      <Textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Digite sua resposta aqui..."
                        rows={10}
                        className="mb-4"
                      />
                    )}

                    {/* Mensagem de confirmação para atividades objetivas */}
                    {(activity?.type === 'closed' || activity?.type === 'quiz' || activity?.type === 'multiple_choice') && (
                      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Revise suas respostas antes de enviar. 
                          {activity?.content?.advanced_settings?.showScoreImmediately && (
                            <span className="font-semibold"> Sua nota será calculada automaticamente!</span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Upload de arquivo apenas para atividades do tipo project (upload-only) */}
                    {isProjectUploadOnly && (
                      <div className="mb-4 space-y-2">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Envie sua resposta como arquivo (PDF, DOC, DOCX, ODT ou TXT).
                        </p>
                        <div className="flex items-center gap-3">
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.odt,.txt"
                            onChange={handleUploadAttachment}
                            disabled={isUploading || submitting}
                          />
                          {isUploading && (
                            <span className="text-xs text-slate-500">
                              Enviando... {uploadProgress}%
                            </span>
                          )}
                        </div>
                        {attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-slate-500">Arquivos enviados:</p>
                            {attachments.map((file, index) => (
                              <div
                                key={file.path || file.url || index}
                                className="flex items-center justify-between text-xs border rounded px-3 py-1"
                              >
                                <span className="truncate mr-2">{file.name}</span>
                                {file.url && (
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    Abrir
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3">
                      {!isObjectiveActivity && !isProjectUploadOnly && (
                        <Button
                          variant="outline"
                          onClick={handleSaveDraft}
                          disabled={!answer.trim()}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Rascunho
                        </Button>
                      )}
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting}
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
              <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Resultado
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
                    maxGrade={activity.max_score || 10}
                    className="mb-6"
                  />
                )}

                {/* Feedback do Professor */}
                {submission.feedback && (
                  <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h4 className="font-bold mb-2 text-slate-900 dark:text-white">
                      Feedback do Professor
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {submission.feedback}
                    </p>
                  </div>
                )}

                {isObjectiveActivity && activity?.content?.questions && (
                  <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h4 className="font-bold mb-2 text-slate-900 dark:text-white">Suas Respostas</h4>
                    <div className="space-y-3">
                      {activity.content.questions.map((question, index) => {
                        const questionId = question.id || index;
                        const studentAnswerId = selectedAnswers[questionId];
                        let answerLabel = '';

                        if (question.alternatives && studentAnswerId !== undefined && studentAnswerId !== null) {
                          const matched = question.alternatives.find((alt) => String(alt.id) === String(studentAnswerId));
                          if (matched) {
                            answerLabel = `${matched.letter}) ${matched.text}`;
                          }
                        } else if (question.options && studentAnswerId !== undefined && studentAnswerId !== null) {
                          answerLabel = String(studentAnswerId);
                        }

                        return (
                          <div key={questionId} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm font-semibold mb-1">
                              {index + 1}. {question.text || question.question}
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              {answerLabel || 'Não respondida'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!isObjectiveActivity && (
                  <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h4 className="font-bold mb-2 text-slate-900 dark:text-white">Sua Resposta</h4>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {answer}
                    </p>
                  </div>
                )}

                {hasRemainingAttempts && !isNewAttempt && (
                  <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                      {`Esta atividade permite múltiplas tentativas (${submissionAttempts}/${maxAttempts} já realizadas).`}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsNewAttempt(true);
                        setAnswer('');
                        setSelectedAnswers({});
                      }}
                    >
                      Nova tentativa
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Coluna Direita - Informações (1/3) */}
          <div className="space-y-6">
            <Card className="p-6 sticky top-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                Informações
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
                    {activity?.max_score || 10} pontos
                  </p>
                </div>

                {/* Status */}
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Status Atual</p>
                  <StatusBadge status={activityStatus} size="md" score={submission?.grade} maxScore={activity?.max_score || 10} />
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
                    {Math.floor(differenceInHours(dueDate, new Date()))} horas restantes!
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação Detalhado */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Send className="w-6 h-6 text-blue-600" />
              Confirmar Envio da Atividade
            </DialogTitle>
            <DialogDescription>
              Revise os detalhes antes de enviar sua atividade.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Detalhes da Atividade */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Data de Envio:</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              {dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Prazo:</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {format(dueDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
              
              {/* Tentativas (se permite múltiplas) */}
              {(() => {
                const maxAttempts = activity?.content?.advanced_settings?.maxAttempts || 1;
                if (maxAttempts > 1) {
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Tentativas:</span>
                      <span className={`text-sm font-semibold ${
                        submissionAttempts < maxAttempts 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {submissionAttempts + 1}/{maxAttempts}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Questões Respondidas (para objetivas) */}
              {(activity?.type === 'closed' || activity?.type === 'quiz' || activity?.type === 'multiple_choice' || activity?.type === 'checkbox') && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Questões Respondidas:</span>
                  <span className={`text-sm font-semibold ${
                    Object.keys(selectedAnswers).length === (activity?.content?.questions || []).length 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-orange-600 dark:text-orange-400'
                  }`}>
                    {Object.keys(selectedAnswers).length}/{(activity?.content?.questions || []).length}
                  </span>
                </div>
              )}
              
              {/* Nota Máxima */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">🎯 Nota Máxima:</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {activity?.max_score || 10} pontos
                </span>
              </div>
            </div>

            {/* Aviso sobre correção automática */}
            {activity?.content?.advanced_settings?.showScoreImmediately && 
             (activity?.type === 'closed' || activity?.type === 'quiz') && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Correção automática ativada! Você verá sua nota imediatamente.
                </p>
              </div>
            )}

            {/* Aviso sobre tentativas múltiplas */}
            {(() => {
              const maxAttempts = activity?.content?.advanced_settings?.maxAttempts || 1;
              const keepBestGrade = activity?.content?.advanced_settings?.keepBestGrade;
              
              logger.debug('[Modal] Configurações:', { maxAttempts, keepBestGrade });
              
              if (maxAttempts > 1) {
                return (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        Você pode enviar até <strong>{maxAttempts}x</strong>.
                        {keepBestGrade === true && ' Será considerada a maior nota.'}
                        {keepBestGrade === false && ' Será considerada a última nota.'}
                        {keepBestGrade === undefined && ' Será considerada a última nota.'}
                      </span>
                    </p>
                  </div>
                );
              } else {
                return (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-700 dark:text-orange-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <strong>Atenção:</strong> Após o envio, você não poderá editar suas respostas.
                    </p>
                  </div>
                );
              }
            })()}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmModal(false)}
              disabled={submitting}
            >
              Revisar Respostas
            </Button>
            <Button 
              onClick={confirmSubmit} 
              className="bg-green-600 hover:bg-green-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Envio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentActivityDetailsPageRedesigned;
