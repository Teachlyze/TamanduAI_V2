import { logger } from '@/shared/utils/logger';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Calendar,
  Filter
} from 'lucide-react';
import { DashboardHeader, StatsCard } from '@/shared/design';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/components/ui/select';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/components/ui/use-toast';
import { exportGradesToExcel, exportGradesToPDF } from '@/services/exportService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const StudentHistoryPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadHistory();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadHistory = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          activity_id,
          grade,
          feedback,
          status,
          submitted_at,
          graded_at,
          activity:activities (
            id,
            title,
            max_score,
            due_date,
            activity_class_assignments (
              class_id,
              class_info:classes ( id, name, subject, color )
            )
          )
        `)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) {
        throw error;
      }

      const normalized = (data || []).map((submission) => {
        const activity = submission.activity || {};
        const assignment = activity.activity_class_assignments?.[0];
        const classInfo = assignment?.class_info;

        return {
          ...submission,
          activity,
          classId: assignment?.class_id || classInfo?.id || null,
          className: classInfo?.name || 'Turma',
          classSubject: classInfo?.subject || 'Disciplina',
          classColor: classInfo?.color || '#3B82F6'
        };
      });

      const uniqueClasses = normalized
        .filter((item) => item.classId)
        .reduce((acc, item) => {
          if (!acc.find((cls) => cls.id === item.classId)) {
            acc.push({
              id: String(item.classId),
              name: item.className,
              subject: item.classSubject,
              color: item.classColor
            });
          }
          return acc;
        }, []);

      setSubmissions(normalized);
      setClasses(uniqueClasses);
    } catch (err) {
      logger.error('Erro ao carregar histórico do aluno:', err)
      toast({
        title: 'Não foi possível carregar seu histórico',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;

    // Filtro por turma
    if (selectedClassId !== 'all') {
      filtered = filtered.filter((item) => String(item.classId) === selectedClassId);
    }

    // Filtro por período
    if (selectedPeriod !== 'all') {
      const now = new Date();
      let startDate, endDate;

      if (selectedPeriod === 'thisYear') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      } else if (selectedPeriod === 'thisMonth') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (selectedPeriod === 'thisSemester') {
        const semester = now.getMonth() < 6 ? 0 : 6;
        startDate = new Date(now.getFullYear(), semester, 1);
        endDate = new Date(now.getFullYear(), semester + 6, 0, 23, 59, 59);
      } else if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59);
      }

      if (startDate && endDate) {
        filtered = filtered.filter((item) => {
          const dateToCheck = item.graded_at || item.submitted_at;
          if (!dateToCheck) return false;
          const itemDate = new Date(dateToCheck);
          return itemDate >= startDate && itemDate <= endDate;
        });
      }
    }

    return filtered;
  }, [selectedClassId, submissions, selectedPeriod, customStartDate, customEndDate]);

  const summaryStats = useMemo(() => {
    if (filteredSubmissions.length === 0) {
      return {
        averageGrade: 0,
        delivered: 0,
        evaluated: 0,
        onTimeRate: 0,
        feedbackCount: 0
      };
    }

    const graded = filteredSubmissions.filter((item) => item.grade !== null && item.activity?.max_score);
    const delivered = filteredSubmissions.length;
    const evaluated = graded.length;
    const totalPercent = graded.reduce((sum, submission) => {
      const maxScore = submission.activity?.max_score || 1;
      return sum + (submission.grade / maxScore) * 100;
    }, 0);
    const averageGrade = graded.length ? Number((totalPercent / graded.length).toFixed(1)) : 0;

    const onTimeCount = filteredSubmissions.reduce((count, submission) => {
      if (!submission.activity?.due_date || !submission.submitted_at) return count;
      return new Date(submission.submitted_at) <= new Date(submission.activity.due_date) ? count + 1 : count;
    }, 0);

    const feedbackCount = filteredSubmissions.filter((submission) => Boolean(submission.feedback)).length;

    return {
      averageGrade,
      delivered,
      evaluated,
      onTimeRate: delivered ? Math.round((onTimeCount / delivered) * 100) : 0,
      feedbackCount
    };
  }, [filteredSubmissions]);

  const classSummaries = useMemo(() => {
    const map = new Map();

    submissions.forEach((submission) => {
      const key = submission.classId ? String(submission.classId) : 'sem-classe';
      const entry = map.get(key) || {
        classId: submission.classId ? String(submission.classId) : null,
        className: submission.className,
        classColor: submission.classColor,
        total: 0,
        gradedCount: 0,
        submissionsCount: 0,
        onTime: 0,
        feedback: 0
      };

      entry.submissionsCount += 1;

      if (submission.feedback) {
        entry.feedback += 1;
      }

      if (submission.activity?.due_date && submission.submitted_at) {
        if (new Date(submission.submitted_at) <= new Date(submission.activity.due_date)) {
          entry.onTime += 1;
        }
      }

      if (submission.grade !== null && submission.activity?.max_score) {
        entry.gradedCount += 1;
        entry.total += (submission.grade / (submission.activity.max_score || 1)) * 100;
      }

      map.set(key, entry);
    });

    return Array.from(map.values()).map((entry) => ({
      ...entry,
      average: entry.gradedCount ? Number((entry.total / entry.gradedCount).toFixed(1)) : 0,
      onTimeRate: entry.submissionsCount ? Math.round((entry.onTime / entry.submissionsCount) * 100) : 0
    }));
  }, [submissions]);

  const timelineData = useMemo(() => {
    return filteredSubmissions
      .filter((submission) => submission.grade !== null && submission.activity?.max_score)
      .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
      .slice(-10)
      .map((submission) => ({
        label: format(new Date(submission.submitted_at), 'dd/MM', { locale: ptBR }),
        value: Number(((submission.grade / (submission.activity?.max_score || 1)) * 100).toFixed(1))
      }));
  }, [filteredSubmissions]);

  const classAverageData = useMemo(() => {
    return classSummaries
      .filter((summary) => summary.classId)
      .map((summary) => ({
        name: summary.className,
        media: summary.average,
        color: summary.classColor
      }))
      .sort((a, b) => b.media - a.media);
  }, [classSummaries]);

  const handleExport = async (type) => {
    if (!filteredSubmissions.length) {
      toast({
        title: 'Nada para exportar',
        description: 'Não há dados disponíveis para o filtro selecionado.',
        variant: 'destructive'
      });
      return;
    }

    const studentName = user?.user_metadata?.name || 'Aluno';
    const className = selectedClassId === 'all'
      ? 'Todas as turmas'
      : classes.find((cls) => cls.id === selectedClassId)?.name || 'Turma';

    const gradesPayload = filteredSubmissions.map((submission) => ({
      activityName: submission.activity?.title || 'Atividade',
      finalGrade: submission.activity?.max_score
        ? Number(((submission.grade ?? 0) / (submission.activity.max_score || 1)) * 100).toFixed(1)
        : submission.grade ?? '-',
      submittedAt: submission.submitted_at,
      status: submission.grade !== null ? 'Avaliada' : 'Pendente',
      feedback: submission.feedback || null
    }));

    try {
      if (type === 'pdf') {
        exportGradesToPDF(studentName, gradesPayload, className);
        toast({ title: 'PDF exportado com sucesso!' });
      } else {
        await exportGradesToExcel(studentName, gradesPayload, className);
        toast({ title: 'Planilha exportada com sucesso!' });
      }
    } catch (err) {
      logger.error('Erro ao exportar histórico:', err)
      toast({
        title: 'Erro ao exportar',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
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
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-sky-50 to-brand-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <DashboardHeader
        title="Histórico Acadêmico"
        subtitle="Acompanhe sua evolução e exporte os dados completos"
        role="student"
      />

      {/* Filtros Avançados */}
      <Card className="p-4 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-900 dark:text-white">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro por Turma */}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Turma</label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="bg-card border border-border">
                <SelectValue placeholder="Todas as turmas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Período */}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Período</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="bg-card border border-border">
                <SelectValue placeholder="Todo o histórico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o histórico</SelectItem>
                <SelectItem value="thisYear">Este ano</SelectItem>
                <SelectItem value="thisSemester">Este semestre</SelectItem>
                <SelectItem value="thisMonth">Este mês</SelectItem>
                <SelectItem value="custom">Período personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Início (se período personalizado) */}
          {selectedPeriod === 'custom' && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Data Início</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Data Fim</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
            </>
          )}
        </div>

        {(selectedClassId !== 'all' || selectedPeriod !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedClassId('all');
              setSelectedPeriod('all');
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            className="mt-4"
          >
            Limpar filtros
          </Button>
        )}
      </Card>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="whitespace-nowrap inline-flex items-center gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => handleExport('pdf')}
          >
            <FileText className="w-4 h-4" />
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            className="whitespace-nowrap inline-flex items-center gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => handleExport('excel')}
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card className="p-8 bg-white dark:bg-slate-900 text-center border border-slate-200 dark:border-slate-800">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-300">
            Você ainda não possui atividades registradas. Assim que entregar suas atividades, elas aparecerão aqui.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Média Geral"
              value={`${summaryStats.averageGrade}%`}
              icon={BarChart3}
              gradient="from-cyan-500 to-blue-700"
              change={`${summaryStats.evaluated} avaliações`}
              delay={0}
            />
            <StatsCard
              title="Atividades Entregues"
              value={summaryStats.delivered.toString()}
              icon={Award}
              gradient="from-cyan-500 to-indigo-700"
              change={`${summaryStats.evaluated} avaliadas`}
              delay={0.1}
            />
            <StatsCard
              title="Entregues no Prazo"
              value={`${summaryStats.onTimeRate}%`}
              icon={Clock}
              gradient="from-emerald-500 to-cyan-600"
              change={summaryStats.onTimeRate >= 80 ? 'Excelente' : 'Pode melhorar'}
              delay={0.2}
            />
            <StatsCard
              title="Feedbacks Recebidos"
              value={summaryStats.feedbackCount.toString()}
              icon={CheckCircle}
              gradient="from-blue-500 to-indigo-600"
              change={summaryStats.feedbackCount ? 'Confira suas observações' : 'Sem feedbacks recentes'}
              delay={0.3}
            />
          </div>

          {classAverageData.length > 0 && (
            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold mb-4">Média por Turma</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={classAverageData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="media" radius={[0, 12, 12, 0]}>
                    {classAverageData.map((entry, index) => (
                      <cell key={`bar-${entry.name}-${index}`} fill={entry.color || '#2563EB'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-card border border-border">
              <h3 className="text-lg font-bold mb-4">Evolução das Notas</h3>
              {timelineData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Faça suas próximas atividades para visualizar sua evolução.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="value" fill="url(#gradeGradient)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.65} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-6 space-y-4 bg-card border border-border">
              <h3 className="text-lg font-bold">Resumo por Turma</h3>
              {classSummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Você ainda não possui atividades vinculadas a turmas.</p>
              ) : (
                classSummaries.map((summary) => (
                  <div key={summary.classId || 'sem-classe'} className="rounded-xl border border-border p-4 bg-background/60">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">{summary.className}</p>
                        <p className="text-2xl font-semibold">{summary.average.toFixed(1)}%</p>
                      </div>
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {summary.gradedCount} avaliações
                      </Badge>
                    </div>
                    <Progress value={summary.onTimeRate} className="h-2 mb-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>No prazo: {summary.onTimeRate}%</span>
                      <span>Feedbacks: {summary.feedback}</span>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>

          <Card className="p-6 bg-card border border-border mt-6">
            <h3 className="text-lg font-bold mb-4">Histórico de Atividades</h3>
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => {
                const deliveredAt = submission.submitted_at
                  ? format(new Date(submission.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : '—';
                const dueDate = submission.activity?.due_date
                  ? format(new Date(submission.activity.due_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : null;
                const deliveredOnTime = dueDate
                  ? submission.submitted_at && new Date(submission.submitted_at) <= new Date(submission.activity.due_date)
                  : null;

                return (
                  <Card key={submission.id} className="p-5 bg-background/80 border border-border">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-lg">{submission.activity?.title || 'Atividade'}</span>
                          {submission.className && (
                            <Badge variant="outline" className="text-xs">
                              {submission.className}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Entregue em {deliveredAt}</p>
                        {dueDate && (
                          <p className="text-xs mt-1">
                            Prazo: <span className={deliveredOnTime ? 'text-green-600' : 'text-red-500'}>{dueDate}</span>
                          </p>
                        )}
                        {submission.feedback && (
                          <div className="mt-3 p-3 rounded-lg bg-card border border-border text-sm">
                            <p className="font-medium mb-1">Feedback do professor</p>
                            <p>{submission.feedback}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        {submission.grade !== null && submission.activity?.max_score ? (
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Nota</p>
                            <p className="text-3xl font-bold">
                              {submission.grade}
                              <span className="text-base text-muted-foreground">/{submission.activity.max_score}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {((submission.grade / submission.activity.max_score) * 100).toFixed(0)}%
                            </p>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="whitespace-nowrap">
                            Em avaliação
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentHistoryPage;
