import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, ClipboardList, Search, Filter, Download, MoreVertical,
  Eye, Edit, Archive, Trash2, Clock, CheckCircle, AlertCircle,
  Calendar, FileText, TrendingUp, Users
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Progress } from '@/shared/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { toast } from '@/shared/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isPast, isFuture, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PostExistingActivityModal from '../components/PostExistingActivityModal';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';

/**
 * TAB 5: ATIVIDADES - Core do Sistema
 * 
 * Funcionalidades:
 * 1. Lista de atividades com métricas
 * 2. Busca e filtros avançados
 * 3. Criar/Postar atividades
 * 4. Ver submissões
 * 5. Estatísticas de desempenho
 * 6. Ações (editar, arquivar, deletar)
 */

const ActivitiesTab = ({ classId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, title: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDeadline, setFilterDeadline] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showPostExistingModal, setShowPostExistingModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    overdue: 0,
    pendingCorrections: 0
  });
  const [editDeadline, setEditDeadline] = useState({
    isOpen: false,
    activityId: null,
    dueDate: '',
    dueTime: '23:59'
  });
  const [savingDeadline, setSavingDeadline] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [classId]);

  const loadActivities = async () => {
    try {
      setLoading(true);

      // Buscar atividades da turma
      const { data: assignments, error: assignmentsError } = await supabase
        .from('activity_class_assignments')
        .select(`
          id,
          assigned_at,
          activity:activities(
            id,
            title,
            description,
            type,
            due_date,
            max_score,
            status,
            created_at
          )
        `)
        .eq('class_id', classId)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Buscar total de alunos da turma
      const { count: studentCount } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('role', 'student');

      // Para cada atividade, buscar métricas de submissões
      const activitiesWithMetrics = await Promise.all(
        (assignments || []).map(async (assignment) => {
          const activityId = assignment.activity?.id;
          
          if (!activityId) {
            return {
              ...assignment,
              submissionsCount: 0,
              totalStudents: studentCount || 0,
              pendingCorrections: 0,
              avgGrade: null,
              submissionRate: 0
            };
          }

          // Buscar IDs dos alunos DESTA turma
          const { data: classStudents } = await supabase
            .from('class_members')
            .select('user_id')
            .eq('class_id', classId)
            .eq('role', 'student');

          const studentIds = classStudents?.map(s => s.user_id) || [];

          // Buscar submissões APENAS dos alunos DESTA turma
          let submissions = [];
          if (studentIds.length > 0) {
            const { data } = await supabase
              .from('submissions')
              .select('id, status, grade')
              .eq('activity_id', activityId)
              .in('student_id', studentIds);
            submissions = data || [];
          }

          const totalSubmissions = submissions?.length || 0;
          const pendingCorrections = submissions?.filter(s => s.status === 'submitted').length || 0;
          
          // Calcular nota média
          const grades = submissions
            ?.filter(s => s.grade !== null)
            .map(s => parseFloat(s.grade)) || [];
          const avgGrade = grades.length > 0
            ? grades.reduce((sum, g) => sum + g, 0) / grades.length
            : null;

          const submissionRate = studentCount > 0 
            ? (totalSubmissions / studentCount) * 100 
            : 0;

          return {
            ...assignment,
            submissionsCount: totalSubmissions,
            totalStudents: studentCount || 0,
            pendingCorrections,
            avgGrade,
            submissionRate
          };
        })
      );

      // Calcular estatísticas
      const now = new Date();
      const statsData = {
        total: activitiesWithMetrics.length,
        published: activitiesWithMetrics.filter(a => {
          const status = a.activity?.status;
          return status === 'published' || status === 'active';
        }).length,
        draft: activitiesWithMetrics.filter(a => {
          const status = a.activity?.status;
          return !status || status === 'draft';
        }).length,
        overdue: activitiesWithMetrics.filter(a => 
          a.activity?.due_date && isPast(new Date(a.activity.due_date)) && !isToday(new Date(a.activity.due_date))
        ).length,
        pendingCorrections: activitiesWithMetrics.reduce((sum, a) => sum + (a.pendingCorrections || 0), 0)
      };

      setActivities(activitiesWithMetrics);
      setStats(statsData);

    } catch (error) {
      logger.error('Erro ao carregar atividades:', error)
      toast({
        title: 'Erro ao carregar atividades',
        description: error.message,
        variant: 'destructive'
      });
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filtra e ordena atividades
   */
  const getFilteredAndSortedActivities = () => {
    let filtered = activities;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.activity?.title?.toLowerCase().includes(query) ||
        a.activity?.description?.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => {
        const status = a.activity?.status;
        if (filterStatus === 'published') {
          // Considerar published (novo padrão) e active (legado) como publicadas
          return status === 'published' || status === 'active';
        }
        if (filterStatus === 'draft') {
          return !status || status === 'draft';
        }
        if (filterStatus === 'pending_correction') return a.pendingCorrections > 0;
        return true;
      });
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.activity?.type === filterType);
    }

    if (filterDeadline !== 'all') {
      const now = new Date();
      filtered = filtered.filter(a => {
        if (!a.activity?.due_date) return filterDeadline === 'no_deadline';
        const dueDate = new Date(a.activity.due_date);
        
        switch (filterDeadline) {
          case 'overdue':
            return isPast(dueDate) && !isToday(dueDate);
          case 'today':
            return isToday(dueDate);
          case 'tomorrow':
            return isTomorrow(dueDate);
          case 'week':
            return isFuture(dueDate) && dueDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          default:
            return true;
        }
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.assigned_at) - new Date(a.assigned_at);
        case 'deadline':
          if (!a.activity?.due_date) return 1;
          if (!b.activity?.due_date) return -1;
          return new Date(a.activity.due_date) - new Date(b.activity.due_date);
        case 'submissions':
          return b.submissionsCount - a.submissionsCount;
        case 'corrections':
          return b.pendingCorrections - a.pendingCorrections;
        case 'title':
          return (a.activity?.title || '').localeCompare(b.activity?.title || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getDeadlineColor = (dueDate) => {
    if (!dueDate) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    }
    if (isToday(date) || isTomorrow(date)) {
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    }
    return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  };

  const getDeadlineText = (dueDate) => {
    if (!dueDate) return 'Sem prazo';
    
    const date = new Date(dueDate);
    if (isToday(date)) return `Hoje às ${format(date, 'HH:mm')}`;
    if (isTomorrow(date)) return `Amanhã às ${format(date, 'HH:mm')}`;
    if (isPast(date)) return `Atrasado - ${format(date, 'dd/MM/yyyy')}`;
    
    return formatDistanceToNow(date, { locale: ptBR, addSuffix: true });
  };

  const openEditDeadline = (activity) => {
    if (!activity) return;

    try {
      let dateStr = '';
      let timeStr = '23:59';

      if (activity.due_date) {
        const current = new Date(activity.due_date);
        const iso = current.toISOString();
        dateStr = iso.split('T')[0];
        timeStr = iso.substring(11, 16);
      } else {
        const today = new Date();
        const iso = today.toISOString();
        dateStr = iso.split('T')[0];
      }

      setEditDeadline({
        isOpen: true,
        activityId: activity.id,
        dueDate: dateStr,
        dueTime: timeStr || '23:59'
      });
    } catch (error) {
      logger.error('Erro ao preparar edição de prazo:', error);
      toast({
        title: 'Erro ao carregar prazo',
        description: 'Não foi possível carregar a data de entrega atual.',
        variant: 'destructive'
      });
    }
  };

  const handleSaveDeadline = async () => {
    if (!editDeadline.activityId || !editDeadline.dueDate) {
      toast({
        title: 'Data obrigatória',
        description: 'Defina uma data de entrega para salvar.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSavingDeadline(true);

      const dueTime = editDeadline.dueTime || '23:59';
      const dueDatetime = `${editDeadline.dueDate}T${dueTime}:00`;

      const { error } = await supabase
        .from('activities')
        .update({ due_date: dueDatetime })
        .eq('id', editDeadline.activityId);

      if (error) throw error;

      toast({
        title: 'Prazo atualizado',
        description: 'A data de entrega da atividade foi atualizada.',
      });

      setEditDeadline(prev => ({ ...prev, isOpen: false }));
      await loadActivities();
    } catch (error) {
      logger.error('Erro ao salvar novo prazo da atividade:', error);
      toast({
        title: 'Erro ao atualizar prazo',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSavingDeadline(false);
    }
  };

  const handleExportGrades = async (activity) => {
    try {
      // Buscar submissões da atividade
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select(`
          *,
          student:profiles!student_id(full_name, email)
        `)
        .eq('activity_id', activity.id)
        .not('grade', 'is', null);

      if (error) throw error;

      if (!submissions || submissions.length === 0) {
        toast({
          title: 'Sem notas',
          description: 'Esta atividade ainda não possui notas lançadas.',
          variant: 'destructive'
        });
        return;
      }

      // Gerar CSV
      const csvContent = [
        ['Aluno', 'Email', 'Nota', 'Data de Envio', 'Data de Correção'],
        ...submissions.map(sub => [
          sub.student?.full_name || 'Sem nome',
          sub.student?.email || '',
          sub.grade || '0',
          sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('pt-BR') : '-',
          sub.graded_at ? new Date(sub.graded_at).toLocaleDateString('pt-BR') : '-'
        ])
      ].map(row => row.join(',')).join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `notas_${activity.title.replace(/[^a-z0-9]/gi, '_')}.csv`;
      link.click();

      toast({
        title: '✅ Notas exportadas!',
        description: `${submissions.length} nota(s) exportada(s) em CSV.`
      });
    } catch (error) {
      logger.error('Erro ao exportar notas:', error)
      toast({
        title: '❌ Erro ao exportar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleArchiveActivity = async (activity) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString() 
        })
        .eq('id', activity.id);

      if (error) throw error;

      toast({
        title: '✅ Atividade arquivada!',
        description: 'A atividade foi movida para arquivados.'
      });

      loadActivities();
    } catch (error) {
      logger.error('Erro ao arquivar atividade:', error)
      toast({
        title: '❌ Erro ao arquivar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteActivity = (id, title) => {
    setDeleteConfirm({ isOpen: true, id, title });
  };

  const confirmDelete = async () => {
    const { id, title } = deleteConfirm;
    
    if (!id) {
      toast({
        title: '❌ Erro',
        description: 'ID da atividade não encontrado.',
        variant: 'destructive'
      });
      setDeleteConfirm({ isOpen: false, id: null, title: '' });
      return;
    }
    
    try {
      // Primeiro, remover o assignment da turma
      const { error: assignError } = await supabase
        .from('activity_class_assignments')
        .delete()
        .eq('activity_id', id)
        .eq('class_id', classId);

      if (assignError) throw assignError;

      toast({
        title: '✅ Atividade removida',
        description: `"${title}" foi removida da turma com sucesso.`
      });

      setDeleteConfirm({ isOpen: false, id: null, title: '' });
      loadActivities();
    } catch (error) {
      logger.error('Erro ao deletar atividade:', error)
      toast({
        title: '❌ Erro ao deletar atividade',
        description: error.message,
        variant: 'destructive'
      });
      setDeleteConfirm({ isOpen: false, id: null, title: '' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const filteredActivities = getFilteredAndSortedActivities();

  return (
    <div className="space-y-6">
      {/* ========== CARDS DE ESTATÍSTICAS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.published}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Publicadas</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.draft}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Rascunhos</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
              <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.overdue}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Atrasadas</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.pendingCorrections}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">P/ Corrigir</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ========== HEADER COM AÇÕES ========== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Atividades da Turma</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {filteredActivities.length} de {stats.total} atividades
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPostExistingModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Postar Existente
          </Button>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
            onClick={() => navigate(`/atividades/criar?classId=${classId}`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Atividade
          </Button>
        </div>
      </div>

      {/* ========== FILTROS E BUSCA ========== */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar atividade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="published">Publicadas</SelectItem>
              <SelectItem value="draft">Rascunhos</SelectItem>
              <SelectItem value="pending_correction">Pendentes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDeadline} onValueChange={setFilterDeadline}>
            <SelectTrigger>
              <SelectValue placeholder="Prazo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Prazos</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="tomorrow">Amanhã</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="no_deadline">Sem Prazo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais Recentes</SelectItem>
              <SelectItem value="deadline">Prazo (próximo)</SelectItem>
              <SelectItem value="submissions">Submissões</SelectItem>
              <SelectItem value="corrections">Correções</SelectItem>
              <SelectItem value="title">Título (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* ========== LISTA DE ATIVIDADES ========== */}
      {filteredActivities.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <ClipboardList className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {activities.length === 0 ? 'Nenhuma atividade postada' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {activities.length === 0 
                ? 'Crie ou poste uma atividade para começar.'
                : 'Ajuste os filtros para ver mais resultados.'}
            </p>
            {activities.length === 0 && (
              <Button onClick={() => navigate(`/dashboard/activities/create?classId=${classId}`)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Atividade
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((assignment, index) => {
            const activity = assignment.activity;
            const submissionColor = assignment.submissionRate >= 80 ? 'text-green-600' :
                                   assignment.submissionRate >= 50 ? 'text-yellow-600' :
                                   'text-red-600';

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">
                              {activity?.title || 'Sem título'}
                            </h3>
                            {activity && (!activity.status || activity.status === 'draft') && (
                              <Badge variant="secondary" className="text-xs">Rascunho</Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                            {activity?.description || 'Sem descrição'}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              {activity?.type === 'assignment' ? 'Trabalho' :
                               activity?.type === 'quiz' ? 'Quiz' :
                               activity?.type === 'exam' ? 'Prova' :
                               activity?.type || 'Atividade'}
                            </Badge>
                            
                            <Badge className={`text-xs ${getDeadlineColor(activity?.due_date)}`}>
                              <Clock className="w-3 h-3 mr-1" />
                              {getDeadlineText(activity?.due_date)}
                            </Badge>
                            
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Postado {formatDistanceToNow(new Date(assignment.assigned_at), { locale: ptBR, addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t dark:border-slate-700">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className={`text-sm font-semibold ${submissionColor}`}>
                              {assignment.submissionRate.toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={assignment.submissionRate} className="h-2 mb-1" />
                          <div className="text-xs text-slate-500">
                            {assignment.submissionsCount}/{assignment.totalStudents} submissões
                          </div>
                        </div>

                        <div className="text-center">
                          <div className={`text-2xl font-bold ${assignment.pendingCorrections > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {assignment.pendingCorrections}
                          </div>
                          <div className="text-xs text-slate-500">Pendentes</div>
                        </div>

                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {assignment.avgGrade?.toFixed(1) || '—'}
                          </div>
                          <div className="text-xs text-slate-500">Nota Média</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dashboard/activities/${activity?.id}/submissions`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Submissões
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/activities/${activity?.id}/edit`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Atividade
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDeadline(activity)}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Editar Prazo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportGrades(activity)}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar Notas
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleArchiveActivity(activity)}>
                            <Archive className="w-4 h-4 mr-2" />
                            Arquivar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600 dark:text-red-400"
                            onClick={() => {
                              const activityId = assignment?.activity?.id;
                              const activityTitle = assignment?.activity?.title || 'Atividade';
                              logger.debug('[ActivitiesTab] Delete clicked:', { activityId, activityTitle, fullAssignment: assignment })
                              handleDeleteActivity(activityId, activityTitle);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de Postar Atividade Existente */}
      <PostExistingActivityModal
        isOpen={showPostExistingModal}
        onClose={() => setShowPostExistingModal(false)}
        classId={classId}
        onSuccess={loadActivities}
      />

      {/* Modal para editar prazo da atividade */}
      <Dialog
        open={editDeadline.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditDeadline(prev => ({ ...prev, isOpen: false }));
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar prazo da atividade</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-due-date">
                <Calendar className="w-4 h-4 inline mr-1" />
                Data de Entrega
              </Label>
              <Input
                id="edit-due-date"
                type="date"
                value={editDeadline.dueDate}
                onChange={(e) => setEditDeadline(prev => ({ ...prev, dueDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-due-time">
                <Clock className="w-4 h-4 inline mr-1" />
                Hora
              </Label>
              <Input
                id="edit-due-time"
                type="time"
                value={editDeadline.dueTime}
                onChange={(e) => setEditDeadline(prev => ({ ...prev, dueTime: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDeadline(prev => ({ ...prev, isOpen: false }))}
              disabled={savingDeadline}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveDeadline}
              disabled={savingDeadline || !editDeadline.dueDate}
            >
              {savingDeadline ? 'Salvando...' : 'Salvar Prazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, title: '' })}
        onConfirm={confirmDelete}
        title="Remover Atividade da Turma"
        message={`Tem certeza que deseja remover "${deleteConfirm.title}" desta turma? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default ActivitiesTab;
