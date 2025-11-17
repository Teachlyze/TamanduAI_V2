import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { X, Save, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
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
import { convertFromDatabase, getGradeOptions, isValidGrade as validateGrade, GRADING_SYSTEMS } from '@/shared/utils/gradeConverter';

const CorrectionModal = ({ submission, submissions = [], currentIndex = 0, onClose, onSaved, onNavigate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Buscar grading_system da turma
  const gradingSystem = submission.activity?.activity_class_assignments?.[0]?.class?.grading_system || '0-10';
  const gradeOptions = getGradeOptions(gradingSystem);
  const systemConfig = GRADING_SYSTEMS[gradingSystem];
  
  const [loading, setLoading] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  
  // Converter nota do banco (0-10) para escala da UI ao inicializar
  const initialGrade = submission.grade 
    ? convertFromDatabase(submission.grade, gradingSystem)
    : '';
  
  const [grade, setGrade] = useState(initialGrade);
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [rubricScores, setRubricScores] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [inlineComments, setInlineComments] = useState([]);
  const [startTime] = useState(Date.now());
  
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < submissions.length - 1;
  
  // Validações
  const maxScore = submission.activity?.max_score || 10;
  const isValidGrade = grade !== '' && validateGrade(grade, gradingSystem);
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
      // IMPORTANTE: Passar grade como string, pois pode ser "B", "Aprovado", etc
      // A função saveCorrection fará a conversão para 0-10
      const result = await saveCorrection(submission.id, {
        grade: grade, // String: "85", "B", "Aprovado", etc
        feedback,
        rubricScores,
        teacherId: user.id
      });

      if (result.error) throw result.error;

      // Mostrar mensagem sobre conversão se necessário
      if (result.converted) {
        const systemName = {
          '0-10': '0-10',
          '0-100': '0-100',
          'A-F': 'A-F',
          'pass-fail': 'Aprovado/Reprovado',
          'excellent-poor': 'Conceitos'
        }[result.gradingSystem] || result.gradingSystem;
        
        toast({
          title: 'ℹ️ Nota Convertida',
          description: `Nota "${result.originalGrade}" (${systemName}) foi salva como ${result.normalizedGrade.toFixed(2)}/10 no sistema`,
          duration: 4000
        });
      }

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
        logger.error('Erro ao enviar notificação:', notifError)
        // Não falhar a correção se notificação falhar
      }

      onSaved();
    } catch (error) {
      logger.error('Erro ao salvar correção:', error)
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
    // Para atividades FECHADAS (quiz), não permitir correção com IA
    if (submission.activity?.type === 'quiz') {
      toast({
        title: 'Não disponível',
        description: 'Atividades fechadas têm correção automática, não precisam de IA',
        variant: 'destructive'
      });
      return;
    }

    setLoadingAI(true);
    try {
      // IA vai PROPOR nota e feedback baseado na resposta do aluno
      // NÃO exigir nota prévia - a IA analisa e sugere
      const { data, error } = await suggestFeedbackWithAI({
        content: submission.content,
        grade: grade ? parseFloat(grade) : null, // Nota opcional
        maxScore: maxScore,
        activityType: submission.activity?.type,
        activityDescription: submission.activity?.description,
        questions: submission.activity?.content?.questions
      });

      if (error) throw error;

      // Se a IA sugeriu uma nota e ainda não há nota preenchida
      if (data.suggestedGrade && !grade) {
        setGrade(data.suggestedGrade.toString());
        toast({
          title: '✨ Nota sugerida pela IA',
          description: `A IA analisou a resposta e sugeriu nota ${data.suggestedGrade}/${maxScore}. Revise antes de salvar.`,
          duration: 5000
        });
      }

      if (data.suggestion) {
        setFeedback(prev => prev ? `${prev}\n\n${data.suggestion}` : data.suggestion);
        toast({
          title: 'Feedback gerado com IA',
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
    const content = submission.content;
    let text = '';

    if (typeof content === 'string') {
      text = content;
    } else if (content) {
      if (typeof content.answer === 'string' && content.answer.trim()) {
        text = content.answer;
      } else if (typeof content.text === 'string' && content.text.trim()) {
        text = content.text;
      } else if (typeof content === 'object') {
        const values = Object.values(content).filter(v => typeof v === 'string' && v.trim());
        if (values.length > 0) {
          text = values.join('\n\n');
        }
      }
    }

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
    <Dialog open onOpenChange={onClose}>
      <DialogTitle className="sr-only">Corrigir Submissão</DialogTitle>
      <DialogDescription className="sr-only">
        Formulário de correção para a submissão de {submission.student?.full_name || 'aluno'}
      </DialogDescription>
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
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              title="Fechar e voltar"
            >
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

              {/* Antiplágio apenas para atividades ABERTAS e MISTAS (não para quiz/fechadas) */}
              {submission.activity?.plagiarism_enabled && submission.activity?.type !== 'quiz' && (
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
                    text={(function () {
                      const content = submission.content;
                      if (typeof content === 'string') return content;
                      if (!content) return '';
                      if (typeof content.answer === 'string' && content.answer.trim()) return content.answer;
                      if (typeof content.text === 'string' && content.text.trim()) return content.text;
                      if (typeof content === 'object') {
                        const values = Object.values(content).filter(v => typeof v === 'string' && v.trim());
                        if (values.length > 0) return values.join('\n\n');
                      }
                      return '';
                    })()}
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
                  {gradeOptions ? (
                    // Sistema de letras, pass-fail ou conceitos
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-4 py-3 text-2xl font-bold text-center border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-slate-800"
                    >
                      <option value="">Selecione...</option>
                      {gradeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    // Sistema numérico (0-10, 0-100)
                    <Input
                      type="number"
                      min={systemConfig?.min || 0}
                      max={systemConfig?.max || maxScore}
                      step={systemConfig?.type === 'numeric' && systemConfig.max === 100 ? "1" : "0.1"}
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="text-2xl font-bold text-center"
                      placeholder="0"
                    />
                  )}
                  
                  <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                    {systemConfig?.type === 'numeric' 
                      ? `Escala: ${systemConfig.min}-${systemConfig.max}`
                      : `Sistema: ${gradingSystem}`
                    }
                  </p>
                  
                  {!isValidGrade && grade !== '' && (
                    <p className="text-sm text-red-600 text-center">
                      Nota inválida para o sistema {gradingSystem}
                    </p>
                  )}
                </div>
              </Card>

              {/* Feedback */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Feedback</h3>
                  <div className="flex gap-2">
                    {/* Botão IA apenas para atividades ABERTAS e MISTAS (não para quiz/fechadas) */}
                    {submission.activity?.type !== 'quiz' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateAIFeedback}
                        disabled={loadingAI}
                        title="IA irá analisar a resposta e sugerir nota + feedback"
                      >
                        {loadingAI ? 'Analisando...' : '✨ Corrigir com IA'}
                      </Button>
                    )}
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
