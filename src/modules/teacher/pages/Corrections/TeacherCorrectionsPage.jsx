import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, TrendingUp, AlertCircle, Filter, Download, FileText, Users, Calendar } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('oldest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Estatísticas
  const [stats, setStats] = useState({
    totalPending: 0,
    correctedToday: 0,
    avgGrade: 0,
    avgTime: 0
  });

  useEffect(() => {
    loadSubmissions();
    loadMetrics();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [submissions, statusFilter, searchQuery, sortBy]);

  const loadSubmissions = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const filters = {
        classId: searchParams.get('classId'),
        activityId: searchParams.get('activityId'),
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

  const applyFilters = () => {
    let filtered = [...submissions];

    // Filtro de status
    if (statusFilter === 'pending') {
      filtered = filtered.filter(s => s.status === 'submitted');
    } else if (statusFilter === 'graded') {
      filtered = filtered.filter(s => s.status === 'graded');
    } else if (statusFilter === 'flagged') {
      filtered = filtered.filter(s => s.flagged_for_review);
    }

    // Busca textual
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.student?.full_name?.toLowerCase().includes(query) ||
        s.activity?.title?.toLowerCase().includes(query)
      );
    }

    setFilteredSubmissions(filtered);
  };

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
        <div className="space-y-4">
          {/* Linha 1: Tabs e Busca */}
          <div className="flex flex-col md:flex-row gap-4">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="graded">Corrigidas</TabsTrigger>
                <TabsTrigger value="flagged">Marcadas</TabsTrigger>
              </TabsList>
            </Tabs>

            <Input
              placeholder="Buscar por aluno ou atividade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:w-64"
            />
          </div>

          {/* Linha 2: Ordenação e Ações */}
          <div className="flex flex-wrap gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">Mais Antigas Primeiro</SelectItem>
                <SelectItem value="newest">Mais Recentes Primeiro</SelectItem>
                <SelectItem value="student">Por Aluno (A-Z)</SelectItem>
                <SelectItem value="grade">Por Nota</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
              <Filter className="w-4 h-4 mr-2" />
              Filtros Avançados
            </Button>

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
