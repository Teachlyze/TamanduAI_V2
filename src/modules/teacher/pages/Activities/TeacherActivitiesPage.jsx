import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, ClipboardList, Grid3x3, Calendar, Upload, Globe,
  List, LayoutGrid, Search, X, TrendingUp, SlidersHorizontal,
  ChevronDown, ChevronUp, Star, Archive, Share2, Download
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader, StatsCard, EmptyState, gradients } from '@/shared/design';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import { cn } from '@/lib/utils';
import ActivityListItem from './components/ActivityListItem';
import ActivityGridCard from './components/ActivityGridCard';
import PostActivityModal from './components/PostActivityModal';

const TeacherActivitiesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [classes, setClasses] = useState([]);
  
  const [stats, setStats] = useState({
    total: 0,
    byType: { open: 0, closed: 0, mixed: 0 },
    mostUsed: null,
    recentCount: 0
  });

  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ type: [], status: [] });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState('created_desc');
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [expandedActivityId, setExpandedActivityId] = useState(null);

  useEffect(() => {
    if (user) {
      loadActivities();
      loadClasses();
    }
  }, [user]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          assignments:activity_class_assignments(
            id, class_id, assigned_at,
            class:classes(id, name)
          ),
          submissions:submissions(id, status, grade)
        `)
        .eq('created_by', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedActivities = (data || []).map(activity => {
        const submittedCount = activity.submissions?.filter(s => s.status === 'submitted' || s.status === 'graded').length || 0;
        const avgGrade = activity.submissions?.filter(s => s.grade !== null).reduce((acc, s) => acc + parseFloat(s.grade), 0) / submittedCount || 0;
        
        return {
          ...activity,
          timesUsed: activity.assignments?.length || 0,
          submittedCount,
          avgGrade: avgGrade.toFixed(2),
          classNames: activity.assignments?.map(a => a.class?.name).filter(Boolean) || []
        };
      });

      setActivities(processedActivities);
      calculateStats(processedActivities);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as atividades.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('created_by', user.id)
        .eq('is_active', true);
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const calculateStats = (activitiesData) => {
    const total = activitiesData.length;
    const byType = {
      open: activitiesData.filter(a => a.type === 'open' || a.type === 'assignment').length,
      closed: activitiesData.filter(a => a.type === 'closed' || a.type === 'quiz').length,
      mixed: activitiesData.filter(a => a.type === 'mixed' || a.type === 'project').length
    };
    const mostUsed = activitiesData.reduce((max, activity) => 
      activity.timesUsed > (max?.timesUsed || 0) ? activity : max, null);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const recentCount = activitiesData.filter(a => new Date(a.created_at) > lastMonth).length;
    setStats({ total, byType, mostUsed, recentCount });
  };

  const filteredActivities = useMemo(() => {
    let result = [...activities];

    if (activeTab === 'open') result = result.filter(a => a.type === 'open' || a.type === 'assignment');
    else if (activeTab === 'closed') result = result.filter(a => a.type === 'closed' || a.type === 'quiz');
    else if (activeTab === 'mixed') result = result.filter(a => a.type === 'mixed' || a.type === 'project');
    else if (activeTab === 'drafts') result = result.filter(a => a.status === 'draft');
    else if (activeTab === 'favorites') result = result.filter(a => a.is_favorite);
    else if (activeTab === 'archived') result = result.filter(a => a.status === 'archived');

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title?.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.instructions?.toLowerCase().includes(query)
      );
    }

    if (filters.type.length > 0) result = result.filter(a => filters.type.includes(a.type));
    if (filters.status.length > 0) result = result.filter(a => filters.status.includes(a.status));

    result.sort((a, b) => {
      switch (sortBy) {
        case 'created_desc': return new Date(b.created_at) - new Date(a.created_at);
        case 'created_asc': return new Date(a.created_at) - new Date(b.created_at);
        case 'name_asc': return a.title.localeCompare(b.title);
        case 'name_desc': return b.title.localeCompare(a.title);
        case 'most_used': return b.timesUsed - a.timesUsed;
        case 'highest_score': return b.max_score - a.max_score;
        default: return 0;
      }
    });

    return result;
  }, [activities, activeTab, searchQuery, filters, sortBy]);

  const handleSelectActivity = (activityId) => {
    setSelectedActivities(prev =>
      prev.includes(activityId) ? prev.filter(id => id !== activityId) : [...prev, activityId]
    );
  };

  const handleEdit = (activity) => navigate(`/teacher/activities/${activity.id}/edit`);

  const handleDuplicate = async (activity) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          ...activity,
          id: undefined,
          title: `${activity.title} - Cópia`,
          status: 'draft',
          created_at: undefined,
          updated_at: undefined
        })
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Atividade duplicada com sucesso!' });
      loadActivities();
      navigate(`/teacher/activities/${data.id}/edit`);
    } catch (error) {
      console.error('Erro ao duplicar:', error);
      toast({ title: 'Erro', description: 'Não foi possível duplicar a atividade.', variant: 'destructive' });
    }
  };

  const handleToggleFavorite = async (activityId) => {
    try {
      const activity = activities.find(a => a.id === activityId);
      const { error } = await supabase
        .from('activities')
        .update({ is_favorite: !activity.is_favorite })
        .eq('id', activityId);
      if (error) throw error;
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_favorite: !a.is_favorite } : a));
      toast({ title: activity.is_favorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos' });
    } catch (error) {
      console.error('Erro ao favoritar:', error);
    }
  };

  const handleArchive = async (activityId) => {
    try {
      const { error } = await supabase.from('activities').update({ status: 'archived' }).eq('id', activityId);
      if (error) throw error;
      toast({ title: 'Atividade arquivada' });
      loadActivities();
    } catch (error) {
      console.error('Erro ao arquivar:', error);
    }
  };

  const handleDelete = async (activityId) => {
    try {
      const { error } = await supabase.from('activities').update({ deleted_at: new Date().toISOString() }).eq('id', activityId);
      if (error) throw error;
      toast({ title: 'Atividade excluída' });
      setShowDeleteModal(false);
      loadActivities();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleClearFilters = () => {
    setFilters({ type: [], status: [] });
    setSearchQuery('');
  };

  const getActivityTypeBadge = (type) => {
    const types = {
      open: 'Aberta', assignment: 'Aberta',
      closed: 'Fechada', quiz: 'Fechada',
      mixed: 'Mista', project: 'Mista'
    };
    return types[type] || 'Aberta';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando banco de atividades..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="mb-8">
        <DashboardHeader title="Banco de Atividades" subtitle="Crie, organize e reutilize suas atividades" role="teacher" />
        <div className="flex flex-wrap gap-3 mt-4">
          <Button size="lg" onClick={() => navigate('/teacher/activities/create')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
            <Plus className="w-5 h-5 mr-2" />Nova Atividade
          </Button>
          <Button variant="outline" size="lg"><Upload className="w-5 h-5 mr-2" />Importar</Button>
          <Button variant="outline" size="lg"><Globe className="w-5 h-5 mr-2" />Banco Público</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Total" value={stats.total} icon={ClipboardList} gradient={gradients.primary} bgColor="bg-blue-50" />
        <StatsCard title="Por Tipo" value={`${stats.byType.open}/${stats.byType.closed}/${stats.byType.mixed}`}
          icon={Grid3x3} gradient={gradients.success} bgColor="bg-emerald-50" subtitle="Abertas/Fechadas/Mistas" />
        <StatsCard title="Mais Usada" value={stats.mostUsed?.timesUsed || 0} icon={TrendingUp}
          gradient={gradients.warning} bgColor="bg-amber-50" subtitle={stats.mostUsed ? stats.mostUsed.title.substring(0, 20) + '...' : 'Nenhuma'} />
        <StatsCard title="Recentes" value={stats.recentCount} icon={Calendar} gradient={gradients.info} bgColor="bg-cyan-50" subtitle="Último mês" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="open">Abertas</TabsTrigger>
          <TabsTrigger value="closed">Fechadas</TabsTrigger>
          <TabsTrigger value="mixed">Mistas</TabsTrigger>
          <TabsTrigger value="drafts">Rascunhos</TabsTrigger>
          <TabsTrigger value="favorites"><Star className="w-4 h-4 mr-1" />Favoritas</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input placeholder="Buscar atividade..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_desc">Mais Recentes</SelectItem>
                  <SelectItem value="created_asc">Mais Antigas</SelectItem>
                  <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
                  <SelectItem value="most_used">Mais Usadas</SelectItem>
                  <SelectItem value="highest_score">Maior Pontuação</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                <List className="w-5 h-5" />
              </Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')}>
                <LayoutGrid className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />Filtros Avançados
              {showAdvancedFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
            </Button>
            {(searchQuery || filters.type.length > 0) && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}><X className="w-4 h-4 mr-2" />Limpar</Button>
            )}
          </div>
          {showAdvancedFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div><Label>Tipo</Label>
                <Select><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Abertas</SelectItem>
                    <SelectItem value="closed">Fechadas</SelectItem>
                    <SelectItem value="mixed">Mistas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Publicadas</SelectItem>
                    <SelectItem value="draft">Rascunhos</SelectItem>
                    <SelectItem value="archived">Arquivadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </div>
      </Card>

      {selectedActivities.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4">
          <span className="font-semibold">{selectedActivities.length} selecionada(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowPostModal(true)}>
              <Share2 className="w-4 h-4 mr-2" />Postar
            </Button>
            <Button size="sm" variant="secondary"><Download className="w-4 h-4 mr-2" />Exportar</Button>
            <Button size="sm" variant="secondary"><Archive className="w-4 h-4 mr-2" />Arquivar</Button>
            <Button size="sm" variant="destructive" onClick={() => setSelectedActivities([])}><X className="w-4 h-4" /></Button>
          </div>
        </motion.div>
      )}

      {filteredActivities.length > 0 ? (
        <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4')}>
          {filteredActivities.map((activity, index) => (
            <motion.div key={activity.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              {viewMode === 'list' ? (
                <ActivityListItem activity={activity} selected={selectedActivities.includes(activity.id)}
                  onSelect={handleSelectActivity} onEdit={handleEdit} onDuplicate={handleDuplicate}
                  onToggleFavorite={handleToggleFavorite} onArchive={handleArchive}
                  onDelete={() => { setCurrentActivity(activity); setShowDeleteModal(true); }}
                  onExpand={() => setExpandedActivityId(expandedActivityId === activity.id ? null : activity.id)}
                  isExpanded={expandedActivityId === activity.id} getTypeBadge={getActivityTypeBadge} />
              ) : (
                <ActivityGridCard activity={activity} onEdit={handleEdit} onToggleFavorite={handleToggleFavorite}
                  getTypeBadge={getActivityTypeBadge} navigate={navigate} />
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title={searchQuery ? 'Nenhuma atividade encontrada' : 'Você ainda não criou nenhuma atividade'}
          description={searchQuery ? 'Tente ajustar os filtros.' : 'Comece criando sua primeira atividade.'}
          actionLabel="Criar Primeira Atividade" actionIcon={Plus} action={() => navigate('/teacher/activities/create')} />
      )}

      {filteredActivities.length > 0 && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} className="fixed bottom-8 right-8 z-40">
          <Button size="lg" onClick={() => navigate('/teacher/activities/create')}
            className="w-16 h-16 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-blue-700">
            <Plus className="w-8 h-8" />
          </Button>
        </motion.div>
      )}

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Atividade</DialogTitle>
            <DialogDescription>
              {currentActivity?.timesUsed > 0 ? (
                <div className="space-y-2">
                  <p className="text-yellow-600 font-semibold">⚠️ Atenção!</p>
                  <p>Esta atividade foi usada {currentActivity.timesUsed} vez(es).</p>
                  <p>As submissões existentes não serão afetadas.</p>
                </div>
              ) : (
                <p>Tem certeza? Esta ação não pode ser desfeita.</p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => handleDelete(currentActivity?.id)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showPostModal && (
        <PostActivityModal
          activities={selectedActivities.map(id => activities.find(a => a.id === id))}
          classes={classes}
          onClose={() => setShowPostModal(false)}
          onSuccess={() => { setShowPostModal(false); loadActivities(); setSelectedActivities([]); }}
        />
      )}
    </div>
  );
};

export default TeacherActivitiesPage;
