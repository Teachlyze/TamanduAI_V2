import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Save, Eye, FileText, CheckSquare, Grid, AlertCircle,
  Plus, Settings, BookOpen, Clock, Paperclip, Trash2
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import { cn } from '@/lib/utils';
import ActivityTypeSelector from './components/ActivityTypeSelector';
import OpenQuestions from './components/OpenQuestions';
import ClosedQuestions from './components/ClosedQuestions';
import MixedQuestions from './components/MixedQuestions';
import AdvancedSettings from './components/AdvancedSettings';
import ActivityPreview from './components/ActivityPreview';
import ValidationChecklist from './components/ValidationChecklist';
import useActivityFiles from '@/shared/hooks/useActivityFiles';
import { mapFrontendTypeToDatabase, mapDatabaseTypeToFrontend, isValidDatabaseType } from '@/constants/activityTypes';

const TeacherActivityCreatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const isEditMode = !!id;

  // Estados principais
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasSubmissions, setHasSubmissions] = useState(false);
  const [lockedStructure, setLockedStructure] = useState(null);

  // Dados da atividade
  const [activityType, setActivityType] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [maxScore, setMaxScore] = useState(10);

  // Questões
  const [questions, setQuestions] = useState([]);
  // Anexos (arquivos de apoio da atividade)
  const [attachments, setAttachments] = useState([]);

  // Configurações avançadas
  const [advancedSettings, setAdvancedSettings] = useState({
    allowLateSubmission: false,
    latePenaltyType: 'percentage',
    latePenaltyValue: 10,
    maxLateDays: 7,
    allowMultipleAttempts: false,
    maxAttempts: 1,
    attemptScoring: 'best',
    timeLimit: null,
    showScoreImmediately: true,
    showAnswerKey: false,
    releaseAnswerAfterDeadline: true,
    plagiarismEnabled: false,
    plagiarismSensitivity: 'medium',
    plagiarismMinOriginality: 70,
    shuffleQuestions: false,
    shuffleAlternatives: false
  });

  // Estados de UI
  const [currentSection, setCurrentSection] = useState(isEditMode ? 'basics' : 'type'); // Edit mode pula tipo
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Upload de arquivos (usa drafts quando não há id ainda)
  const {
    isUploading: isUploadingFiles,
    uploadProgress,
    uploadActivityFile,
    removeActivityFile,
    publishActivityFiles,
    resetError: resetUploadError,
  } = useActivityFiles(id || 'temp', user?.id, !isEditMode);

  // Auto-save
  useEffect(() => {
    if (!activityType) return;

    const autoSaveInterval = setInterval(() => {
      handleAutoSave();
    }, 60000); // 60 segundos

    return () => clearInterval(autoSaveInterval);
  }, [activityType, title, description, questions, advancedSettings]);

  // Carregar atividade existente ou dados importados
  useEffect(() => {
    if (isEditMode) {
      loadActivity();
    } else {
      // Verificar se há dados importados
      loadImportedData();
    }
  }, [id]);

  const loadImportedData = () => {
    try {
      const importedData = sessionStorage.getItem('importedActivity');
      if (importedData) {
        const data = JSON.parse(importedData);
        
        // Definir tipo de atividade (mixed por padrão para importadas)
        // Inferir tipo a partir das questões importadas, se houver
        let inferredType = data.activityType || null;
        if (!inferredType && Array.isArray(data.questions) && data.questions.length > 0) {
          const hasClosed = data.questions.some(q => q.type === 'closed');
          const hasOpen = data.questions.some(q => q.type === 'open');
          if (hasClosed && hasOpen) inferredType = 'mixed';
          else if (hasClosed) inferredType = 'quiz';
          else if (hasOpen) inferredType = 'open';
        }
        setActivityType(inferredType || 'mixed');
        
        // Preencher campos com dados importados
        setTitle(data.title || '');
        setDescription(data.description || '');
        
        // Popular questões importadas quando existirem; caso contrário, criar questão aberta com o texto
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
        } else if (data.content) {
          setQuestions([{
            id: Date.now().toString(),
            type: 'open',
            text: data.content,
            points: 10,
            maxLines: null,
            maxCharacters: null,
            image: null,
            attachments: [],
            rubric: [],
            expectedAnswer: ''
          }]);
        }
        
        toast({
          title: '📥 Atividade importada',
          description: `Conteúdo de "${data.importedFrom}" carregado. Revise e edite conforme necessário.`
        });
        
        // Limpar sessionStorage após carregar
        sessionStorage.removeItem('importedActivity');
        
        // Ir direto para a seção de questões
        setCurrentSection('questions');
      }
    } catch (error) {
      logger.error('Erro ao carregar dados importados:', error)
    }
  };

  const handleCreateNewVersion = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const { data: existingActivity, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const previousVersion =
        existingActivity.content?.advanced_settings?.version ||
        existingActivity.content?.advanced_settings?.activityVersion ||
        1;

      const nextVersion = previousVersion + 1;

      const newContent = {
        ...(existingActivity.content || {}),
        advanced_settings: {
          ...(existingActivity.content?.advanced_settings || {}),
          version: nextVersion,
          previousActivityId: existingActivity.id,
        },
      };

      const { data: newActivity, error: insertError } = await supabase
        .from('activities')
        .insert({
          title: `${existingActivity.title} - Versão ${nextVersion}`,
          description: existingActivity.description,
          type: existingActivity.type,
          max_score: existingActivity.max_score,
          status: 'draft',
          is_published: false,
          content: newContent,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: 'Nova versão criada',
        description: `A Versão ${nextVersion} foi criada como rascunho.`,
      });

      navigate(`/dashboard/activities/${newActivity.id}/edit`);
    } catch (error) {
      logger.error('Erro ao criar nova versão de atividade:', error);
      toast({
        title: 'Erro ao criar nova versão',
        description: 'Não foi possível criar uma nova versão da atividade.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const loadActivity = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Converter tipo do banco para frontend
      const frontendType = mapDatabaseTypeToFrontend(data.type);
      
      logger.debug('[Activity Load] Convertendo tipo:', { 
        databaseType: data.type, 
        frontendType 
      });

      // Preencher estados com dados carregados
      setActivityType(frontendType);
      setTitle(data.title);
      setDescription(data.description || '');
      setSubject(data.content?.subject || '');
      setTags(data.content?.tags || []);
      setDifficulty(data.content?.difficulty || 'medium');
      setEstimatedTime(data.content?.estimated_time || '');
      setMaxScore(data.max_score || 10);
      setQuestions(data.content?.questions || []);
      setAttachments(data.content?.attachments || []);
      
      if (data.content?.advanced_settings) {
        setAdvancedSettings(data.content.advanced_settings);
      }

      try {
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('submissions')
          .select('id')
          .eq('activity_id', id)
          .limit(1);

        if (submissionsError) {
          logger.warn('Erro ao verificar submissões da atividade:', submissionsError);
        }

        const hasSubs = (submissionsData || []).length > 0;
        setHasSubmissions(hasSubs);

        if (hasSubs) {
          setLockedStructure({
            databaseType: data.type,
            maxScore: data.max_score || 10,
            questions: data.content?.questions || [],
            advancedSettings: data.content?.advanced_settings || advancedSettings,
          });
        }
      } catch (submissionsCheckError) {
        logger.warn('Falha inesperada ao verificar submissões da atividade:', submissionsCheckError);
      }

      toast({
        title: 'Atividade carregada',
        description: 'Você pode editar e salvar as alterações.'
      });
    } catch (error) {
      logger.error('Erro ao carregar atividade:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a atividade.',
        variant: 'destructive'
      });
      navigate('/dashboard/activities');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSave = async () => {
    if (!title || !activityType) return;

    try {
      const shouldLockStructure = isEditMode && hasSubmissions && lockedStructure;

      const databaseType = shouldLockStructure
        ? lockedStructure.databaseType
        : mapFrontendTypeToDatabase(activityType);

      const activityData = {
        title,
        description,
        type: databaseType,  // CORREÇÃO: usa tipo mapeado
        max_score: shouldLockStructure ? lockedStructure.maxScore : maxScore,
        status: 'draft',
        content: {
          subject,
          tags,
          difficulty,
          estimated_time: estimatedTime,
          questions: shouldLockStructure ? lockedStructure.questions : questions,
          attachments,
          advanced_settings: shouldLockStructure ? lockedStructure.advancedSettings : advancedSettings
        },
        created_by: user.id,
        updated_at: new Date().toISOString()
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', id);

        if (error) throw error;
      } else {
        // Para nova atividade, salvar como rascunho se ainda não tiver ID
        // Implementar lógica de draft
      }

      setLastSaved(new Date());
    } catch (error) {
      logger.error('Erro no auto-save:', error)
    }
  };

  const validateActivity = () => {
    const errors = [];
    const warnings = [];

    // Validações críticas
    if (!title || title.trim().length < 3) {
      errors.push({ field: 'title', message: 'Título deve ter pelo menos 3 caracteres' });
    }

    if (!description || description.trim().length < 10) {
      errors.push({ field: 'description', message: 'Descrição deve ter pelo menos 10 caracteres' });
    }

    if (questions.length === 0) {
      errors.push({ field: 'questions', message: 'Adicione pelo menos uma questão' });
    }

    // Validar questões
    questions.forEach((question, index) => {
      if (!question.text || question.text.trim().length < 5) {
        errors.push({ field: `question-${index}`, message: `Questão ${index + 1}: enunciado muito curto` });
      }

      if (!question.points || question.points <= 0) {
        errors.push({ field: `question-${index}`, message: `Questão ${index + 1}: pontuação inválida` });
      }

      // Validações específicas por tipo
      if ((activityType === 'closed' || activityType === 'quiz') && question.type === 'closed') {
        if (!question.alternatives || question.alternatives.length < 2) {
          errors.push({ field: `question-${index}`, message: `Questão ${index + 1}: deve ter pelo menos 2 alternativas` });
        }

        const correctAlternatives = question.alternatives?.filter(alt => alt.isCorrect) || [];
        if (correctAlternatives.length === 0) {
          errors.push({ field: `question-${index}`, message: `Questão ${index + 1}: marque pelo menos uma alternativa correta` });
        }
      }
    });

    // Avisos
    if (tags.length === 0) {
      warnings.push({ field: 'tags', message: 'Considere adicionar tags para facilitar a organização' });
    }

    if (!estimatedTime) {
      warnings.push({ field: 'time', message: 'Tempo estimado não definido' });
    }

    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    if (Math.abs(totalPoints - maxScore) > 0.1) {
      warnings.push({ 
        field: 'score', 
        message: `Soma das questões (${totalPoints}) difere da pontuação máxima (${maxScore})` 
      });
    }

    setValidationErrors(errors);
    setValidationWarnings(warnings);

    return errors.length === 0;
  };

  const handleSaveDraft = async () => {
    // Validação mínima para rascunho
    if (!title || title.trim().length < 3) {
      toast({
        title: 'Título obrigatório',
        description: 'Defina um título para salvar o rascunho.',
        variant: 'destructive'
      });
      return;
    }

    if (!activityType) {
      toast({
        title: 'Tipo obrigatório',
        description: 'Selecione o tipo de atividade.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);

      const shouldLockStructure = isEditMode && hasSubmissions && lockedStructure;

      // Mapear tipo do frontend para o banco, respeitando estrutura bloqueada quando houver submissões
      const databaseType = shouldLockStructure
        ? lockedStructure.databaseType
        : mapFrontendTypeToDatabase(activityType);
      
      logger.debug('[Activity Draft] Mapeando tipo:', { 
        frontendType: activityType, 
        databaseType 
      });

      const activityData = {
        title: title.trim(),
        description: description?.trim() || '',
        type: databaseType,  // CORREÇÃO: usa tipo mapeado
        max_score: shouldLockStructure ? lockedStructure.maxScore : maxScore,
        status: 'draft',
        content: {
          subject,
          tags,
          difficulty,
          estimated_time: estimatedTime,
          questions: shouldLockStructure ? lockedStructure.questions : questions,
          attachments,
          advanced_settings: shouldLockStructure ? lockedStructure.advancedSettings : advancedSettings
        },
        created_by: user.id,
        updated_at: new Date().toISOString()
      };

      logger.debug('[TeacherActivityCreatePage] 💾 Salvando atividade:', {
        title,
        type: activityType,
        questionsCount: questions.length,
        advancedSettings
      });

      if (isEditMode) {
        const { error } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Rascunho salvo',
          description: 'Suas alterações foram salvas.'
        });
      } else {
        const { data, error } = await supabase
          .from('activities')
          .insert(activityData)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: '✅ Rascunho salvo!',
          description: 'Atividade salva como rascunho. Aparecerá na sua lista de atividades.'
        });

        // Navegar para tela de edição
        navigate(`/dashboard/activities/${data.id}/edit`, { replace: true });
      }

      setLastSaved(new Date());
    } catch (error) {
      logger.error('Erro ao salvar rascunho:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o rascunho.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validateActivity()) {
      toast({
        title: 'Validação falhou',
        description: 'Corrija os erros antes de publicar.',
        variant: 'destructive'
      });
      return;
    }

    // Verificar avisos
    if (validationWarnings.length > 0) {
      // Mostrar modal de confirmação
      setShowWarningModal(true);
      return;
    }

    // Se não há avisos, publicar diretamente
    await confirmPublish();
  };

  const confirmPublish = async () => {
    setShowWarningModal(false);
    
    try {
      setSaving(true);

      const shouldLockStructure = isEditMode && hasSubmissions && lockedStructure;

      // Mapear tipo do frontend para o banco, respeitando estrutura bloqueada quando houver submissões
      const databaseType = shouldLockStructure
        ? lockedStructure.databaseType
        : mapFrontendTypeToDatabase(activityType);
      
      logger.debug('[Activity Create] Mapeando tipo:', { 
        frontendType: activityType, 
        databaseType,
        isValid: isValidDatabaseType(databaseType)
      });

      let activityData = {
        title,
        description,
        type: databaseType,  // CORREÇÃO: usa tipo mapeado
        max_score: shouldLockStructure ? lockedStructure.maxScore : maxScore,
        status: 'published',
        is_published: true,
        content: {
          subject,
          tags,
          difficulty,
          estimated_time: estimatedTime,
          questions: shouldLockStructure ? lockedStructure.questions : questions,
          attachments,
          advanced_settings: shouldLockStructure ? lockedStructure.advancedSettings : advancedSettings
        },
        created_by: user.id,
        updated_at: new Date().toISOString()
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('activities')
          .update(activityData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('activities')
          .insert(activityData)
          .select()
          .single();

        if (error) throw error;

        // mover arquivos do draft -> activities usando novo id
        try {
          const moved = await publishActivityFiles(data.id);
          if (moved && moved.length > 0) {
            const newAttachments = moved.map(m => ({
              name: m.name,
              url: m.url,
              path: m.newPath,
              size: m.size,
              type: m.type,
            }));
            activityData = {
              ...activityData,
              content: {
                ...activityData.content,
                attachments: newAttachments,
              }
            };
            await supabase.from('activities').update(activityData).eq('id', data.id);
            setAttachments(newAttachments);
          }
        } catch (moveErr) {
          logger.warn('Falha ao mover anexos de rascunho ao publicar:', moveErr)
        }
      }

      toast({
        title: 'Atividade publicada!',
        description: 'Agora você pode postar em suas turmas.'
      });

      navigate('/dashboard/activities');
    } catch (error) {
      logger.error('Erro ao publicar:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível publicar a atividade.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando atividade..." />
      </div>
    );
  }

  // Função para adicionar questão objetiva (fechada) a partir de OpenQuestions
  const addClosedQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      type: 'closed',
      text: '',
      points: 1,
      alternatives: [
        { id: Date.now() + 1, letter: 'A', text: '', isCorrect: false },
        { id: Date.now() + 2, letter: 'B', text: '', isCorrect: false },
        { id: Date.now() + 3, letter: 'C', text: '', isCorrect: false },
        { id: Date.now() + 4, letter: 'D', text: '', isCorrect: false },
        { id: Date.now() + 5, letter: 'E', text: '', isCorrect: false }
      ],
      explanation: ''
    };
    setQuestions([...questions, newQuestion]);
  };

  // Função para adicionar questão dissertativa (aberta) a partir de ClosedQuestions
  const addOpenQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      type: 'open',
      text: '',
      points: 1,
      maxLines: null,
      maxCharacters: null,
      rubric: [],
      expectedAnswer: ''
    };
    setQuestions([...questions, newQuestion]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/activities')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {isEditMode ? `Editar: ${title || 'Atividade'}` : 'Criar Nova Atividade'}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={activityType ? 'default' : 'secondary'}>
                  {activityType ? activityType : 'Tipo não definido'}
                </Badge>
                <Badge variant="outline">
                  {isEditMode ? 'Editando' : 'Nova'}
                </Badge>
                {hasSubmissions && (
                  <Badge variant="outline" className="border-orange-500 text-orange-600">
                    Estrutura bloqueada (há submissões)
                  </Badge>
                )}
                {lastSaved && (
                  <span className="text-sm text-gray-500">
                    Salvo {Math.floor((new Date() - lastSaved) / 1000)}s atrás
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={!activityType}
            >
              <Eye className="w-5 h-5 mr-2" />
              Prévia
            </Button>
            {isEditMode && hasSubmissions && (
              <Button
                variant="outline"
                onClick={handleCreateNewVersion}
                disabled={saving}
              >
                <Plus className="w-5 h-5 mr-2" />
                Criar nova versão
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving || !activityType || !title || title.trim().length < 3}
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={saving || !activityType}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckSquare className="w-5 h-5 mr-2" />
              {isEditMode ? 'Publicar Alterações' : 'Publicar Atividade'}
            </Button>
          </div>
        </div>
      </div>

      {isEditMode && hasSubmissions && (
        <div className="mb-6 p-4 rounded-lg border border-orange-200 bg-orange-50 text-sm text-orange-800 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-semibold">Atividade com entregas</p>
            <p>
              Questões, pontuação máxima e configurações de correção estão bloqueadas para preservar as notas já registradas.
              {' '}Para alterar o gabarito ou a estrutura da atividade, crie uma nova versão.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Navegação Lateral */}
        <div className="col-span-3">
          <Card className="p-4 sticky top-6">
            <nav className="space-y-2">
              <button
                onClick={() => setCurrentSection('type')}
                className={cn(
                  "w-full text-left px-4 py-2 rounded-lg transition-colors",
                  currentSection === 'type'
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "hover:bg-gray-100"
                )}
                disabled={isEditMode}
              >
                <Grid className="w-4 h-4 inline mr-2" />
                Tipo de Atividade
              </button>
              <button
                onClick={() => setCurrentSection('basics')}
                className={cn(
                  "w-full text-left px-4 py-2 rounded-lg transition-colors",
                  currentSection === 'basics'
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "hover:bg-gray-100"
                )}
              >
                <BookOpen className="w-4 h-4 inline mr-2" />
                Informações Básicas
              </button>
              <button
                onClick={() => setCurrentSection('questions')}
                className={cn(
                  "w-full text-left px-4 py-2 rounded-lg transition-colors",
                  currentSection === 'questions'
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "hover:bg-gray-100"
                )}
                disabled={!activityType}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Questões ({questions.length})
              </button>
              <button
                onClick={() => setCurrentSection('advanced')}
                className={cn(
                  "w-full text-left px-4 py-2 rounded-lg transition-colors",
                  currentSection === 'advanced'
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "hover:bg-gray-100"
                )}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                Configurações
              </button>
              <button
                onClick={() => setCurrentSection('validation')}
                className={cn(
                  "w-full text-left px-4 py-2 rounded-lg transition-colors",
                  currentSection === 'validation'
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "hover:bg-gray-100"
                )}
              >
                <CheckSquare className="w-4 h-4 inline mr-2" />
                Validação
                {validationErrors.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {validationErrors.length}
                  </Badge>
                )}
              </button>
            </nav>
          </Card>
        </div>

        {/* Conteúdo Principal */}
        <div className="col-span-9">
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Seção: Tipo de Atividade */}
            {currentSection === 'type' && !isEditMode && (
              <ActivityTypeSelector
                selectedType={activityType}
                onSelectType={(type) => {
                  setActivityType(type);
                  setCurrentSection('basics');
                }}
              />
            )}

            {/* Seção: Informações Básicas */}
            {currentSection === 'basics' && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6">Informações Básicas</h2>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="title">Título da Atividade *</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Avaliação de Álgebra Linear - Unidade 2"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1"
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {title.length}/200 caracteres
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição *</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva o objetivo e instruções gerais da atividade..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1 min-h-[120px]"
                      maxLength={2000}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {description.length}/2000 caracteres
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subject">Disciplina/Matéria *</Label>
                      <Input
                        id="subject"
                        placeholder="Ex: Matemática"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="difficulty">Dificuldade</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Fácil</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="hard">Difícil</SelectItem>
                          <SelectItem value="very_hard">Muito Difícil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="time">Tempo Estimado (minutos)</Label>
                      <Input
                        id="time"
                        type="number"
                        placeholder="45"
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxScore">Pontuação Máxima Total *</Label>
                      <Input
                        id="maxScore"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="100"
                        value={maxScore}
                        onChange={(e) => setMaxScore(parseFloat(e.target.value))}
                        className="mt-1"
                        disabled={hasSubmissions}
                      />
                      {hasSubmissions && (
                        <p className="text-xs text-orange-600 mt-1">
                          Pontuação máxima bloqueada porque esta atividade já possui submissões.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tópicos/Tags</Label>
                    <Input
                      id="tags"
                      placeholder="Pressione Enter para adicionar (Ex: Álgebra, Matrizes)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          e.preventDefault();
                          if (!tags.includes(e.target.value.trim())) {
                            setTags([...tags, e.target.value.trim()]);
                            e.target.value = '';
                          }
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="cursor-pointer hover:bg-red-100"
                          onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                        >
                          #{tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => setCurrentSection('questions')}
                      disabled={!title || !description || !subject}
                    >
                      Próximo: Adicionar Questões
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Seção: Questões */}
            {currentSection === 'questions' && activityType && (
              <>
                {(activityType === 'open' || activityType === 'assignment') && (
                  <OpenQuestions
                    questions={questions}
                    setQuestions={setQuestions}
                    maxScore={maxScore}
                    // Só permite adicionar questão objetiva em atividades mistas
                    onAddClosed={undefined}
                    isLocked={hasSubmissions}
                  />
                )}
                {(activityType === 'closed' || activityType === 'quiz') && (
                  <ClosedQuestions
                    questions={questions}
                    setQuestions={setQuestions}
                    maxScore={maxScore}
                    // Só permite adicionar questão dissertativa em atividades mistas
                    onAddOpen={undefined}
                    isLocked={hasSubmissions}
                  />
                )}
                {(activityType === 'mixed' || activityType === 'project') && (
                  <MixedQuestions
                    questions={questions}
                    setQuestions={setQuestions}
                    maxScore={maxScore}
                    isLocked={hasSubmissions}
                  />
                )}
              </>
            )}

            {/* Seção: Configurações Avançadas */}
            {currentSection === 'advanced' && (
              <AdvancedSettings
                settings={advancedSettings}
                setSettings={setAdvancedSettings}
                activityType={activityType}
                isLocked={hasSubmissions}
              />
            )}

            {/* Seção: Validação */}
            {currentSection === 'validation' && (
              <ValidationChecklist
                errors={validationErrors}
                warnings={validationWarnings}
                onValidate={validateActivity}
                onNavigateToError={(field) => {
                  // Lógica para navegar até o campo com erro
                  if (field.startsWith('question')) {
                    setCurrentSection('questions');
                  } else if (['title', 'description', 'subject'].includes(field)) {
                    setCurrentSection('basics');
                  }
                }}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Modal de Preview */}
      {showPreview && (
        <ActivityPreview
          activity={{
            title,
            description,
            type: activityType,
            subject,
            tags,
            difficulty,
            estimatedTime,
            maxScore,
            questions,
            advancedSettings
          }}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Modal de Confirmação com Avisos */}
      <Dialog open={showWarningModal} onOpenChange={setShowWarningModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              Avisos Detectados
            </DialogTitle>
            <DialogDescription>
              Há {validationWarnings.length} aviso(s) na atividade. Deseja publicar mesmo assim?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              {validationWarnings.map((warning, index) => (
                <div key={index} className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    ⚠️ {warning.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarningModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmPublish}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Publicar Mesmo Assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherActivityCreatePage;
