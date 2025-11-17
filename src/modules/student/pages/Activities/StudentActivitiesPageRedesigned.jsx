import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';
import { ActivityCard, EmptyState } from '@/modules/student/components/redesigned';
import { FileText, Search, Filter, Clock, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { differenceInHours } from 'date-fns';

const StudentActivitiesPageRedesigned = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    late: 0,
    urgent: 0
  });

  useEffect(() => {
    if (user?.id) {
      loadActivities();
      loadClasses();
    }
  }, [user]);

  useEffect(() => {
    filterActivities();
  }, [activities, activeTab, searchQuery, selectedClass, selectedType]);

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

  const loadActivities = async () => {
    try {
      setLoading(true);

      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      if (classIds.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      // Buscar assignments
      const { data: assignments } = await supabase
        .from('activity_class_assignments')
        .select('activity_id, class_id, assigned_at')
        .in('class_id', classIds);

      const activityIds = assignments?.map(a => a.activity_id).filter(Boolean) || [];

      // Buscar atividades
      const { data: activities } = await supabase
        .from('activities')
        .select('id, title, description, type, due_date, max_score, created_at')
        .in('id', activityIds);

      // Buscar classes
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, subject, color')
        .in('id', classIds);

      const activitiesMap = {};
      activities?.forEach(a => { activitiesMap[a.id] = a; });

      const classesMap = {};
      classes?.forEach(c => { classesMap[c.id] = c; });

      // Buscar submissões
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('activity_id, status, grade, feedback, submitted_at')
        .eq('student_id', user.id)
        .in('activity_id', activityIds);

      if (submissionsError) {
        logger.error('Erro ao buscar submissões:', submissionsError);
      }

      logger.debug('[Activities] Submissões encontradas:', {
        userId: user.id,
        totalActivities: activityIds.length,
        submissions: submissions?.length || 0,
        submissionsData: submissions
      });

      const submissionsMap = {};
      submissions?.forEach(s => {
        submissionsMap[s.activity_id] = s;
      });

      // Mapear atividades com status
      const activitiesWithStatus = (assignments || [])
        .filter(a => activitiesMap[a.activity_id])
        .map(a => {
          const activity = activitiesMap[a.activity_id];
          const classInfo = classesMap[a.class_id];
          const submission = submissionsMap[a.activity_id];
          const dueDate = new Date(activity.due_date);
          const now = new Date();
          const hoursLeft = differenceInHours(dueDate, now);

          let status = 'pending';
          if (submission) {
            status = submission.status === 'graded' ? 'completed' : 'submitted';
          } else if (dueDate < now) {
            status = 'late';
          }

          return {
            ...activity,
            class_id: a.class_id,
            class_name: classInfo?.name,
            class_subject: classInfo?.subject,
            class_color: classInfo?.color,
            status,
            grade: submission?.grade,
            feedback: submission?.feedback,
            submitted_at: submission?.submitted_at,
            assigned_at: a.assigned_at,
            is_urgent: hoursLeft <= 24 && hoursLeft >= 0 && status === 'pending'
          };
        });

      // Calcular stats
      const statsData = {
        total: activitiesWithStatus.length,
        pending: activitiesWithStatus.filter(a => a.status === 'pending').length,
        completed: activitiesWithStatus.filter(a => a.status === 'completed' || a.status === 'submitted').length,
        late: activitiesWithStatus.filter(a => a.status === 'late').length,
        urgent: activitiesWithStatus.filter(a => a.is_urgent).length
      };

      setStats(statsData);
      setActivities(activitiesWithStatus);
    } catch (error) {
      logger.error('Erro ao carregar atividades:', error);
    } finally {
      setLoading(false);
      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    // Filtro por tab
    if (activeTab === 'pending') {
      filtered = filtered.filter(a => a.status === 'pending' || a.status === 'late');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(a => a.status === 'completed' || a.status === 'submitted');
    } else if (activeTab === 'late') {
      filtered = filtered.filter(a => a.status === 'late');
    }

    // Filtro por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.class_name?.toLowerCase().includes(query)
      );
    }

    // Filtro por turma
    if (selectedClass !== 'all') {
      filtered = filtered.filter(a => a.class_id === selectedClass);
    }

    // Filtro por tipo
    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    // Ordenar por prazo
    filtered.sort((a, b) => {
      if (a.status === 'late' && b.status !== 'late') return -1;
      if (a.status !== 'late' && b.status === 'late') return 1;
      if (a.is_urgent && !b.is_urgent) return -1;
      if (!a.is_urgent && b.is_urgent) return 1;
      return new Date(a.due_date) - new Date(b.due_date);
    });

    setFilteredActivities(filtered);
  };

  // Separar urgentes
  const urgentActivities = filteredActivities.filter(a => a.is_urgent);
  const otherActivities = filteredActivities.filter(a => !a.is_urgent);

  if (loading && initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 sm:gap-3">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          Minhas Atividades
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Gerencie suas atividades e acompanhe seu progresso
        </p>
      </motion.div>

      {/* Tabs com Stats */}
      <Card className="p-3 sm:p-4 md:p-6 mb-6 sm:mb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full mb-4 sm:mb-6">
            <TabsTrigger value="all" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              Todas
              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium">
                {stats.total}
              </span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Clock className="w-4 h-4" />
              Pendentes
              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium">
                {stats.pending}
              </span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Concluídas
              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium">
                {stats.completed}
              </span>
            </TabsTrigger>
            <TabsTrigger value="late" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4" />
              Atrasadas
              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium">
                {stats.late}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Busca */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar atividades..."
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

            {/* Filtro por Tipo */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="objective">Objetiva</SelectItem>
                <SelectItem value="open">Aberta</SelectItem>
                <SelectItem value="mixed">Mista</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Tabs>
      </Card>

      {/* Seção Urgente */}
      {urgentActivities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <Card className="p-6 border-l-4 border-amber-500 bg-white dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Atividades Urgentes - Prazo nas próximas 24 horas
            </h2>
            <div className="space-y-4">
              {urgentActivities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onStart={() => navigate(`/students/activities/${activity.id}`)}
                  onView={() => navigate(`/students/activities/${activity.id}`)}
                  index={index}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Lista Principal */}
      {otherActivities.length > 0 ? (
        <div className="space-y-4">
          {otherActivities.map((activity, index) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onStart={() => navigate(`/students/activities/${activity.id}`)}
              onView={() => navigate(`/students/activities/${activity.id}`)}
              index={index}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={filteredActivities.length === 0 && urgentActivities.length === 0 ? CheckCircle2 : Search}
          title={
            filteredActivities.length === 0 && urgentActivities.length === 0
              ? activeTab === 'completed'
                ? 'Nenhuma atividade concluída'
                : 'Nenhuma atividade'
              : 'Nenhum resultado encontrado'
          }
          description={
            filteredActivities.length === 0 && urgentActivities.length === 0
              ? activeTab === 'completed'
                ? 'Comece a fazer suas atividades para vê-las aqui quando concluídas.'
                : 'Você não tem atividades nesta categoria no momento.'
              : 'Tente ajustar os filtros de busca para encontrar o que procura.'
          }
          variant={activeTab === 'completed' ? 'success' : 'default'}
        />
      )}
    </div>
  );
};

export default StudentActivitiesPageRedesigned;
