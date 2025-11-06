import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, ChevronLeft, ChevronRight, AlertCircle, Shield, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/components/ui/use-toast';
import { useAuth } from '@/shared/hooks/useAuth';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { saveCorrection, getCorrectionDraft, saveCorrectionDraft, getSubmissionDetails } from '@/shared/services/correctionService';
import { getFeedbackTemplates, suggestFeedbackWithAI } from '@/shared/services/feedbackService';
import NotificationService from '@/shared/services/notificationService';
import { checkPlagiarismWithEdgeFunction } from '@/shared/services/plagiarismService';
import { convertFromDatabase, getGradeOptions, isValidGrade as validateGrade, GRADING_SYSTEMS } from '@/shared/utils/gradeConverter';

// Import components do modal
import FeedbackTemplatesSelector from './components/FeedbackTemplatesSelector';
import RubricScoring from './components/RubricScoring';
import SubmissionView from './components/SubmissionView';
import InlineComments from './components/InlineComments';

const CorrectionPage = () => {
  const { submissionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [checkingPlagiarism, setCheckingPlagiarism] = useState(false);
  
  const [submission, setSubmission] = useState(null);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Formulário de correção
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [rubricScores, setRubricScores] = useState({});
  const [inlineComments, setInlineComments] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [gradingSystem, setGradingSystem] = useState(null);
  const [selectedQuestionsForPlagiarism, setSelectedQuestionsForPlagiarism] = useState([]);
  const [questionsPlagiarismResults, setQuestionsPlagiarismResults] = useState({});

  // Carregar submissão
  useEffect(() => {
    if (submissionId) {
      loadSubmission();
    }
  }, [submissionId]);

  // Carregar lista de submissões do query param
  useEffect(() => {
    const submissionsParam = searchParams.get('submissions');
    if (submissionsParam) {
      try {
        const ids = JSON.parse(submissionsParam);
        setAllSubmissions(ids);
        const index = ids.findIndex(id => id === submissionId);
        setCurrentIndex(index >= 0 ? index : 0);
      } catch (error) {
        logger.error('Erro ao parsear submissions:', error);
      }
    }
  }, [searchParams, submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      
      const { data: submissionData, error } = await getSubmissionDetails(submissionId);
      if (error) throw error;
      
      setSubmission(submissionData);
      
      // Configurar sistema de notas da turma
      const system = submissionData.class?.grading_system || 'NUMERIC_0_10';
      const gradingSystemData = GRADING_SYSTEMS[system] || GRADING_SYSTEMS['NUMERIC_0_10'];
      setGradingSystem(gradingSystemData);
      setGradeOptions(getGradeOptions(system));
      
      // Carregar correção existente ou rascunho
      let initialGrade = '';
      if (submissionData.grade !== null && submissionData.grade !== undefined) {
        const converted = convertFromDatabase(submissionData.grade, system);
        // convertFromDatabase retorna diretamente o valor (string ou número)
        initialGrade = converted !== undefined && converted !== null ? String(converted) : '';
      }
      
      setGrade(initialGrade);
      setFeedback(String(submissionData.feedback || ''));
      setRubricScores(submissionData.rubric_scores || {});
      setInlineComments(submissionData.inline_comments || []);
      
      // Rascunho desabilitado - tabela correction_drafts não existe
      // if (user?.id) {
      //   try {
      //     const { data: draft } = await getCorrectionDraft(submissionId, user.id);
      //     if (draft) {
      //       setGrade(draft.grade?.toString() || initialGrade || '');
      //       setFeedback(draft.feedback || submissionData.feedback || '');
      //       setRubricScores(draft.rubric_scores || {});
      //     }
      //   } catch (error) {
      //     logger.warn('Nenhum rascunho encontrado');
      //   }
      // }
      
    } catch (error) {
      logger.error('Erro ao carregar submissão:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a submissão',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToSubmission = (direction) => {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < allSubmissions.length) {
      const newSubmissionId = allSubmissions[newIndex];
      const submissionsParam = searchParams.get('submissions');
      navigate(`/dashboard/corrections/${newSubmissionId}${submissionsParam ? `?submissions=${submissionsParam}` : ''}`);
    }
  };

  const handleSave = async (notify = false) => {
    if (!validateGrade(grade, gradingSystem?.id)) {
      toast({
        title: 'Nota inválida',
        description: `Por favor, insira uma nota válida para o sistema ${gradingSystem?.name}`,
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      
      const correctionData = {
        grade,
        feedback,
        rubricScores: rubricScores,
        inlineComments: inlineComments,
        teacherId: user.id,
        status: 'graded'
      };
      
      const { data: savedData, error } = await saveCorrection(submissionId, correctionData);
      if (error) {
        logger.error('Erro ao salvar correção:', error);
        throw new Error(error.message || 'Erro desconhecido ao salvar');
      }
      
      if (!savedData) {
        throw new Error('Correção não foi salva - sem dados retornados');
      }
      
      // Notificação ao aluno (implementar futuramente)
      // TODO: Implementar notificação real ao aluno
      
      toast({
        title: '✅ Correção salva!',
        description: 'A correção foi salva com sucesso'
      });
      
      // Se tem próxima, navegar automaticamente
      if (currentIndex < allSubmissions.length - 1) {
        setTimeout(() => navigateToSubmission(1), 1000);
      } else {
        setTimeout(() => navigate('/dashboard/corrections'), 1000);
      }
      
    } catch (error) {
      logger.error('Erro ao salvar correção:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar a correção. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    // Funcionalidade desabilitada - tabela correction_drafts não existe
    toast({
      title: 'ℹ️ Rascunho automático',
      description: 'Use "Salvar" para gravar a correção'
    });
    // try {
    //   await saveCorrectionDraft(submissionId, user.id, {
    //     grade,
    //     feedback,
    //     rubric_scores: rubricScores
    //   });
    //   
    //   toast({
    //     title: '💾 Rascunho salvo',
    //     description: 'Suas alterações foram salvas'
    //   });
    // } catch (error) {
    //   logger.error('Erro ao salvar rascunho:', error);
    // }
  };

  const handleSuggestFeedback = async () => {
    try {
      setLoadingAI(true);
      const text = typeof submission.content === 'string'
        ? submission.content
        : submission.content?.text || '';
      
      // Se já tem nota, usar ela; senão IA vai sugerir
      const currentGrade = grade ? parseFloat(grade) : null;
      
      const { data, error } = await suggestFeedbackWithAI({
        content: text,
        grade: currentGrade, // Envia nota atual ou null
        activityType: submission.activity.type || 'assignment',
        activityTitle: submission.activity.title,
        activityDescription: submission.activity.description || '',
        maxGrade: gradingSystem?.max || 10
      });
      
      if (error) throw error;
      
      // Preencher feedback - garantir que é string
      const suggestedFeedback = data.suggestion || data.feedback || '';
      const feedbackText = typeof suggestedFeedback === 'string' 
        ? suggestedFeedback 
        : JSON.stringify(suggestedFeedback);
      
      setFeedback(feedbackText);
      
      // Preencher nota sugerida pela IA (apenas se não tinha nota antes)
      if (!grade && data.suggestedGrade !== undefined && data.suggestedGrade !== null) {
        setGrade(data.suggestedGrade.toString());
        toast({
          title: '✨ Nota e feedback sugeridos pela IA',
          description: 'Revise e ajuste conforme necessário'
        });
      } else if (grade) {
        toast({
          title: '✨ Feedback gerado pela IA',
          description: `Baseado na nota ${grade}. Revise e ajuste conforme necessário`
        });
      } else {
        toast({
          title: '✨ Feedback gerado pela IA',
          description: 'Revise e ajuste conforme necessário'
        });
      }
    } catch (error) {
      logger.error('Erro ao gerar feedback:', error);
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
    // Se é atividade mista e tem questões abertas selecionadas
    if (submission.activity.type === 'mixed' && submission.content?.answers) {
      if (selectedQuestionsForPlagiarism.length === 0) {
        toast({
          title: 'Selecione questões',
          description: 'Marque quais questões abertas devem ser verificadas',
          variant: 'destructive'
        });
        return;
      }
      
      // Verificar cada questão selecionada
      setCheckingPlagiarism(true);
      const results = {};
      
      for (const questionId of selectedQuestionsForPlagiarism) {
        try {
          const answer = submission.content.answers.find(a => a.question_id === questionId);
          if (!answer || !answer.answer || answer.answer.length < 50) continue;
          
          const { data, error } = await checkPlagiarismWithEdgeFunction(
            `${submission.id}_q${questionId}`,
            answer.answer
          );
          
          if (!error && data) {
            results[questionId] = {
              score: data.plagiarismScore,
              message: data.message,
              severity: data.severity
            };
          }
        } catch (error) {
          logger.error(`Erro ao verificar questão ${questionId}:`, error);
        }
      }
      
      setQuestionsPlagiarismResults(results);
      setCheckingPlagiarism(false);
      
      toast({
        title: '✅ Verificação concluída',
        description: `${Object.keys(results).length} questão(ões) verificada(s)`
      });
    } else {
      // Atividade aberta - verificar texto completo
      const text = typeof submission.content === 'string' 
        ? submission.content 
        : submission.content?.text || '';
      
      if (!text || text.length < 50) {
        toast({
          title: 'Texto muito curto',
          description: 'O texto deve ter pelo menos 50 caracteres',
          variant: 'destructive'
        });
        return;
      }

      setCheckingPlagiarism(true);
      try {
        const { data, error } = await checkPlagiarismWithEdgeFunction(submission.id, text);
        if (error) throw error;
        
        setSubmission(prev => ({
          ...prev,
          plagiarism_score: data.plagiarismScore
        }));
        
        toast({
          title: '🔍 Verificação concluída',
          description: `Originalidade: ${data.plagiarismScore}% - ${data.message}`,
          variant: data.severity === 'high' ? 'destructive' : 'default'
        });
      } catch (error) {
        logger.error('Erro ao verificar plágio:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível verificar plágio',
          variant: 'destructive'
        });
      } finally {
        setCheckingPlagiarism(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Submissão não encontrada</h2>
          <Button onClick={() => navigate('/dashboard/corrections')}>
            Voltar para Correções
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header Fixo */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Voltar */}
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard/corrections')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            
            {/* Título */}
            <div className="text-center flex-1">
              <h1 className="text-xl font-bold">{submission.activity.title}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {submission.student.full_name || submission.student.name} • {submission.class?.name || 'Turma'}
              </p>
            </div>
            
            {/* Navegação */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToSubmission(-1)}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-slate-600">
                {currentIndex + 1} / {allSubmissions.length || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToSubmission(1)}
                disabled={currentIndex === allSubmissions.length - 1}
              >
                Próxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Conteúdo Principal - 2 Colunas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda: Submissão do Aluno */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Submissão do Aluno
                </h2>
                <Badge variant={submission.status === 'graded' ? 'success' : 'warning'}>
                  {submission.status === 'graded' ? 'Corrigida' : 'Pendente'}
                </Badge>
              </div>
              
              <SubmissionView submission={submission} />
              
              {submission.activity.has_inline_comments && (
                <div className="mt-6">
                  <InlineComments
                    content={submission.content}
                    comments={inlineComments}
                    onChange={setInlineComments}
                  />
                </div>
              )}
            </Card>
            
            {/* Verificação de Plágio - Apenas para atividades abertas/mistas */}
            {submission.activity?.plagiarism_enabled && 
             (submission.activity.type === 'assignment' || submission.activity.type === 'mixed') && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Verificação de Plágio
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCheckPlagiarism}
                    disabled={checkingPlagiarism}
                  >
                    {checkingPlagiarism ? 'Verificando...' : '🔍 Verificar'}
                  </Button>
                </div>
                
                {/* Atividade Mista: Seleção de questões */}
                {submission.activity.type === 'mixed' && submission.content?.answers && (
                  <div className="mb-4">
                    <p className="text-sm text-slate-600 mb-3">
                      Selecione as questões abertas para verificar:
                    </p>
                    <div className="space-y-2">
                      {submission.content.answers
                        .filter(answer => answer.question_type === 'open')
                        .map((answer, idx) => (
                          <label key={answer.question_id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                            <input
                              type="checkbox"
                              checked={selectedQuestionsForPlagiarism.includes(answer.question_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedQuestionsForPlagiarism([...selectedQuestionsForPlagiarism, answer.question_id]);
                                } else {
                                  setSelectedQuestionsForPlagiarism(selectedQuestionsForPlagiarism.filter(id => id !== answer.question_id));
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">Questão {idx + 1}</p>
                              <p className="text-xs text-slate-600 line-clamp-2">{answer.answer?.substring(0, 100)}...</p>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Resultados */}
                {submission.activity.type === 'mixed' && Object.keys(questionsPlagiarismResults).length > 0 ? (
                  <div className="space-y-3">
                    <p className="font-medium text-sm mb-2">Resultados por questão:</p>
                    {Object.entries(questionsPlagiarismResults).map(([questionId, result]) => {
                      const questionIndex = submission.content.answers.findIndex(a => a.question_id.toString() === questionId);
                      return (
                        <div key={questionId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <span className="text-sm font-medium">Questão {questionIndex + 1}</span>
                          <div className="flex items-center gap-3">
                            <div className={`text-2xl font-bold ${
                              result.score >= 90 ? 'text-green-600' :
                              result.score >= 70 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {result.score}%
                            </div>
                            <div>
                              <p className="text-xs text-slate-600">
                                {result.score >= 90 ? '✅ Excelente' :
                                 result.score >= 70 ? '⚠️ Aceitável' :
                                 '❌ Atenção'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : submission.activity.type === 'assignment' && submission.plagiarism_score !== null ? (
                  <div className="flex items-center gap-3">
                    <div className={`text-4xl font-bold ${
                      submission.plagiarism_score >= 90 ? 'text-green-600' :
                      submission.plagiarism_score >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {submission.plagiarism_score}%
                    </div>
                    <div>
                      <p className="font-medium">Original</p>
                      <p className="text-sm text-slate-600">
                        {submission.plagiarism_score >= 90 ? 'Excelente originalidade' :
                         submission.plagiarism_score >= 70 ? 'Originalidade aceitável' :
                         'Atenção: baixa originalidade'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-600">
                    <AlertCircle className="w-5 h-5" />
                    <span>
                      {submission.activity.type === 'mixed' 
                        ? 'Selecione questões e clique em Verificar'
                        : 'Plágio não verificado ainda'}
                    </span>
                  </div>
                )}
              </Card>
            )}
          </div>
          
          {/* Coluna Direita: Formulário de Correção */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-6">Avaliação e Feedback</h2>
              
              {/* Nota */}
              <div className="mb-6">
                <Label htmlFor="grade" className="text-base font-semibold mb-2">
                  Nota *
                </Label>
                <div className="flex items-center gap-4">
                  {gradingSystem?.type === 'select' ? (
                    <select
                      id="grade"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-lg"
                    >
                      <option value="">Selecione...</option>
                      {gradeOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="grade"
                      type="number"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      min={gradingSystem?.min || 0}
                      max={gradingSystem?.max || 10}
                      step={gradingSystem?.step || 0.1}
                      placeholder={`${gradingSystem?.min || 0} a ${gradingSystem?.max || 10}`}
                      className="flex-1"
                    />
                  )}
                  <span className="text-slate-600">/ {gradingSystem?.max || 10}</span>
                </div>
              </div>
              
              {/* Rubrica (se houver) */}
              {submission.activity.rubric && (
                <div className="mb-6">
                  <Label className="text-base font-semibold mb-3">Rubrica de Avaliação</Label>
                  <RubricScoring
                    rubric={submission.activity.rubric}
                    scores={rubricScores}
                    onChange={setRubricScores}
                  />
                </div>
              )}
              
              {/* Feedback */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="feedback" className="text-base font-semibold">
                    Feedback para o Aluno
                  </Label>
                  <div className="flex gap-2">
                    <FeedbackTemplatesSelector onSelect={(template) => setFeedback(template.content)} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSuggestFeedback}
                      disabled={loadingAI}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {loadingAI ? 'Gerando...' : 'Sugerir Nota e Feedback'}
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Escreva um feedback construtivo para o aluno..."
                  rows={8}
                  className="resize-none"
                />
              </div>
              
              {/* Botões de Ação */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving || !grade}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar e Notificar Aluno'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  className="w-full"
                >
                  💾 Salvar Rascunho
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrectionPage;
