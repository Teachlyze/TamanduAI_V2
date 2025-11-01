import React, { useState, useEffect } from 'react';
import { X, Save, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import { saveCorrection, getCorrectionDraft, saveCorrectionDraft, updateCorrectionMetrics } from '@/shared/services/correctionService';
import { getFeedbackTemplates, suggestFeedbackWithAI } from '@/shared/services/feedbackService';
import NotificationService from '@/shared/services/notificationService';
import { checkPlagiarismWithEdgeFunction } from '@/shared/services/plagiarismService';
import FeedbackTemplatesSelector from './FeedbackTemplatesSelector';
import RubricScoring from './RubricScoring';
import SubmissionView from './SubmissionView';
import InlineComments from './InlineComments';

const CorrectionModal = ({ submission, submissions = [], currentIndex = 0, onClose, onSaved, onNavigate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  const [grade, setGrade] = useState(submission.grade || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [rubricScores, setRubricScores] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [inlineComments, setInlineComments] = useState([]);
  const [startTime] = useState(Date.now());
  
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < submissions.length - 1;
  
  // Validações
  const maxScore = submission.activity?.max_score || 10;
  const isValidGrade = grade !== '' && parseFloat(grade) >= 0 && parseFloat(grade) <= maxScore;
  const isValidFeedback = feedback.length >= 20;

  useEffect(() => {
    loadTemplates();
    loadDraft();
    
    // Auto-save a cada 30 segundos
    const autoSaveInterval = setInterval(() => {
      if (grade || feedback) {
        handleSaveDraft();
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, []);

  const loadTemplates = async () => {
    const { data } = await getFeedbackTemplates(user.id);
    if (data) setTemplates(data);
  };

  const loadDraft = async () => {
    const { data } = await getCorrectionDraft(submission.id, user.id);
    if (data?.draft_data) {
      setGrade(data.draft_data.grade || '');
      setFeedback(data.draft_data.feedback || '');
      setRubricScores(data.draft_data.rubricScores || []);
    }
  };

  const handleSaveDraft = async () => {
    await saveCorrectionDraft(submission.id, user.id, {
      grade,
      feedback,
      rubricScores
    });
  };

  const handleSave = async () => {
    if (!isValidGrade) {
      toast({
        title: 'Erro',
        description: `A nota deve estar entre 0 e ${maxScore}`,
        variant: 'destructive'
      });
      return;
    }

    if (!isValidFeedback) {
      toast({
        title: 'Aviso',
        description: 'Recomendamos um feedback com pelo menos 20 caracteres',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Calcular tempo de correção
      const correctionTime = Math.round((Date.now() - startTime) / 1000);

      // Salvar correção
      const { error } = await saveCorrection(submission.id, {
        grade: parseFloat(grade),
        feedback,
        rubricScores,
        teacherId: user.id
      });

      if (error) throw error;

      // Atualizar métricas
      await updateCorrectionMetrics(
        user.id,
        correctionTime,
        parseFloat(grade),
        feedback.length
      );

      // Enviar notificação ao aluno
      try {
        await NotificationService.sendCorrectionNotification({
          submissionId: submission.id,
          studentId: submission.student_id,
          activityTitle: submission.activity?.title,
          grade: parseFloat(grade),
          maxScore: maxScore
        });
      } catch (notifError) {
        console.error('Erro ao enviar notificação:', notifError);
        // Não falhar a correção se notificação falhar
      }

      onSaved();
    } catch (error) {
      console.error('Erro ao salvar correção:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a correção',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setFeedback(prev => prev ? `${prev}\n\n${template.template_text}` : template.template_text);
  };

  const handleGenerateAIFeedback = async () => {
    if (!grade) {
      toast({
        title: 'Erro',
        description: 'Atribua uma nota antes de gerar feedback com IA',
        variant: 'destructive'
      });
      return;
    }

    setLoadingAI(true);
    try {
      const { data, error } = await suggestFeedbackWithAI({
        content: submission.content,
        grade: parseFloat(grade),
        maxScore: maxScore,
        activityType: submission.activity?.type
      });

      if (error) throw error;

      if (data.suggestion) {
        setFeedback(prev => prev ? `${prev}\n\n${data.suggestion}` : data.suggestion);
        toast({
          title: 'Feedback gerado',
          description: data.warning || 'Revise e personalize antes de salvar'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar feedback com IA',
        variant: 'destructive'
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleCheckPlagiarism = async () => {
    const text = typeof submission.content === 'string' 
      ? submission.content 
      : submission.content?.text || '';

    if (!text) {
      toast({
        title: 'Erro',
        description: 'Sem texto para verificar',
        variant: 'destructive'
      });
      return;
    }

    setCheckingPlagiarism(true);
    try {
      const { data, error } = await checkPlagiarismWithEdgeFunction(submission.id, text);

      if (error) throw error;

      toast({
        title: 'Verificação concluída',
        description: `Originalidade: ${data.plagiarismScore}% - ${data.message}`,
        variant: data.severity === 'high' ? 'destructive' : 'default'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível verificar plágio',
        variant: 'destructive'
      });
    } finally {
      setCheckingPlagiarism(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => onNavigate && onNavigate('prev')}
              disabled={!hasPrevious}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {submission.student?.full_name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {submission.activity?.title}
              </p>
              {submissions.length > 0 && (
                <p className="text-sm text-gray-500">
                  {currentIndex + 1} de {submissions.length}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => onNavigate && onNavigate('next')}
              disabled={!hasNext}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-2 gap-6 p-6">
            {/* Coluna 1: Submissão */}
            <div className="overflow-y-auto space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Submissão do Aluno</h3>
                <SubmissionView submission={submission} />
              </Card>

              {submission.activity?.plagiarism_enabled && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Verificação de Plágio</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckPlagiarism}
                      disabled={checkingPlagiarism}
                    >
                      {checkingPlagiarism ? 'Verificando...' : '🔍 Verificar'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span>
                      Originalidade: {submission.plagiarism_score || 'Não verificado'}%
                    </span>
                  </div>
                </Card>
              )}

              {/* Comentários Inline */}
              {submission.activity?.type === 'assignment' && (
                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Comentários no Texto</h3>
                  <InlineComments
                    text={typeof submission.content === 'string' ? submission.content : submission.content?.text}
                    comments={inlineComments}
                    onAddComment={(comment) => setInlineComments(prev => [...prev, comment])}
                    onDeleteComment={(id) => setInlineComments(prev => prev.filter(c => c.id !== id))}
                  />
                </Card>
              )}
            </div>

            {/* Coluna 2: Correção */}
            <div className="overflow-y-auto space-y-4">
              {/* Rubrica (se houver) */}
              {submission.activity?.content?.rubric && (
                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Rubrica de Avaliação</h3>
                  <RubricScoring
                    rubric={submission.activity.content.rubric}
                    scores={rubricScores}
                    onChange={setRubricScores}
                    onTotalChange={(total) => setGrade(total.toString())}
                  />
                </Card>
              )}

              {/* Nota */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Nota Final</h3>
                <div className="space-y-2">
                  <Input
                    type="number"
                    min="0"
                    max={maxScore}
                    step="0.1"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="text-2xl font-bold text-center"
                    placeholder="0.0"
                  />
                  <p className="text-sm text-center text-gray-600">
                    de {maxScore} pontos
                  </p>
                  {!isValidGrade && grade !== '' && (
                    <p className="text-sm text-red-600 text-center">
                      Nota deve estar entre 0 e {maxScore}
                    </p>
                  )}
                </div>
              </Card>

              {/* Feedback */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Feedback</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateAIFeedback}
                      disabled={loadingAI || !grade}
                    >
                      {loadingAI ? 'Gerando...' : '✨ IA'}
                    </Button>
                    <FeedbackTemplatesSelector
                      templates={templates}
                      onSelect={handleTemplateSelect}
                    />
                  </div>
                </div>
                
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Escreva um feedback detalhado para o aluno..."
                  className="min-h-[200px]"
                />
                
                <div className="flex justify-between mt-2 text-sm">
                  <span className={feedback.length < 20 ? 'text-red-600' : 'text-gray-600'}>
                    {feedback.length} caracteres {feedback.length < 20 && '(mínimo recomendado: 20)'}
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-white dark:bg-slate-900">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={loading}
            >
              Salvar Rascunho
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={loading || !isValidGrade}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar e Fechar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CorrectionModal;
