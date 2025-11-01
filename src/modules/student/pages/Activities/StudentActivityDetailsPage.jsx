import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Bot,
  Calendar as CalendarIcon,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  PieChart,
  Save,
  Send
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import { Progress } from '@/shared/components/ui/progress';
import { useToast } from '@/shared/components/ui/use-toast';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader } from '@/shared/design';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import ChatbotWidget from '@/shared/components/ui/ChatbotWidget';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LexicalEditor from '@/lexical/LexicalEditor';

const EMPTY_RICH_TEXT = JSON.stringify({
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1
      }
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1
  }
});

const ACTIVITY_TYPES = {
  subjective: ['essay', 'open_answer', 'dissertative', 'subjective', 'text', 'assignment'],
  objective: ['quiz', 'multiple_choice', 'objective', 'true_false', 'matching']
};

const buildQuestions = (schema, meta) => {
  if (!schema || typeof schema !== 'object') return [];

  const properties = schema.properties || {};
  const order = schema.order || Object.keys(properties);
  const answerKey = meta?.answer_key || {};
  const pointsMap = meta?.points || {};

  return order
    .map((key, index) => {
      const question = properties[key];
      if (!question) return null;

      let type = question.type || question.format || 'text';
      let options = question.options || question.enum || [];

      if (question.type === 'array' && question.items?.enum) {
        type = 'checkbox';
        options = question.items.enum;
      }

      if (question.format === 'date') {
        type = 'date';
      }

      return {
        id: key,
        index,
        title: question.title || `Questão ${index + 1}`,
        description: question.description,
        required: question.required ?? true,
        type,
        options,
        points: typeof pointsMap[index] === 'number' ? pointsMap[index] : question.points || 1,
        answerKey: answerKey[index]
      };
    })
    .filter(Boolean);
};

const normaliseObjectiveAnswers = (rawAnswers, questions) => {
  if (!rawAnswers) return {};

  const map = {};

  if (Array.isArray(rawAnswers)) {
    rawAnswers.forEach((value, idx) => {
      const question = questions[idx];
      if (!question) return;
      map[question.id] = typeof value === 'object' && value !== null ? value.answer_text ?? value.value ?? value : value;
    });
    return map;
  }

  if (typeof rawAnswers === 'object') {
    Object.entries(rawAnswers).forEach(([key, value]) => {
      map[key] = typeof value === 'object' && value !== null ? value.answer_text ?? value.value ?? value : value;
    });
    return map;
  }

  return {};
};

const createRichTextFromPlainText = (text = '') =>
  JSON.stringify({
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
              type: 'text',
              version: 1
            }
          ],
          direction: null,
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1
        }
      ],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1
    }
  });

const ensureRichTextContent = (value) => {
  if (!value) return EMPTY_RICH_TEXT;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed?.root?.children) {
        return value;
      }
    } catch (error) {
      return createRichTextFromPlainText(value);
    }
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return EMPTY_RICH_TEXT;
    }
  }

  return EMPTY_RICH_TEXT;
};

const isRichTextEmpty = (value) => {
  if (!value) return true;

  try {
    const parsed = JSON.parse(value);
    const children = parsed?.root?.children || [];

    return children.every((node) => {
      if (node.type === 'paragraph' && Array.isArray(node.children)) {
        return node.children.every((child) => !child.text);
      }
      return false;
    });
  } catch (error) {
    return value.trim().length === 0;
  }
};

