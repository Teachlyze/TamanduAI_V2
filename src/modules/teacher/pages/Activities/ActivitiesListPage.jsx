import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DashboardHeader,
  StatsCard,
  SearchInput,
  FilterBar,
  ActivityCard,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const ActivitiesListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: null,
    classId: null,
    type: null
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    closed: 0
  });
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    loadActivities();
  }, [user]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [activities, searchQuery, filters]);

  const loadActivities = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load activities with class assignments
      const { data: activitiesData, error } = await supabase
        .from('activities')
        .select(`
          *,
          assignments:activity_class_assignments(
            class:classes(id, name)
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActivities(activitiesData || []);

      // Calculate stats
      const activeCount = activitiesData?.filter(a => a.status === 'active').length || 0;
      const closedCount = activitiesData?.filter(a => a.status === 'closed').length || 0;

      setStats({
        total: activitiesData?.length || 0,
        active: activeCount,
        closed: closedCount
      });

      // Get unique classes
      const uniqueClasses = new Map();
      activitiesData?.forEach(activity => {
        activity.assignments?.forEach(assignment => {
          if (assignment.class) {
            uniqueClasses.set(assignment.class.id, assignment.class);
          }
        });
      });
      setClasses(Array.from(uniqueClasses.values()));

    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...activities];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(activity =>
        activity.title?.toLowerCase().includes(query) ||
        activity.description?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filters.status) {
      result = result.filter(a => a.status === filters.status);
    }

    // Filter by class
    if (filters.classId) {
      result = result.filter(a =>
        a.assignments?.some(assignment => assignment.class?.id === filters.classId)
      );
    }

    // Filter by type
    if (filters.type) {
      result = result.filter(a => a.type === filters.type);
    }

    setFilteredActivities(result);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ status: null, classId: null, type: null });
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando atividades..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader
        title="Minhas Atividades"
        subtitle={`${stats.total} atividade${stats.total !== 1 ? 's' : ''} criada${stats.total !== 1 ? 's' : ''}`}
        role="teacher"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total de Atividades"
          value={stats.total}
          icon={FileText}
          gradient={gradients.stats.activities}
          bgColor="bg-emerald-50 dark:bg-emerald-950/30"
          delay={0}
        />
        <StatsCard
          title="Ativas"
          value={stats.active}
          icon={CheckCircle2}
          gradient={gradients.success}
          bgColor="bg-green-50 dark:bg-green-950/30"
          delay={0.1}
        />
        <StatsCard
          title="Encerradas"
          value={stats.closed}
          icon={XCircle}
          gradient="from-slate-500 to-slate-600"
          bgColor="bg-slate-50 dark:bg-slate-950/30"
          delay={0.2}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar por título ou descrição..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        
        <FilterBar
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'active', label: 'Ativas' },
                { value: 'draft', label: 'Rascunho' },
                { value: 'closed', label: 'Encerradas' }
              ]
            },
            {
              key: 'type',
              label: 'Tipo',
              options: [
                { value: 'assignment', label: 'Tarefa' },
                { value: 'quiz', label: 'Quiz' },
                { value: 'project', label: 'Projeto' }
              ]
            },
            ...(classes.length > 0 ? [{
              key: 'classId',
              label: 'Turma',
              options: classes.map(c => ({ value: c.id, label: c.name }))
            }] : [])
          ]}
          activeFilters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearFilters}
        />
      </div>

      {/* Activities Grid */}
      {filteredActivities.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20"
        >
          {filteredActivities.map((activity, index) => {
            const className = activity.assignments?.[0]?.class?.name || 'Sem turma';
            
            return (
              <ActivityCard
                key={activity.id}
                id={activity.id}
                title={activity.title}
                className={className}
                dueDate={activity.due_date}
                status={activity.status || 'draft'}
                submissionCount={0}
                totalStudents={0}
                priority="normal"
                delay={index * 0.05}
                onClick={() => navigate(`/teacher/activities/${activity.id}`)}
                actionLabel="Ver Detalhes"
                onAction={() => navigate(`/teacher/activities/${activity.id}`)}
              />
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          icon={FileText}
          title={searchQuery || filters.status ? 'Nenhuma atividade encontrada' : 'Você ainda não criou nenhuma atividade'}
          description={
            searchQuery || filters.status
              ? 'Tente ajustar os filtros ou buscar por outro termo.'
              : 'Crie sua primeira atividade para começar a avaliar seus alunos.'
          }
          actionLabel="Criar Primeira Atividade"
          actionIcon={Plus}
          action={() => navigate('/dashboard/activities/create')}
        />
      )}

      {/* FAB */}
      {filteredActivities.length > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <Button
            onClick={() => navigate('/dashboard/activities/create')}
            className="w-16 h-16 rounded-full shadow-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
          >
            <Plus className="w-8 h-8" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default ActivitiesListPage;
