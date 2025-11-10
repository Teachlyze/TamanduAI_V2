import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, TrendingUp, AlertCircle, Filter, Download, FileText, Users, Calendar, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader, StatsCard, EmptyState, gradients } from '@/shared/design';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import { getSubmissionsForCorrection, getCorrectionMetrics } from '@/shared/services/correctionService';
import ClassService from '@/shared/services/classService';
import ActivityService from '@/shared/services/activityService';
import CorrectionModal from './components/CorrectionModal';
import SubmissionRow from './components/SubmissionRow';
import BulkCorrectionModal from './components/BulkCorrectionModal';
import AdvancedFilters from './components/AdvancedFilters';
import CompareSubmissionsModal from './components/CompareSubmissionsModal';

const TeacherCorrectionsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [currentSubmissionIndex, setCurrentSubmissionIndex] = useState(0);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('oldest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Filtros de turma e atividade
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // Estatísticas
  const [stats, setStats] = useState({
    totalPending: 0,
    correctedToday: 0,
    avgGrade: 0,
    avgTime: 0
  });

  // Carregar turmas do professor
  const loadTeacherClasses = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoadingClasses(true);
      const teacherClasses = await ClassService.getTeacherClasses(user.id);
      setClasses(teacherClasses);
      
      // Se houver apenas uma turma, seleciona automaticamente
      if (teacherClasses.length === 1) {
        setSelectedClass(teacherClasses[0].id);
      }
    } catch (error) {
      logger.error('Erro ao carregar turmas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as turmas.',
        variant: 'destructive'
      });
    } finally {
      setLoadingClasses(false);
    }
  }, [user]);

  // Carregar atividades da turma selecionada
  const loadClassActivities = useCallback(async (classId) => {
    if (!classId) {
      setActivities([]);
      setSelectedActivity('all');
      return;
    }
    
    try {
      setLoadingActivities(true);
      const classActivities = await ActivityService.getActivitiesByClass(classId);
      
      // Certifica-se de que temos um array válido e mapeia para o formato esperado
      const formattedActivities = Array.isArray(classActivities) 
        ? classActivities.map(activity => ({
            id: activity.id,
            title: activity.title,
            description: activity.description,
            due_date: activity.due_date,
            created_at: activity.created_at,
            status: activity.status,
            max_score: activity.max_score
          }))
        : [];
      
      setActivities(formattedActivities);
      
      // Se houver apenas uma atividade, seleciona automaticamente
      if (formattedActivities.length === 1) {
        setSelectedActivity(formattedActivities[0].id);
      } else {
        setSelectedActivity('all');
      }
    } catch (error) {
      logger.error('Erro ao carregar atividades:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as atividades desta turma.',
        variant: 'destructive'
      });
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  // Efeito para carregar turmas ao montar o componente
  useEffect(() => {
    loadTeacherClasses();
    loadMetrics();
  }, [loadTeacherClasses]);

  // Efeito para carregar atividades quando uma turma é selecionada
  useEffect(() => {
    if (selectedClass) {
      loadClassActivities(selectedClass);
    } else {
      setActivities([]);
      setSelectedActivity('');
    }
  }, [selectedClass, loadClassActivities]);

  // Efeito para carregar submissões APENAS quando a turma muda (atividade filtra localmente)
  useEffect(() => {
    if (selectedClass) {
      loadSubmissions();
    }
  }, [selectedClass]);

  // Usar useMemo para filtrar submissões sem recarregar (otimização de performance)
  const filteredAndSortedSubmissions = useMemo(() => {
    if (!submissions || submissions.length === 0) {
      return [];
    }

    let result = [...submissions];

    // Aplicar filtro de atividade (local, sem requisição)
    if (selectedActivity && selectedActivity !== 'all') {
      result = result.filter(s => s.activity_id === selectedActivity);
    }

    // Aplicar filtro de status
    if (statusFilter === 'pending') {
      result = result.filter(s => s.status === 'submitted');
    } else if (statusFilter === 'graded') {
      result = result.filter(s => s.status === 'graded');
    } else if (statusFilter === 'flagged') {
      result = result.filter(s => s.status === 'needs_review');
    }

    // Aplicar filtro de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(submission => 
        submission.student?.full_name?.toLowerCase().includes(query) ||
        submission.activity?.title?.toLowerCase().includes(query)
      );
    }

    // Aplicar ordenação
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
    } else if (sortBy === 'grade_asc') {
      result.sort((a, b) => (a.grade || 0) - (b.grade || 0));
    } else if (sortBy === 'grade_desc') {
      result.sort((a, b) => (b.grade || 0) - (a.grade || 0));
    }

    return result;
  }, [submissions, selectedActivity, statusFilter, searchQuery, sortBy]);

  // Sincronizar com estado filteredSubmissions para compatibilidade
  useEffect(() => {
    setFilteredSubmissions(filteredAndSortedSubmissions);
  }, [filteredAndSortedSubmissions]);

  const loadSubmissions = async () => {
    if (!user || !selectedClass) return;

    try {
      setLoading(true);

      const filters = {
        classId: selectedClass,
        activityId: null, // Removido - agora filtra localmente com useMemo
        status: null, // Removido - agora filtra localmente com useMemo
        sortBy
      };

      const { data, error } = await getSubmissionsForCorrection(filters);

      if (error) throw error;

      setSubmissions(data || []);
      
      // Calcular estatísticas
      const pending = data?.filter(s => s.status === 'submitted').length || 0;
      setStats(prev => ({ ...prev, totalPending: pending }));

    } catch (error) {
      logger.error('Erro ao carregar submissões:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as submissões.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    if (!user) return;

    try {
      const { data } = await getCorrectionMetrics(user.id, 'day');
      
      if (data) {
        setStats(prev => ({
          ...prev,
          correctedToday: data.corrections_count || 0,
          avgGrade: data.avg_grade?.toFixed(1) || 0,
          avgTime: Math.round(data.avg_time_per_correction / 60) || 0 // minutos
        }));
      }
    } catch (error) {
      logger.error('Erro ao carregar métricas:', error)
    }
  };

  // Função applyFilters removida - agora usa useMemo para filtrar sem recarregar

  const handleOpenCorrection = (submission, index = 0) => {
    setSelectedSubmission(submission);
    setCurrentSubmissionIndex(index);
    setShowCorrectionModal(true);
  };

  const handleNavigateSubmission = (direction) => {
    const newIndex = direction === 'next' ? currentSubmissionIndex + 1 : currentSubmissionIndex - 1;
    if (newIndex >= 0 && newIndex < filteredSubmissions.length) {
      setCurrentSubmissionIndex(newIndex);
      setSelectedSubmission(filteredSubmissions[newIndex]);
    }
  };

  const handleBulkCorrection = () => {
    if (selectedIds.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos uma submissão',
        variant: 'destructive'
      });
      return;
    }
    setShowBulkModal(true);
  };

  const handleCompareSubmissions = () => {
    if (selectedIds.length !== 2) {
      toast({
        title: 'Erro',
        description: 'Selecione exatamente 2 submissões para comparar',
        variant: 'destructive'
      });
      return;
    }
    setShowCompareModal(true);
  };

  const handleCorrectionSaved = () => {
    setShowCorrectionModal(false);
    setSelectedSubmission(null);
    loadSubmissions();
    loadMetrics();
    toast({
      title: 'Sucesso',
      description: 'Correção salva com sucesso!'
    });
  };

  const handleExport = () => {
    toast({
      title: 'Em breve',
      description: 'Função de exportação será implementada em breve.'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando correções..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header */}
      <DashboardHeader
        title="Correções Pendentes"
        subtitle={`${stats.totalPending} submissões aguardando correção`}
        role="teacher"
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Pendentes"
          value={stats.totalPending}
          icon={Clock}
          gradient={gradients.warning}
          bgColor="bg-yellow-50 dark:bg-yellow-950/30"
        />
        <StatsCard
          title="Corrigidas Hoje"
          value={stats.correctedToday}
          icon={CheckCircle}
          gradient={gradients.success}
          bgColor="bg-green-50 dark:bg-green-950/30"
        />
        <StatsCard
          title="Média de Notas"
          value={stats.avgGrade}
          icon={TrendingUp}
          gradient={gradients.info}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
        />
        <StatsCard
          title="Tempo Médio"
          value={`${stats.avgTime}min`}
          icon={AlertCircle}
          gradient="from-purple-500 to-pink-500"
          bgColor="bg-purple-50 dark:bg-purple-950/30"
        />
      </div>

      {/* Filtros e Busca */}
      <Card className="p-6 mb-6">
        <div className="space-y-6">
          {/* Cabeçalho e Filtros */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Correções</h1>
                <p className="text-muted-foreground">
                  {statusFilter === 'all' 
                    ? 'Todas as submissões' 
                    : statusFilter === 'pending' 
                      ? 'Submissões aguardando correção' 
                      : statusFilter === 'graded' 
                        ? 'Submissões já corrigidas' 
                        : 'Submissões sinalizadas'}
                </p>
              </div>
            </div>

            {/* Filtros de Turma e Atividade */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Turma</label>
                <Select 
                  value={selectedClass} 
                  onValueChange={setSelectedClass}
                  disabled={loadingClasses}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingClasses ? 'Carregando turmas...' : 'Selecione uma turma'} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Atividade</label>
                <Select 
                  value={selectedActivity} 
                  onValueChange={setSelectedActivity}
                  disabled={!selectedClass || loadingActivities}
                >
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        !selectedClass 
                          ? 'Selecione uma turma primeiro' 
                          : loadingActivities 
                            ? 'Carregando atividades...' 
                            : 'Todas as atividades'
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as atividades</SelectItem>
                    {activities.map((activity) => (
                      <SelectItem key={activity.id} value={activity.id}>
                        {activity.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="graded">Corrigidas</SelectItem>
                    <SelectItem value="flagged">Sinalizadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Barra de pesquisa e filtros adicionais */}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por aluno ou atividade..."
                  className="pl-9 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oldest">Mais antigas primeiro</SelectItem>
                  <SelectItem value="newest">Mais recentes primeiro</SelectItem>
                  <SelectItem value="grade_asc">Nota: menor para maior</SelectItem>
                  <SelectItem value="grade_desc">Nota: maior para menor</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="w-full sm:w-auto"
              >
                <Filter className="mr-2 h-4 w-4" />
                Mais filtros
              </Button>
            </div>
          </div>

          {/* Linha 2: Ordenação e Ações */}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>

            {selectedIds.length > 0 && (
              <>
                <Button variant="outline" onClick={handleBulkCorrection}>
                  Correção em Lote ({selectedIds.length})
                </Button>
                
                {selectedIds.length === 2 && (
                  <Button variant="outline" onClick={handleCompareSubmissions}>
                    Comparar Submissões
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Filtros Avançados */}
      {showAdvancedFilters && (
        <div className="mb-6">
          <AdvancedFilters
            onApply={(filters) => {
              logger.debug('Aplicar filtros avançados:', filters)
              toast({ title: 'Filtros aplicados' });
            }}
            onClear={() => {
              setShowAdvancedFilters(false);
            }}
          />
        </div>
      )}

      {/* Lista de Submissões */}
      {filteredSubmissions.length > 0 ? (
        <div className="space-y-3">
          {filteredSubmissions.map((submission, index) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <SubmissionRow
                submission={submission}
                onCorrect={() => handleOpenCorrection(submission, index)}
                isSelected={selectedIds.includes(submission.id)}
                onSelect={(checked) => {
                  setSelectedIds(prev =>
                    checked ? [...prev, submission.id] : prev.filter(id => id !== submission.id)
                  );
                }}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nenhuma submissão encontrada"
          description="Não há submissões pendentes de correção no momento."
        />
      )}

      {/* Modal de Correção */}
      {showCorrectionModal && selectedSubmission && (
        <CorrectionModal
          submission={selectedSubmission}
          submissions={filteredSubmissions}
          currentIndex={currentSubmissionIndex}
          onClose={() => {
            setShowCorrectionModal(false);
            setSelectedSubmission(null);
          }}
          onSaved={handleCorrectionSaved}
          onNavigate={handleNavigateSubmission}
        />
      )}

      {/* Modal de Correção em Lote */}
      {showBulkModal && (
        <BulkCorrectionModal
          submissions={submissions.filter(s => selectedIds.includes(s.id))}
          onClose={() => setShowBulkModal(false)}
          onCompleted={() => {
            setShowBulkModal(false);
            setSelectedIds([]);
            loadSubmissions();
            loadMetrics();
          }}
        />
      )}

      {/* Modal de Comparação */}
      {showCompareModal && (
        <CompareSubmissionsModal
          submissionIds={selectedIds}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
};

export default TeacherCorrectionsPage;