const StudentActivityDetailsPage = () => {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activity, setActivity] = useState(null);
  const [classes, setClasses] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [draftContent, setDraftContent] = useState(EMPTY_RICH_TEXT);
  const [objectiveAnswers, setObjectiveAnswers] = useState({});
  const [attempts, setAttempts] = useState([]);
  const [activeTab, setActiveTab] = useState('instructions');
  const [schemaQuestions, setSchemaQuestions] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  useEffect(() => {
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, user?.id]);

  useEffect(() => {
    if (!activityId || !user?.id) return;
    setActiveTab('instructions');
  }, [activityId, user?.id]);

  const loadActivity = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [activityRes, submissionRes, assignmentsRes, attemptsRes] = await Promise.all([
        supabase
          .from('activities')
          .select(`
            *,
            created_by_user:profiles!activities_created_by_fkey ( id, full_name ),
            schema,
            meta,
            instructions,
            activity_type
          `)
          .eq('id', activityId)
          .single(),
        supabase
          .from('submissions')
          .select(`
            *,
            feedback_history:feedback_history(*),
            feedback:feedbacks (*),
            student:profiles!submissions_user_id_fkey ( id, name, email )
          `)
          .eq('activity_id', activityId)
          .eq('student_id', user.id)
          .maybeSingle(),
        supabase
          .from('activity_class_assignments')
          .select(`
            class_id,
            classes ( id, name, subject, color )
          `)
          .eq('activity_id', activityId),
        supabase
          .from('submissions')
          .select('id, status, grade, submitted_at, created_at, updated_at')
          .eq('activity_id', activityId)
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      const act = activityRes.data;
      const sub = submissionRes.data;
      const assignments = assignmentsRes.data || [];
      const attemptsData = attemptsRes.data || [];

      const questions = buildQuestions(act?.schema, act?.meta || {});

      setActivity(act);
      setSchemaQuestions(questions);
      setClasses(assignments.map(({ classes }) => classes).filter(Boolean));
      setAttempts(attemptsData);
      setSelectedAttempt((prev) => {
        if (!attemptsData.length) return null;
        if (prev && attemptsData.some((attempt) => attempt.id === prev)) {
          return prev;
        }
        return attemptsData[0].id;
      });

      if (sub) {
        setSubmission(sub);
        setDraftContent(ensureRichTextContent(sub.content));
        setObjectiveAnswers(normaliseObjectiveAnswers(sub.data, questions));
      } else {
        setSubmission(null);
        setDraftContent(EMPTY_RICH_TEXT);
        setObjectiveAnswers({});
      }

    } catch (error) {
      console.error('Erro:', error);
      toast({ title: 'Erro ao carregar atividade', description: 'Tente novamente em instantes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRichTextChange = useCallback((value) => {
    setDraftContent(value || EMPTY_RICH_TEXT);
  }, []);

  const handleObjectiveChange = useCallback((questionId, value) => {
    setObjectiveAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const isObjectiveActivity = useMemo(() => {
    const type = (activity?.activity_type || activity?.type || '').toLowerCase();
    if (schemaQuestions.length > 0) return true;
    if (!type) return false;
    return ACTIVITY_TYPES.objective.some((t) => type.includes(t));
  }, [activity?.activity_type, activity?.type, schemaQuestions]);

  const isSubjectiveActivity = useMemo(() => {
    const type = (activity?.activity_type || activity?.type || '').toLowerCase();
    if (!type) return !isObjectiveActivity;
    return ACTIVITY_TYPES.subjective.some((t) => type.includes(t));
  }, [activity?.activity_type, activity?.type, isObjectiveActivity]);

  const allowMultipleAttempts = activity?.meta?.allow_multiple_attempts ?? false;
  const maxAttempts = activity?.meta?.max_attempts ?? 1;
  const attemptsUsed = attempts.length;

  const questionStats = useMemo(() => {
    const total = schemaQuestions.length;
    const answered = schemaQuestions.filter((q) => {
      const value = objectiveAnswers[q.id];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    }).length;

    return {
      total,
      answered,
      percent: total === 0 ? 0 : Math.round((answered / total) * 100)
    };
  }, [schemaQuestions, objectiveAnswers]);

  const dueDate = activity?.due_date ? new Date(activity.due_date) : null;
  const submissionLocked = submission?.submitted_at && !allowMultipleAttempts;

  const canSubmit = useMemo(() => {
    if (submissionLocked || activity?.status !== 'active') return false;
    if (schemaQuestions.length > 0) {
      return schemaQuestions.every((q) => {
        const value = objectiveAnswers[q.id];
        if (Array.isArray(value)) return value.length > 0 || !q.required;
        return value !== undefined && value !== null && value !== '';
      });
    }
    return !isRichTextEmpty(draftContent);
  }, [activity?.status, schemaQuestions, objectiveAnswers, submissionLocked, draftContent]);

  const statusBadge = useMemo(() => {
    if (!submission) {
      return { label: 'Nova', className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200' };
    }
    if (submission.grade !== null) {
      return { label: 'Corrigida', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' };
    }
    if (submission.submitted_at) {
      return { label: 'Enviada', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200' };
    }
    return { label: 'Rascunho', className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200' };
  }, [submission]);

  const saveDraft = async () => {
    if (submissionLocked || activity?.status !== 'active') return;

    try {
      setSavingDraft(true);

      if (submission) {
        const { error } = await supabase
          .from('submissions')
          .update({
            content: draftContent,
            data: schemaQuestions.length > 0 ? objectiveAnswers : null,
            status: 'draft',
            updated_at: new Date().toISOString()
          })
          .eq('id', submission.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            activity_id: activityId,
            student_id: user.id,
            content: draftContent,
            data: schemaQuestions.length > 0 ? objectiveAnswers : null,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        if (error) throw error;
        setSubmission(data);
      }

      toast({ title: 'Rascunho salvo', description: 'Continue quando se sentir pronto.' });
      loadActivity();
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      toast({ title: 'Não foi possível salvar o rascunho', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast({ title: 'Responda todos os itens obrigatórios', variant: 'destructive' });
      return;
    }

    if (!window.confirm('Deseja enviar suas respostas agora? Após o envio, você não poderá editar este envio.')) {
      return;
    }

    try {
      setSubmitting(true);

      if (submission) {
        const { error } = await supabase
          .from('submissions')
          .update({
            content: draftContent,
            data: schemaQuestions.length > 0 ? objectiveAnswers : null,
            submitted_at: new Date().toISOString(),
            status: 'submitted'
          })
          .eq('id', submission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('submissions')
          .insert({
            activity_id: activityId,
            student_id: user.id,
            content: draftContent,
            data: schemaQuestions.length > 0 ? objectiveAnswers : null,
            submitted_at: new Date().toISOString(),
            status: 'submitted'
          });
        if (error) throw error;
      }

      toast({ title: 'Atividade enviada com sucesso!' });
      loadActivity();
      setActiveTab('feedback');
    } catch (error) {
      console.error('Erro ao enviar atividade:', error);
      toast({ title: 'Erro ao enviar atividade', description: 'Tente novamente em instantes.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionField = (question) => {
    const value = objectiveAnswers[question.id];
    const disabled = submissionLocked || activity?.status !== 'active';

    const questionHeader = (
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-sky-500" />
          {question.title}
        </Label>
        <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
          {question.points} pts
        </Badge>
      </div>
    );

    if (question.type === 'select' || question.type === 'multiple_choice') {
      return (
        <Card key={question.id} className="p-4 space-y-3">
          {questionHeader}
          {question.description && <p className="text-sm text-slate-500">{question.description}</p>}
          <Select
            value={value ?? ''}
            onValueChange={(val) => handleObjectiveChange(question.id, val)}
            disabled={disabled}
          >
            <SelectTrigger className="bg-white dark:bg-slate-900">
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {question.options.map((option) => (
                <SelectItem key={`${question.id}-${option}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      );
    }

    if (question.type === 'checkbox') {
      const values = Array.isArray(value) ? value : [];
      const toggle = (option) => {
        const next = values.includes(option)
          ? values.filter((entry) => entry !== option)
          : [...values, option];
        handleObjectiveChange(question.id, next);
      };

      return (
        <Card key={question.id} className="p-4 space-y-3">
          {questionHeader}
          {question.description && <p className="text-sm text-slate-500">{question.description}</p>}
          <div className="space-y-2">
            {question.options.map((option) => (
              <label
                key={`${question.id}-${option}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/40"
              >
                <Checkbox
                  checked={values.includes(option)}
                  onCheckedChange={() => toggle(option)}
                  disabled={disabled}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </Card>
      );
    }

    if (question.type === 'number') {
      return (
        <Card key={question.id} className="p-4 space-y-3">
          {questionHeader}
          <Input
            type="number"
            value={value ?? ''}
            onChange={(event) => handleObjectiveChange(question.id, event.target.value)}
            disabled={disabled}
            placeholder="Digite um valor"
          />
        </Card>
      );
    }

    if (question.type === 'date') {
      return (
        <Card key={question.id} className="p-4 space-y-3">
          {questionHeader}
          <Input
            type="date"
            value={value ?? ''}
            onChange={(event) => handleObjectiveChange(question.id, event.target.value)}
            disabled={disabled}
          />
        </Card>
      );
    }

    return (
      <Card key={question.id} className="p-4 space-y-3">
        {questionHeader}
        <Textarea
          value={value ?? ''}
          onChange={(event) => handleObjectiveChange(question.id, event.target.value)}
          disabled={disabled}
          placeholder="Digite sua resposta"
        />
      </Card>
    );
  };

  const timelineEvents = useMemo(() => {
    if (!activity) return [];

    const events = [];

    if (activity.created_at) {
      events.push({ key: 'created', label: 'Atividade criada', timestamp: activity.created_at, accent: 'bg-slate-400' });
    }

    if (activity.released_at) {
      events.push({ key: 'released', label: 'Disponibilizada aos alunos', timestamp: activity.released_at, accent: 'bg-blue-400' });
    }

    if (activity.due_date) {
      events.push({ key: 'due', label: 'Prazo de entrega', timestamp: activity.due_date, accent: 'bg-amber-500' });
    }

    if (submission?.created_at) {
      events.push({ key: 'draft', label: submission.status === 'draft' ? 'Rascunho salvo' : 'Envio iniciado', timestamp: submission.created_at, accent: 'bg-sky-400' });
    }

    if (submission?.submitted_at) {
      events.push({ key: 'submitted', label: 'Envio concluído', timestamp: submission.submitted_at, accent: 'bg-sky-600' });
    }

    if (submission?.graded_at) {
      events.push({ key: 'graded', label: 'Correção disponível', timestamp: submission.graded_at, accent: 'bg-emerald-500' });
    }

    if (Array.isArray(submission?.feedback_history)) {
      submission.feedback_history.forEach((entry) => {
        events.push({
          key: `feedback-${entry.id}`,
          label: 'Feedback atualizado',
          timestamp: entry.created_at,
          accent: 'bg-blue-500'
        });
      });
    }

    return events
      .filter((event) => event.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [activity, submission]);

  const renderObjectiveSummary = () => {
    if (schemaQuestions.length === 0) return null;

    return (
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <PieChart className="w-5 h-5 text-sky-500" />
              Progresso
            </h3>
            <p className="text-sm text-slate-500">
              {questionStats.answered} de {questionStats.total} perguntas respondidas
            </p>
          </div>
          <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
            {questionStats.percent}%
          </Badge>
        </div>
        <Progress value={questionStats.percent} />
      </Card>
    );
  };

  const renderTimeline = () => (
    <Card className="bg-white dark:bg-slate-900">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-sky-500" />
        Linha do Tempo
      </h3>
      <div className="space-y-4">
        {timelineEvents.length === 0 && (
          <p className="text-sm text-slate-500">Sem eventos registrados ainda.</p>
        )}
        {timelineEvents.map((event) => (
          <div key={event.key} className="flex gap-3">
            <div className={`w-2 h-2 mt-2 rounded-full ${event.accent || 'bg-slate-300'}`} />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{event.label}</p>
              <p className="text-xs text-slate-500">
                {event.timestamp
                  ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: ptBR })
                  : '—'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderFeedback = () => {
    // Verifica se tem nota OU feedback (texto direto do campo feedback)
    const hasFeedback = submission?.grade !== null || submission?.feedback;
    
    if (!hasFeedback) {
      return (
        <Card className="bg-white dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-slate-400 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Aguardando correção</h4>
              <p className="text-sm text-slate-500">
                Assim que o professor corrigir, seu feedback aparecerá aqui.
              </p>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              Nota {submission?.grade ?? '—'} / {activity?.max_score ?? 100}
            </Badge>
            {submission?.graded_at && (
              <span className="text-xs text-slate-500">
                Corrigido {formatDistanceToNow(new Date(submission.graded_at), { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Feedback do professor
            </h4>
            <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {/* Feedback é salvo como TEXT direto no campo submission.feedback */}
              {submission?.feedback || 'Sem comentários adicionais.'}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderAttemptsInfo = () => {
    if (!allowMultipleAttempts) return null;

    return (
      <Card className="bg-white dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">Tentativas</h3>
            <p className="text-sm text-slate-500">
              {attemptsUsed} de {maxAttempts} tentativas utilizadas.
            </p>
          </div>
          <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {maxAttempts - attemptsUsed} restantes
          </Badge>
        </div>
        <div className="mt-4 space-y-3">
          {attempts.map((attempt) => (
            <div
              key={attempt.id}
              className={`p-3 rounded-lg border ${selectedAttempt === attempt.id ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/40' : 'border-slate-200 dark:border-slate-800'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Tentativa {attempts.indexOf(attempt) + 1}
                  </p>
                  <p className="text-xs text-slate-500">
                    {attempt.status === 'submitted' ? 'Enviada' : attempt.status === 'graded' ? 'Corrigida' : 'Rascunho'}
                    {' • '}
                    {attempt.created_at ? formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true, locale: ptBR }) : '—'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setSelectedAttempt(attempt.id)}
                  className="text-xs"
                >
                  Visualizar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const renderChatbot = () => {
    if (!activity) return null;
    const classId = classes?.[0]?.id;

    return (
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-slate-700 text-white">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Assistente da Atividade</h3>
            <p className="text-sm text-slate-500">
              Faça perguntas sobre as instruções ou peça ajuda com conceitos. As respostas usam o contexto desta atividade.
            </p>
          </div>
        </div>
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <ChatbotWidget context={{ classId, activityId }} />
        </div>
      </Card>
    );
  };

  const renderInstructionsTab = () => (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Instruções</h3>
            <p className="text-sm text-slate-500">
              Por {activity?.created_by_user?.name || 'Professor'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
            {activity?.due_date && (
              <span className="text-xs text-slate-500">
                Prazo {formatDistanceToNow(new Date(activity.due_date), { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{activity?.description || 'Sem descrição disponível.'}</p>
          {activity?.instructions && (
            <Card className="mt-4 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-sky-500 mt-1" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Instruções adicionais</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{activity.instructions}</p>
                </div>
              </div>
            </Card>
          )}
          {classes.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Turmas vinculadas</h4>
              <div className="flex flex-wrap gap-2">
                {classes.map((clas) => (
                  <Badge key={clas.id} className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {clas.name} • {clas.subject || 'Sem disciplina'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {renderAttemptsInfo()}
      {renderTimeline()}
      {renderChatbot()}
    </div>
  );

  const renderSubjectiveTab = () => (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">Dissertativa</Badge>
            <p className="text-xs text-slate-500">Compose sua resposta abaixo. O rascunho é salvo manualmente.</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
            <LexicalEditor
              onChange={handleRichTextChange}
              initialConfig={{ editorState: draftContent }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={saveDraft}
              disabled={savingDraft || submitting}
            >
              {savingDraft ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar rascunho
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
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
        </div>
      </Card>
    </div>
  );

  const renderObjectiveTab = () => (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">Objetiva</Badge>
            <p className="text-xs text-slate-500">Responda as perguntas abaixo.</p>
          </div>
          {schemaQuestions.map((question) => renderQuestionField(question))}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={saveDraft}
              disabled={savingDraft || submitting}
            >
              {savingDraft ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar rascunho
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
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
        </div>
      </Card>
      {renderObjectiveSummary()}
    </div>
  );

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
        onClick={() => navigate('/students/activities')}
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
                  className="bg-gradient-to-r from-blue-600 to-cyan-600"
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
              <div className="text-slate-600 dark:text-slate-400 mb-4 whitespace-pre-wrap">
                {/* Feedback é salvo como TEXT direto no campo submission.feedback */}
                {submission?.feedback || 'Sem comentários'}
              </div>
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
