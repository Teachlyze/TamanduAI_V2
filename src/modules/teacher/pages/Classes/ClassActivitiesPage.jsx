import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DashboardHeader,
  StatsCard,
  SearchInput,
  ActivityCard,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { ClassService } from '@/shared/services/classService';

const ClassActivitiesPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, closed: 0 });

  useEffect(() => {
    loadData();
  }, [classId]);

  useEffect(() => {
    applySearch();
  }, [activities, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load class
      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);

      // Load activities for this class
      const { data: activitiesData, error } = await supabase
        .from('activity_class_assignments')
        .select(`
          activity_id,
          activity:activities(*)
        `)
        .eq('class_id', classId);

      if (error) throw error;

      const acts = activitiesData?.map(a => a.activity).filter(Boolean) || [];
      setActivities(acts);

      // Calculate stats
      const activeCount = acts.filter(a => a.status === 'active').length;
      const closedCount = acts.filter(a => a.status === 'closed').length;

      setStats({
        total: acts.length,
        active: activeCount,
        closed: closedCount
      });

    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    } finally {
      setLoading(false);
    }
  };

  const applySearch = () => {
    if (!searchQuery) {
      setFilteredActivities(activities);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = activities.filter(activity =>
      activity.title?.toLowerCase().includes(query) ||
      activity.description?.toLowerCase().includes(query)
    );
    setFilteredActivities(filtered);
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
      <Button
        variant="ghost"
        onClick={() => navigate(`/teacher/classes/${classId}`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Turma
      </Button>

      <DashboardHeader
        title={`Atividades - ${classData?.name || 'Turma'}`}
        subtitle={classData?.subject || 'Sem matéria'}
        role="teacher"
      />

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
          icon={FileText}
          gradient={gradients.success}
          bgColor="bg-green-50 dark:bg-green-950/30"
          delay={0.1}
        />
        <StatsCard
          title="Encerradas"
          value={stats.closed}
          icon={FileText}
          gradient="from-slate-500 to-slate-600"
          bgColor="bg-slate-50 dark:bg-slate-950/30"
          delay={0.2}
        />
      </div>

      <div className="flex gap-4 mb-8">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar atividade..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        <Button
          onClick={() => navigate(`/teacher/activities/new?classId=${classId}`)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      {filteredActivities.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredActivities.map((activity, index) => (
            <ActivityCard
              key={activity.id}
              id={activity.id}
              title={activity.title}
              className={classData?.name}
              dueDate={activity.due_date}
              status={activity.status || 'draft'}
              submissionCount={0}
              totalStudents={0}
              priority="normal"
              delay={index * 0.05}
              onClick={() => navigate(`/teacher/activities/${activity.id}/submissions`)}
              actionLabel="Ver Submissões"
              onAction={() => navigate(`/teacher/activities/${activity.id}/submissions`)}
            />
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={FileText}
          title={searchQuery ? 'Nenhuma atividade encontrada' : 'Nenhuma atividade nesta turma'}
          description={searchQuery ? 'Tente outro termo.' : 'Crie a primeira atividade para esta turma.'}
          actionLabel="Criar Atividade"
          actionIcon={Plus}
          action={() => navigate(`/teacher/activities/new?classId=${classId}`)}
        />
      )}
    </div>
  );
};

export default ClassActivitiesPage;
