import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/components/ui/use-toast';
import {
  DashboardHeader,
  GradeForm
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { calculateAutoGrade, generateAutoFeedback, canAutoGrade } from '@/shared/services/autoGradingService';

const GradingPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [activity, setActivity] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canUseAutoGrade, setCanUseAutoGrade] = useState(false);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  // Função para renderizar conteúdo da submissão de forma legível
  const renderSubmissionContent = () => {
    if (!submission?.content) {
      return (
        <p className="text-slate-600 dark:text-slate-400">
          Nenhum conteúdo enviado.
        </p>
      );
    }

    // Se for string, mostrar como texto
    if (typeof submission.content === 'string') {
      return (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg">
          <div style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
            overflow: 'hidden',
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}>
            {submission.content}
          </div>
        </div>
      );
    }

    // Se for objeto (respostas objetivas), renderizar questões
    try {
      const rawContent = typeof submission.content === 'string'
        ? JSON.parse(submission.content)
        : (submission.content || {});

      // Formatos suportados:
      // - { selectedAnswers: { [questionId]: answer } }  (novo para quizzes)
      // - { answers: { ... } }
      // - { answer: 'texto livre' } (dissertativa)
      // - { qualquerChave: valor } (legado)
      const answers = rawContent.selectedAnswers || rawContent.answers || rawContent;

      // Pegar questões da atividade
      const questions = activity?.content?.questions || [];
      
      if (questions.length === 0) {
        // Mostrar respostas sem contexto das questões
        return (
          <div className="space-y-4">
            {Object.entries(answers).map(([questionId, answer], index) => (
              <div key={questionId} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                      Questão {index + 1}
                    </p>
                    <div className="text-sm text-slate-700 dark:text-slate-300" style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      lineHeight: '1.5'
                    }}>
                      <span className="font-semibold">Resposta: </span>
                      {Array.isArray(answer) ? answer.join(', ') : answer}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      // Renderizar com contexto das questões
      return (
        <div className="space-y-4">
          {questions.map((question, index) => {
            const questionKey = question.id ?? index;
            const rawStudentValue = answers?.[questionKey] ?? answers?.[String(questionKey)];

            let studentLabel = rawStudentValue;
            if (question.alternatives && question.alternatives.length > 0 && rawStudentValue !== undefined && rawStudentValue !== null) {
              const normalized = String(rawStudentValue);
              const byId = question.alternatives.find(alt => String(alt.id) === normalized);
              const byLetter = question.alternatives.find(alt => String(alt.letter) === normalized);
              const byText = question.alternatives.find(alt => alt.text === rawStudentValue);
              const match = byId || byLetter || byText;
              studentLabel = match?.text || normalized;
            }

            let correctLabel = null;
            if (question.alternatives && question.alternatives.length > 0) {
              const correctAlts = question.alternatives.filter(alt => alt.isCorrect);
              if (correctAlts.length > 0) {
                correctLabel = correctAlts.map(alt => alt.text).join(', ');
              }
            }

            if (!correctLabel && question.answerKey) {
              correctLabel = question.answerKey;
            }

            let isCorrect = false;
            if (question.alternatives && question.alternatives.length > 0 && rawStudentValue !== undefined && rawStudentValue !== null) {
              const normalized = String(rawStudentValue);
              const correctAlts = question.alternatives.filter(alt => alt.isCorrect);
              isCorrect = correctAlts.some(alt =>
                String(alt.id) === normalized ||
                String(alt.letter) === normalized ||
                alt.text === rawStudentValue
              );
            } else if (question.answerKey) {
              const correctAnswerLegacy = question.answerKey;
              isCorrect = Array.isArray(rawStudentValue)
                ? Array.isArray(correctAnswerLegacy) && rawStudentValue.length === correctAnswerLegacy.length && rawStudentValue.every(a => correctAnswerLegacy.includes(a))
                : rawStudentValue === correctAnswerLegacy;
            }

            const hasCorrectInfo = !!correctLabel;

            return (
              <div 
                key={question.id} 
                className={`p-4 rounded-lg border-2 ${
                  hasCorrectInfo
                    ? isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                    hasCorrectInfo
                      ? isCorrect
                        ? 'bg-emerald-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      {`Questão ${index + 1}`}
                    </p>
                    {question.text && (
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                        {question.text}
                      </p>
                    )}
                    
                    {/* Resposta do aluno */}
                    <div className="mb-2">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Resposta do aluno:</span>
                      <div 
                        className="text-sm font-medium text-slate-900 dark:text-white mt-1"
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          lineHeight: '1.5'
                        }}
                      >
                        {Array.isArray(studentLabel) ? studentLabel.join(', ') : (studentLabel || 'Sem resposta')}
                      </div>
                    </div>

                    {/* Gabarito (se existir) */}
                    {correctLabel && (
                      <div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Gabarito:</span>
                        <div 
                          className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1"
                          style={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            lineHeight: '1.5'
                          }}
                        >
                          {Array.isArray(correctLabel) ? correctLabel.join(', ') : correctLabel}
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    {hasCorrectInfo && (
                      <div className="mt-2">
                        {isCorrect ? (
                          <Badge className="bg-emerald-500 text-white">✓ Correta</Badge>
                        ) : (
                          <Badge className="bg-red-500 text-white">✗ Incorreta</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    } catch (error) {
      // Se falhar o parse, mostrar raw
      return (
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg">
          <div 
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              maxWidth: '100%',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}
          >
            {JSON.stringify(submission.content, null, 2)}
          </div>
        </div>
      );
    }
  };

  const loadSubmission = async () => {
    try {
      setLoading(true);

      // Load submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .select(`
          *,
          student:profiles!student_id(id, full_name, email, avatar_url),
          activity:activities!activity_id(id, title, max_score, due_date, content)
        `)
        .eq('id', submissionId)
        .single();

      if (submissionError) {
        logger.error('Erro ao carregar submissão:', submissionError)
        toast({ 
          title: 'Erro ao carregar submissão', 
          description: submissionError?.message || 'Não foi possível encontrar esta submissão.', 
          variant: 'destructive' 
        });
        navigate('/dashboard/corrections');
        return;
      }
      setSubmission(submissionData);
      setActivity(submissionData.activity);
      
      // Check if can use auto grading
      if (submissionData.activity) {
        setCanUseAutoGrade(canAutoGrade(submissionData.activity));
      }
      
      // Load class info
      if (submissionData.activity_id) {
        const { data: classData } = await supabase
          .from('activity_class_assignments')
          .select(`
            class_id,
            classes:class_id(id, name, subject)
          `)
          .eq('activity_id', submissionData.activity_id)
          .single();
        
        if (classData?.classes) {
          setClassInfo(classData.classes);
        }
      }

      // Load all submissions for this activity (for navigation)
      const { data: allSubs, error: allSubsError } = await supabase
        .from('submissions')
        .select('id, student_id, status')
        .eq('activity_id', submissionData.activity_id)
        .order('submitted_at', { ascending: true });

      if (!allSubsError) {
        setAllSubmissions(allSubs || []);
        const index = allSubs?.findIndex(s => s.id === submissionId) ?? 0;
        setCurrentIndex(index);
      }

    } catch (error) {
      toast({ 
        title: 'Erro ao carregar submissão', 
        description: error?.message || 'Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGrade = async () => {
    if (!activity || !submission) return null;
    
    try {
      const rawContent = typeof submission.content === 'string'
        ? JSON.parse(submission.content)
        : (submission.content || {});

      // Garantir formato { questionId: answerId }
      const studentAnswers = rawContent.selectedAnswers || rawContent.answers || rawContent;
      
      const questions = activity.content?.questions || [];
      const result = calculateAutoGrade(questions, studentAnswers, activity.max_score);
      
      if (result) {
        const feedback = generateAutoFeedback(result);
        toast({
          title: 'Correção automática concluída',
          description: `Nota: ${result.grade}/${activity.max_score} (${result.correctCount}/${result.totalQuestions} corretas)`
        });
        return { grade: result.grade, feedback };
      }
    } catch (error) {
      logger.error('Erro na correção automática:', error);
      toast({
        title: 'Erro na correção automática',
        description: 'Não foi possível corrigir automaticamente.',
        variant: 'destructive'
      });
    }
    return null;
  };

  const handleAISuggestion = async () => {
    if (!submission || !activity) return null;
    
    try {
      // TODO: Implementar chamada à API de IA
      // Por enquanto, retorna uma mensagem genérica
      toast({
        title: 'Sugestão por IA',
        description: 'Em breve você poderá gerar feedback com IA!'
      });
      
      const suggestedFeedback = `Revisão da submissão realizada.\n\nPontos fortes:\n- Organização das respostas\n- Compreensão do conteúdo\n\nPontos de melhoria:\n- Revisar conceitos específicos\n- Aprofundar justificativas`;
      
      return { feedback: suggestedFeedback };
    } catch (error) {
      logger.error('Erro ao gerar sugestão por IA:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar sugestão.',
        variant: 'destructive'
      });
    }
    return null;
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

      toast({ 
        title: '✅ Nota salva com sucesso!',
        description: 'O feedback foi enviado ao aluno.'
      });
      
      // Navigate to next submission or back
      if (currentIndex < allSubmissions.length - 1) {
        const nextSubmission = allSubmissions[currentIndex + 1];
        navigate(`/dashboard/grading/${nextSubmission.id}`);
      } else {
        navigate('/dashboard/corrections');
      }

    } catch (error) {
      toast({ 
        title: 'Erro ao salvar nota', 
        description: error?.message || 'Tente novamente em instantes.', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNavigate = (direction) => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < allSubmissions.length) {
      const targetSubmission = allSubmissions[newIndex];
      navigate(`/dashboard/grading/${targetSubmission.id}`);
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
        onClick={() => navigate('/dashboard/corrections')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Submissões
      </Button>

      {/* Header */}
      <DashboardHeader
        title={`Corrigir Submissão${submission?.student?.full_name ? ` - ${submission.student.full_name}` : ''}`}
        subtitle={`${activity?.title || 'Atividade'}${classInfo?.name ? ` • Turma: ${classInfo.name}` : ''} • ${currentIndex + 1} de ${allSubmissions.length}`}
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
                  alt={submission.student.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                  {submission?.student?.full_name?.[0] || 'A'}
                </div>
              )}
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-lg">
                  {submission?.student?.full_name || 'Aluno'}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {submission?.student?.email || 'Sem email'}
                </p>
                {classInfo && (
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                    {classInfo.name} {classInfo.subject && `- ${classInfo.subject}`}
                  </p>
                )}
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
            
            <div className="max-w-none">
              {renderSubmissionContent()}
            </div>
          </Card>
        </div>

        {/* Grading Form */}
        <div className="space-y-6">
          <GradeForm
            maxGrade={activity?.max_score || 10}
            initialGrade={submission?.grade}
            initialFeedback={submission?.feedback || ''}
            onSave={handleSaveGrade}
            onCancel={() => navigate('/dashboard/corrections')}
            onAutoGrade={handleAutoGrade}
            onAISuggestion={handleAISuggestion}
            loading={saving}
            canUseAutoGrade={canUseAutoGrade}
            canUseAI={true}
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
