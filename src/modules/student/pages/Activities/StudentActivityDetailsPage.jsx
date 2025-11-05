import { logger } from '@/shared/utils/logger';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TextWithLineBreaks from '@/shared/components/ui/TextWithLineBreaks';
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

  // Calcular se a atividade está atrasada e se pode responder
  const isLate = useMemo(() => 
    activity?.due_date && new Date(activity.due_date) < new Date(), 
    [activity?.due_date]
  );
  
  const canAnswerLate = useMemo(() => 
    isLate && activity?.accept_late_submissions === true, 
    [isLate, activity?.accept_late_submissions]
  );
  
  const isBlocked = useMemo(() => 
    (isLate && !canAnswerLate) || (activity?.status !== 'published' && activity?.status !== 'active'),
    [isLate, canAnswerLate, activity?.status]
  );

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

      logger.debug('[StudentActivityDetailsPage] 🔍 Carregando atividade:', activityId)
      
      const [activityRes, submissionRes, assignmentsRes, attemptsRes] = await Promise.all([
        supabase
          .from('activities')
          .select(`
            *,
            created_by,
            created_by_user:created_by ( id, full_name )
          `)
          .eq('id', activityId)
          .single(),
        supabase
          .from('submissions')
          .select('*')
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

      console.log('[StudentActivityDetailsPage] ✅ Atividade carregada:', {
        title: act?.title,
        description: act?.description,
        type: act?.type,
        content: act?.content,
        hasQuestions: !!act?.content?.questions
      });

      // Processar questões do campo content.questions
      let questions = [];
      if (act?.content?.questions && Array.isArray(act.content.questions)) {
        questions = act.content.questions.map((q, index) => ({
          id: q.id || `q-${index}`,
          index,
          title: q.text || q.title || `Questão ${index + 1}`,
          description: q.description || q.hint,
          required: true,
          type: q.type === 'closed' ? 'select' : 'text',
          options: q.alternatives?.map(alt => alt.text) || [],
          points: q.points || 1,
          answerKey: q.alternatives?.find(alt => alt.isCorrect)?.text
        }));
      } else if (act?.schema) {
        // Fallback para schema antigo
        questions = buildQuestions(act.schema, act?.meta || {});
      }

      logger.debug('[StudentActivityDetailsPage] 📝 Questões processadas:', questions)

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
        
        // Se tem questões objetivas, o content é JSON com as respostas
        if (questions.length > 0) {
          try {
            const answers = typeof sub.content === 'string' ? JSON.parse(sub.content) : sub.content;
            setObjectiveAnswers(answers || {});
            setDraftContent(EMPTY_RICH_TEXT);
          } catch (e) {
            setObjectiveAnswers({});
            setDraftContent(EMPTY_RICH_TEXT);
          }
        } else {
          // Se é dissertativa, content é o texto rico
          setDraftContent(ensureRichTextContent(sub.content));
          setObjectiveAnswers({});
        }
      } else {
        setSubmission(null);
        setDraftContent(EMPTY_RICH_TEXT);
        setObjectiveAnswers({});
      }

    } catch (error) {
      logger.error('Erro:', error)
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
    if (submissionLocked || isBlocked) return false;
    if (schemaQuestions.length > 0) {
      return schemaQuestions.every((q) => {
        const value = objectiveAnswers[q.id];
        if (Array.isArray(value)) return value.length > 0 || !q.required;
        return value !== undefined && value !== null && value !== '';
      });
    }
    return !isRichTextEmpty(draftContent);
  }, [isBlocked, schemaQuestions, objectiveAnswers, submissionLocked, draftContent]);

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
    if (submissionLocked || isBlocked) return;

    try {
      setSavingDraft(true);

      const payload = {
        content: schemaQuestions.length > 0 ? JSON.stringify(objectiveAnswers) : draftContent,
        status: 'draft',
        updated_at: new Date().toISOString()
      };

      if (submission) {
        const { error } = await supabase
          .from('submissions')
          .update(payload)
          .eq('id', submission.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            ...payload,
            activity_id: activityId,
            student_id: user.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        if (error) throw error;
        setSubmission(data);
      }

      toast({ title: 'Rascunho salvo', description: 'Continue quando se sentir pronto.' });
      loadActivity();
    } catch (error) {
      toast({ 
        title: 'Erro ao salvar rascunho', 
        description: error?.message || 'Tente novamente em instantes.', 
        variant: 'destructive' 
      });
    } finally {
      setSavingDraft(false);
    }
  };

  // Função para calcular nota automática de questões objetivas
  const calculateAutomaticGrade = () => {
    // Verifica se todas as questões têm gabarito (answerKey)
    const allHaveAnswerKey = schemaQuestions.every(q => q.answerKey);
    if (!allHaveAnswerKey || schemaQuestions.length === 0) return null;

    let correctAnswers = 0;
    const totalQuestions = schemaQuestions.length;

    schemaQuestions.forEach(question => {
      const studentAnswer = objectiveAnswers[question.id];
      const correctAnswer = question.answerKey;

      // Para questões de múltipla escolha
      if (question.type === 'select' || question.type === 'multiple_choice') {
        if (studentAnswer === correctAnswer) {
          correctAnswers++;
        }
      }
      // Para questões checkbox (múltiplas respostas)
      else if (question.type === 'checkbox') {
        const studentAnswersArray = Array.isArray(studentAnswer) ? studentAnswer : [];
        const correctAnswersArray = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
        
        // Verifica se as respostas são iguais (mesmo tamanho e mesmos elementos)
        const isCorrect = studentAnswersArray.length === correctAnswersArray.length &&
                         studentAnswersArray.every(ans => correctAnswersArray.includes(ans));
        
        if (isCorrect) {
          correctAnswers++;
        }
      }
    });

    // Calcula a nota proporcional ao max_score
    const maxScore = activity?.max_score || 100;
    const grade = (correctAnswers / totalQuestions) * maxScore;
    return Math.round(grade * 100) / 100; // Arredonda para 2 casas decimais
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

      // Calcular nota automática se possível
      const automaticGrade = schemaQuestions.length > 0 ? calculateAutomaticGrade() : null;

      const payload = {
        content: schemaQuestions.length > 0 ? JSON.stringify(objectiveAnswers) : draftContent,
        submitted_at: new Date().toISOString(),
        status: automaticGrade !== null ? 'graded' : 'submitted',
        ...(automaticGrade !== null && {
          grade: automaticGrade,
          graded_at: new Date().toISOString(),
          feedback: `Correção automática: ${Math.round((automaticGrade / (activity?.max_score || 100)) * 100)}% de acerto.`
        })
      };

      if (submission) {
        const { error } = await supabase
          .from('submissions')
          .update(payload)
          .eq('id', submission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('submissions')
          .insert({
            ...payload,
            activity_id: activityId,
            student_id: user.id
          });
        if (error) throw error;
      }

      toast({ title: 'Atividade enviada com sucesso!' });
      loadActivity();
      setActiveTab('feedback');
    } catch (error) {
      toast({ 
        title: 'Erro ao enviar atividade', 
        description: error?.message || 'Verifique sua conexão e tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionField = (question) => {
    const value = objectiveAnswers[question.id];
    const disabled = submissionLocked || isBlocked;

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
        <Card key={question.id} className="group p-6 space-y-4 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-blue-950/20 dark:to-purple-950/10 border-2 border-slate-200/60 dark:border-slate-700/40 hover:border-blue-400/60 dark:hover:border-blue-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
          {questionHeader}
          {question.description && (
            <div className="w-full max-w-full break-words">
              <TextWithLineBreaks 
                text={question.description} 
                className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap break-words w-full"
              />
            </div>
          )}
          
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <label
                key={`${question.id}-${option}`}
                className={`group/option flex items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-all duration-200 cursor-pointer hover:shadow-md ${
                  value === option 
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-blue-500 dark:border-blue-400' 
                    : 'border-slate-200/60 dark:border-slate-700/40 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30 hover:border-blue-400/60 dark:hover:border-blue-500/40'
                }`}
                onClick={() => !disabled && handleObjectiveChange(question.id, option)}
              >
                {/* LETRA À ESQUERDA */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all flex-shrink-0 ${
                  value === option
                    ? 'bg-blue-500 dark:bg-blue-400 text-white scale-100'
                    : 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 text-blue-600 dark:text-blue-300 scale-95 group-hover/option:scale-100'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  value === option 
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-500 dark:bg-blue-400' 
                    : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {value === option && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                
                <span className={`flex-1 font-medium transition-colors ${
                  value === option 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-slate-700 dark:text-slate-300 group-hover/option:text-blue-700 dark:group-hover/option:text-blue-300'
                }`}>
                  {option}
                </span>
              </label>
            ))}
          </div>
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
        <Card key={question.id} className="group p-6 space-y-4 bg-gradient-to-br from-white via-purple-50/30 to-pink-50/20 dark:from-slate-900 dark:via-purple-950/20 dark:to-pink-950/10 border-2 border-slate-200/60 dark:border-slate-700/40 hover:border-purple-400/60 dark:hover:border-purple-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
          {questionHeader}
          {question.description && (
            <div className="w-full max-w-full break-words">
              <TextWithLineBreaks 
                text={question.description} 
                className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap break-words w-full"
              />
            </div>
          )}
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <label
                key={`${question.id}-${option}`}
                className="group/option flex items-center gap-4 rounded-xl border-2 border-slate-200/60 dark:border-slate-700/40 px-4 py-3.5 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 dark:hover:from-purple-950/30 dark:hover:to-pink-950/30 hover:border-purple-400/60 dark:hover:border-purple-500/40 transition-all duration-200 cursor-pointer hover:shadow-md"
              >
                {/* LETRA À ESQUERDA */}
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 flex items-center justify-center text-sm font-bold text-purple-600 dark:text-purple-300 flex-shrink-0 ${
                  values.includes(option) ? 'scale-100 opacity-100' : 'scale-95 opacity-80 group-hover/option:scale-100 group-hover/option:opacity-100'
                } transition-all`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                
                <Checkbox
                  checked={values.includes(option)}
                  onCheckedChange={() => toggle(option)}
                  disabled={disabled}
                  className="border-2 flex-shrink-0"
                />
                
                <span className="flex-1 font-medium text-slate-700 dark:text-slate-300 group-hover/option:text-purple-700 dark:group-hover/option:text-purple-300 transition-colors">{option}</span>
              </label>
            ))}
          </div>
        </Card>
      );
    }

    if (question.type === 'number') {
      return (
        <Card key={question.id} className="group p-6 space-y-4 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 dark:from-slate-900 dark:via-emerald-950/20 dark:to-teal-950/10 border-2 border-slate-200/60 dark:border-slate-700/40 hover:border-emerald-400/60 dark:hover:border-emerald-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10">
          {questionHeader}
          {question.description && (
            <div className="w-full max-w-full break-words">
              <TextWithLineBreaks 
                text={question.description} 
                className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap break-words w-full"
              />
            </div>
          )}
          <Input
            type="number"
            value={value ?? ''}
            onChange={(event) => handleObjectiveChange(question.id, event.target.value)}
            disabled={disabled}
            placeholder="🔢 Digite um valor numérico"
            className="h-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
          />
        </Card>
      );
    }

    if (question.type === 'date') {
      return (
        <Card key={question.id} className="group p-6 space-y-4 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/20 dark:from-slate-900 dark:via-amber-950/20 dark:to-orange-950/10 border-2 border-slate-200/60 dark:border-slate-700/40 hover:border-amber-400/60 dark:hover:border-amber-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10">
          {questionHeader}
          {question.description && (
            <div className="w-full max-w-full break-words">
              <TextWithLineBreaks 
                text={question.description} 
                className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap break-words w-full"
              />
            </div>
          )}
          <Input
            type="date"
            value={value ?? ''}
            onChange={(event) => handleObjectiveChange(question.id, event.target.value)}
            disabled={disabled}
            className="h-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 focus:border-amber-500 dark:focus:border-amber-400 transition-colors"
          />
        </Card>
      );
    }

    return (
      <Card key={question.id} className="group p-6 space-y-4 bg-gradient-to-br from-white via-rose-50/30 to-pink-50/20 dark:from-slate-900 dark:via-rose-950/20 dark:to-pink-950/10 border-2 border-slate-200/60 dark:border-slate-700/40 hover:border-rose-400/60 dark:hover:border-rose-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-rose-500/10">
        {questionHeader}
        {question.description && <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{question.description}</p>}
        <Textarea
          value={value ?? ''}
          onChange={(event) => handleObjectiveChange(question.id, event.target.value)}
          disabled={disabled}
          placeholder="✍️ Digite sua resposta detalhada aqui..."
          className="min-h-[120px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500 focus:border-rose-500 dark:focus:border-rose-400 transition-colors resize-none"
          rows={5}
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
            <TextWithLineBreaks 
              text={`${questionStats.answered} de ${questionStats.total} perguntas respondidas`}
              className="text-sm text-slate-500"
            />
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
          <TextWithLineBreaks 
            text="Sem eventos registrados ainda." 
            className="text-sm text-slate-500"
          />
        )}
        {timelineEvents.map((event) => (
          <div key={event.key} className="flex gap-3">
            <div className={`w-2 h-2 mt-2 rounded-full ${event.accent || 'bg-slate-300'}`} />
            <div>
              <div className="w-full max-w-full break-words">
                <TextWithLineBreaks 
                  text={event.label}
                  className="text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words w-full"
                />
              </div>
              <TextWithLineBreaks 
                text={event.timestamp ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: ptBR }) : '—'}
                className="text-xs text-slate-500"
              />
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
              <TextWithLineBreaks 
                text="Assim que o professor corrigir, seu feedback aparecerá aqui."
                className="text-sm text-slate-500"
              />
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
            <div className="w-full max-w-full break-words">
              <TextWithLineBreaks 
                text={submission?.feedback || 'Sem comentários adicionais.'} 
                className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words w-full"
                preserveWhitespace={true}
              />
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
            <TextWithLineBreaks 
              text={`${attemptsUsed} de ${maxAttempts} tentativas utilizadas.`}
              className="text-sm text-slate-500"
            />
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
                  <TextWithLineBreaks 
                    text={`Tentativa ${attempts.indexOf(attempt) + 1}`}
                    className="text-sm font-semibold text-slate-900 dark:text-white"
                  />
                  <TextWithLineBreaks 
                    text={`${attempt.status === 'submitted' ? 'Enviada' : attempt.status === 'graded' ? 'Corrigida' : 'Rascunho'} • ${attempt.created_at ? formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true, locale: ptBR }) : '—'}`}
                    className="text-xs text-slate-500"
                  />
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
            <TextWithLineBreaks 
              text="Faça perguntas sobre as instruções ou peça ajuda com conceitos. As respostas usam o contexto desta atividade."
              className="text-sm text-slate-500"
            />
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
            <TextWithLineBreaks 
              text={`Por ${activity?.created_by_user?.name || 'Professor'}`}
              className="text-sm text-slate-500"
            />
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
        <div className="prose prose-sm dark:prose-invert max-w-none w-full">
          <div className="w-full max-w-full break-words">
            <TextWithLineBreaks 
              text={activity?.description || 'Sem descrição disponível.'} 
              className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words w-full"
              preserveWhitespace={true}
            />
          </div>
          {activity?.instructions && (
            <Card className="mt-4 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-sky-500 mt-1" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Instruções adicionais</h4>
                  <div className="w-full max-w-full break-words">
                    <TextWithLineBreaks 
                      text={activity.instructions} 
                      className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words w-full"
                      preserveWhitespace={true}
                    />
                  </div>
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

  if (!activity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-slate-600">Atividade não encontrada</p>
          <Button onClick={() => navigate('/students/activities')} className="mt-4">
            Voltar para Atividades
          </Button>
        </div>
      </div>
    );
  }

  const hasGrade = submission?.grade !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header Moderno */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 overflow-hidden shadow-2xl">
        {/* Pattern de fundo */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:30px_30px]" />
        </div>
        
        {/* Shapes decorativos */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        
        <div className="relative z-10 w-full px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 text-white hover:bg-white/20 border border-white/30 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <Badge className={statusBadge.className}>
                  {statusBadge.label}
                </Badge>
                {isLate && (
                  <Badge className="bg-red-500/90 text-white border-0">
                    <Clock className="w-3 h-3 mr-1" />
                    Atrasada
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">{activity?.title}</h1>
              <TextWithLineBreaks 
                text={activity?.description || 'Sem descrição'} 
                className="text-white/90 text-lg"
                preserveWhitespace={true}
              />
              <div className="flex items-center gap-4 mt-4 text-white/80">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">
                    {activity?.due_date 
                      ? format(new Date(activity.due_date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })
                      : 'Sem prazo'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold">{activity?.max_score} pontos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-xl overflow-hidden">
                <TabsList className="w-full grid grid-cols-3 p-1.5 bg-slate-50 dark:bg-slate-800/50 gap-1">
                  <TabsTrigger 
                    value="instructions"
                    className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-lg"
                  >
                    <BookOpen className="w-4 h-4" />
                    Instruções
                  </TabsTrigger>
                  <TabsTrigger 
                    value="answer"
                    className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-lg"
                  >
                    <FileText className="w-4 h-4" />
                    Responder
                  </TabsTrigger>
                  <TabsTrigger 
                    value="feedback"
                    className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all rounded-lg"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Feedback
                  </TabsTrigger>
                </TabsList>
              </Card>

              <TabsContent value="instructions" className="space-y-4 mt-4">
                {renderInstructionsTab()}
              </TabsContent>

              <TabsContent value="answer" className="space-y-4 mt-4">
                {submissionLocked ? (
                  <Card className="p-8 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className="w-6 h-6 text-amber-600 mt-1" />
                      <div>
                        <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          Atividade já enviada
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-200">
                          Você já submeteu esta atividade. {!allowMultipleAttempts && 'Não é permitido reenviar.'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ) : isBlocked ? (
                  <Card className="p-8 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className="w-6 h-6 text-slate-500 mt-1" />
                      <div>
                        <h4 className="font-semibold mb-2">
                          {isLate ? 'Prazo encerrado' : 'Atividade encerrada'}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {isLate 
                            ? 'O prazo desta atividade expirou e o professor não permite respostas atrasadas.' 
                            : 'Esta atividade não está mais disponível para submissões.'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ) : canAnswerLate ? (
                  <>
                    <Card className="p-6 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
                      <div className="flex items-start gap-4">
                        <Clock className="w-6 h-6 text-orange-600 mt-1" />
                        <div>
                          <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                            Atenção: Resposta fora do prazo
                          </h4>
                          <p className="text-sm text-orange-700 dark:text-orange-200">
                            O prazo desta atividade já expirou, mas o professor permite respostas atrasadas. 
                            Sua submissão pode receber penalidade na pontuação.
                          </p>
                        </div>
                      </div>
                    </Card>
                    {isObjectiveActivity ? renderObjectiveTab() : renderSubjectiveTab()}
                  </>
                ) : isObjectiveActivity ? (
                  renderObjectiveTab()
                ) : (
                  renderSubjectiveTab()
                )}
              </TabsContent>

              <TabsContent value="feedback" className="space-y-4 mt-4">
                {renderFeedback()}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Details Card */}
            <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-xl">
              <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                Detalhes
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Prazo</p>
                    <p className="font-medium text-sm">
                      {activity?.due_date 
                        ? format(new Date(activity.due_date), "dd/MM 'às' HH:mm", { locale: ptBR })
                        : 'Sem prazo'}
                    </p>
                  </div>
                  {isLate && (
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      Expirado
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                    <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Pontuação</p>
                    <p className="font-semibold text-lg text-emerald-600 dark:text-emerald-400">{activity?.max_score || 100} pts</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Tipo</p>
                    <p className="font-medium text-sm">
                      {activity?.type === 'closed' ? 'Objetiva' : 
                       activity?.type === 'open' ? 'Dissertativa' : 
                       activity?.type || 'Mista'}
                    </p>
                  </div>
                </div>

                {submission && (
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="p-2 bg-sky-50 dark:bg-sky-950/30 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">Status</p>
                      <p className="font-medium text-sm">
                        {hasGrade ? '✅ Corrigida' : 
                         submission.submitted_at ? '📤 Enviada' : '📝 Rascunho'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {renderAttemptsInfo()}
            {renderTimeline()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentActivityDetailsPage;
