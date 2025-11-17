import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';
import { GradeCard, EmptyState } from '@/modules/student/components/redesigned';
import { History, Filter, Search, Download } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const StudentHistoryPageRedesigned = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    avgGrade: 0,
    highestGrade: 0
  });

  useEffect(() => {
    if (user?.id) {
      loadHistory();
      loadClasses();
    }
  }, [user]);

  useEffect(() => {
    filterSubmissions();
  }, [submissions, searchQuery, selectedClass, selectedStatus, selectedPeriod]);

  const loadClasses = async () => {
    try {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      const { data: classList } = await supabase
        .from('classes')
        .select('id, name, subject')
        .in('id', classIds);

      setClasses(classList || []);
    } catch (error) {
      logger.error('Erro ao carregar turmas:', error);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);

      // Buscar todas as submissões do aluno
      const { data: allSubmissions } = await supabase
        .from('submissions')
        .select('id, activity_id, status, grade, feedback, submitted_at, created_at')
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      const activityIds = allSubmissions?.map(s => s.activity_id) || [];

      // Buscar atividades
      const { data: activities } = await supabase
        .from('activities')
        .select('id, title, type, max_score')
        .in('id', activityIds);

      const activitiesMap = {};
      activities?.forEach(a => { activitiesMap[a.id] = a; });

      // Buscar assignments para pegar class_id
      const { data: assignments } = await supabase
        .from('activity_class_assignments')
        .select('activity_id, class_id')
        .in('activity_id', activityIds);

      const classIds = assignments?.map(a => a.class_id).filter(Boolean) || [];

      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds);

      const classesMap = {};
      classes?.forEach(c => { classesMap[c.id] = c; });

      const assignmentsMap = {};
      assignments?.forEach(a => {
        assignmentsMap[a.activity_id] = {
          class_id: a.class_id,
          class_name: classesMap[a.class_id]?.name
        };
      });

      // Mapear submissões com dados completos
      const submissionsWithData = (allSubmissions || []).map(s => {
        const activity = activitiesMap[s.activity_id];
        const assignment = assignmentsMap[s.activity_id];

        return {
          ...s,
          activity_title: activity?.title,
          activity_type: activity?.type,
          max_score: activity?.max_score,
          class_id: assignment?.class_id,
          class_name: assignment?.class_name
        };
      });

      // Calcular estatísticas
      const completed = submissionsWithData.filter(s => s.grade !== null);
      const grades = completed.map(s => parseFloat(s.grade)).filter(g => !isNaN(g));

      const statsData = {
        total: submissionsWithData.length,
        completed: completed.length,
        avgGrade: grades.length > 0 ? grades.reduce((sum, g) => sum + g, 0) / grades.length : 0,
        highestGrade: grades.length > 0 ? Math.max(...grades) : 0
      };

      setStats(statsData);
      setSubmissions(submissionsWithData);
    } catch (error) {
      logger.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  };

  const filterSubmissions = () => {
    let filtered = [...submissions];

    // Filtro por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.activity_title?.toLowerCase().includes(query) ||
        s.class_name?.toLowerCase().includes(query)
      );
    }

    // Filtro por turma
    if (selectedClass !== 'all') {
      filtered = filtered.filter(s => s.class_id === selectedClass);
    }

    // Filtro por status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(s => s.status === selectedStatus);
    }

    // Filtro por período
    if (selectedPeriod !== 'all') {
      const now = new Date();
      let startDate = new Date();

      if (selectedPeriod === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (selectedPeriod === 'semester') {
        startDate.setMonth(now.getMonth() - 6);
      }

      filtered = filtered.filter(s => new Date(s.submitted_at) >= startDate);
    }

    setFilteredSubmissions(filtered);
  };

  const handleExport = () => {
    // Criar CSV com os dados
    const csvData = filteredSubmissions.map(s => ({
      Data: format(new Date(s.submitted_at), 'dd/MM/yyyy', { locale: ptBR }),
      Atividade: s.activity_title,
      Turma: s.class_name,
      Nota: s.grade || '-',
      'Nota Máxima': s.max_score,
      Status: s.status === 'graded' ? 'Avaliada' : s.status === 'pending' ? 'Pendente' : 'Submetida'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading && initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
              <History className="w-8 h-8 text-purple-600" />
              Histórico de Atividades
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Acompanhe todo o seu histórico acadêmico
            </p>
          </div>

          <Button onClick={handleExport} disabled={filteredSubmissions.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 border-2 border-blue-200 dark:border-blue-800">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total de Submissões</div>
          <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
        </Card>

        <Card className="p-6 border-2 border-green-200 dark:border-green-800">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Avaliadas</div>
          <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
        </Card>

        <Card className="p-6 border-2 border-yellow-200 dark:border-yellow-800">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Média Geral</div>
          <div className="text-3xl font-bold text-yellow-600">
            {stats.avgGrade > 0 ? stats.avgGrade.toFixed(1) : '--'}
          </div>
        </Card>

        <Card className="p-6 border-2 border-purple-200 dark:border-purple-800">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Maior Nota</div>
          <div className="text-3xl font-bold text-purple-600">
            {stats.highestGrade > 0 ? stats.highestGrade.toFixed(1) : '--'}
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por atividade ou turma..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro por Turma */}
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Todas as turmas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Status */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="graded">✅ Avaliadas</SelectItem>
              <SelectItem value="submitted">📤 Submetidas</SelectItem>
              <SelectItem value="pending">⏳ Pendentes</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por Período */}
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Todo o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mês</SelectItem>
              <SelectItem value="semester">Último semestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Lista de Submissões */}
      {filteredSubmissions.length > 0 ? (
        <div className="space-y-4">
          {filteredSubmissions.map((submission, index) => {
            // Preparar dados para GradeCard
            const gradeData = {
              id: submission.id,
              activity_title: submission.activity_title,
              class_name: submission.class_name,
              grade: submission.grade,
              max_score: submission.max_score,
              feedback: submission.feedback,
              submitted_at: submission.submitted_at,
              activity_id: submission.activity_id
            };

            return submission.grade ? (
              <GradeCard
                key={submission.id}
                grade={gradeData}
                onViewDetails={() => navigate(`/students/activities/${submission.activity_id}`)}
                index={index}
              />
            ) : (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 border-2 border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        {submission.activity_title || 'Atividade'}
                      </h3>
                      {submission.class_name && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {submission.class_name}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span>Submetido em {format(new Date(submission.submitted_at), "dd 'de' MMMM", { locale: ptBR })}</span>
                        <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          {submission.status === 'pending' ? '⏳ Aguardando correção' : '📤 Submetida'}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate(`/students/activities/${submission.activity_id}`)}
                      variant="outline"
                      size="sm"
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={searchQuery || selectedClass !== 'all' || selectedStatus !== 'all' || selectedPeriod !== 'all' ? Search : History}
          title={searchQuery || selectedClass !== 'all' || selectedStatus !== 'all' || selectedPeriod !== 'all' ? 'Nenhum resultado encontrado' : 'Nenhuma submissão ainda'}
          description={
            searchQuery || selectedClass !== 'all' || selectedStatus !== 'all' || selectedPeriod !== 'all'
              ? 'Tente ajustar os filtros de busca para encontrar o que procura.'
              : 'Você ainda não submeteu nenhuma atividade. Comece a responder suas atividades!'
          }
          variant="default"
        />
      )}
    </div>
  );
};

export default StudentHistoryPageRedesigned;
