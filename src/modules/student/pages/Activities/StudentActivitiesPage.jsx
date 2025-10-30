import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle, AlertCircle, PlayCircle, Eye, Filter, ArrowUpDown } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import {
  DashboardHeader,
  StatsCard,
  FilterBar,
  EmptyState
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const StudentActivitiesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    late: 0
  });
  
  // Filtros
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('deadline-asc');

  useEffect(() => {
    if (user?.id) {
      loadActivities();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadActivities = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get student's classes
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id, class:classes(id, name, subject, color)')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];
      setClasses(memberships?.map(m => m.class).filter(Boolean) || []);

      if (classIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get activities from these classes
      const { data: assignments } = await supabase
        .from('activity_class_assignments')
        .select(`
          activity_id,
          class_id,
          class:classes (id, name, subject, color),
          activity:activities (
            id,
            title,
            description,
            due_date,
            max_score,
            type,
            status,
            created_at
          )
        `)
        .in('class_id', classIds);

      const activitiesList = (assignments || [])
        .map(a => ({
          ...a.activity,
          class: a.class
        }))
        .filter(Boolean);

      setActivities(activitiesList);

      // Get student's submissions
      const activityIds = activitiesList.map(a => a.id);
      
      const { data: subs } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', user.id)
        .in('activity_id', activityIds);

      setSubmissions(subs || []);

      // Calculate stats
      const now = new Date();
      let pending = 0, completed = 0, late = 0;

      activitiesList.forEach(activity => {
        const submission = subs?.find(s => s.activity_id === activity.id);
        
        if (submission) {
          if (submission.grade !== null) {
            completed++;
          }
        } else {
          if (activity.due_date && new Date(activity.due_date) < now) {
            late++;
          } else {
            pending++;
          }
        }
      });

      setStats({ pending, completed, late });

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityStatus = (activity) => {
    const submission = submissions.find(s => s.activity_id === activity.id);
    const now = new Date();
    const dueDate = activity.due_date ? new Date(activity.due_date) : null;

    if (submission) {
      if (submission.grade !== null) {
        return { status: 'completed', label: 'Concluída', color: 'bg-green-100 text-green-700' };
      }
      return { status: 'submitted', label: 'Enviada', color: 'bg-blue-100 text-blue-700' };
    }

    if (dueDate && dueDate < now) {
      return { status: 'late', label: 'Atrasada', color: 'bg-red-100 text-red-700' };
    }

    return { status: 'pending', label: 'Pendente', color: 'bg-amber-100 text-amber-700' };
  };

  const filterActivities = (status) => {
    return activities.filter(activity => {
      const actStatus = getActivityStatus(activity);
      return actStatus.status === status;
    });
  };

  // Filtros avançados e ordenação
  const filteredAndSortedActivities = useMemo(() => {
    let filtered = [...activities];

    // Filtro por período
    if (selectedPeriod !== 'all') {
      const now = new Date();
      const periods = {
        '7days': 7,
        '30days': 30,
        'thisMonth': new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      };

      if (periods[selectedPeriod]) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + periods[selectedPeriod]);
        filtered = filtered.filter(a => {
          if (!a.due_date) return false;
          const dueDate = new Date(a.due_date);
          return dueDate >= now && dueDate <= futureDate;
        });
      }
    }

    // Filtro por turma
    if (selectedClass !== 'all') {
      filtered = filtered.filter(a => a.class?.id === selectedClass);
    }

    // Filtro por status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(a => {
        const status = getActivityStatus(a);
        return status.status === selectedStatus;
      });
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'deadline-asc':
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        case 'deadline-desc':
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(b.due_date) - new Date(a.due_date);
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'score-high':
          return (b.max_score || 0) - (a.max_score || 0);
        case 'score-low':
          return (a.max_score || 0) - (b.max_score || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [activities, selectedPeriod, selectedClass, selectedStatus, sortBy, submissions]);

  const ActivityCard = ({ activity }) => {
    const status = getActivityStatus(activity);
    const submission = submissions.find(s => s.activity_id === activity.id);
    const now = new Date();
    const dueDate = activity.due_date ? new Date(activity.due_date) : null;
    const isUrgent = dueDate && (dueDate - now) / (1000 * 60 * 60 * 24) < 3 && status.status === 'pending';
    
    const getButtonConfig = () => {
      if (submission?.grade !== null) {
        return { text: 'Ver Correção', icon: Eye, variant: 'outline', disabled: false };
      }
      if (submission?.status === 'submitted') {
        return { text: 'Aguardando Correção', icon: Clock, variant: 'outline', disabled: true };
      }
      if (submission?.status === 'draft') {
        return { text: 'Continuar Rascunho', icon: PlayCircle, variant: 'default', disabled: false };
      }
      return { text: 'Iniciar', icon: PlayCircle, variant: 'default', disabled: false };
    };

    const buttonConfig = getButtonConfig();
    const ButtonIcon = buttonConfig.icon;
    
    return (
      <Card
        className="p-4 hover:shadow-lg transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                {activity.title}
              </h3>
              {isUrgent && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs">
                  Urgente!
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {activity.class?.name} • {activity.class?.subject}
            </p>
          </div>
          <Badge className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${status.color}`}>
            {status.label}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {activity.due_date ? (
              <span className={isUrgent ? 'text-red-600 font-semibold' : ''}>
                {new Date(activity.due_date).toLocaleDateString('pt-BR')}
              </span>
            ) : (
              'Sem prazo'
            )}
          </span>
          <span className="font-semibold text-blue-600">
            {activity.max_score} pts
          </span>
        </div>

        {submission?.grade !== null && (
          <div className="mb-3 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-sm font-semibold text-green-700 dark:text-green-300">
              Nota: {submission.grade}/{activity.max_score}
            </div>
          </div>
        )}

        <Button
          onClick={() => navigate(`/student/activities/${activity.id}`)}
          variant={buttonConfig.variant}
          disabled={buttonConfig.disabled}
          className="w-full"
        >
          <ButtonIcon className="w-4 h-4 mr-2" />
          {buttonConfig.text}
        </Button>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <DashboardHeader
        title="Minhas Atividades"
        subtitle="Gerencie suas tarefas e entregas"
        role="student"
      />

      {/* Barra de Filtros */}
      <Card className="p-4 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-900 dark:text-white">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Filtro por Período */}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Período</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="7days">Próximos 7 dias</SelectItem>
                <SelectItem value="30days">Próximos 30 dias</SelectItem>
                <SelectItem value="thisMonth">Este mês</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Turma */}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Turma</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
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
          </div>

          {/* Filtro por Status */}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Não iniciadas</SelectItem>
                <SelectItem value="submitted">Enviadas</SelectItem>
                <SelectItem value="completed">Corrigidas</SelectItem>
                <SelectItem value="late">Atrasadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ordenação */}
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Ordenar por</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline-asc">Prazo mais próximo</SelectItem>
                <SelectItem value="deadline-desc">Prazo mais distante</SelectItem>
                <SelectItem value="newest">Recém adicionadas</SelectItem>
                <SelectItem value="score-high">Maior pontuação</SelectItem>
                <SelectItem value="score-low">Menor pontuação</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botão Limpar Filtros */}
        {(selectedPeriod !== 'all' || selectedClass !== 'all' || selectedStatus !== 'all' || sortBy !== 'deadline-asc') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPeriod('all');
              setSelectedClass('all');
              setSelectedStatus('all');
              setSortBy('deadline-asc');
            }}
            className="mt-4"
          >
            Limpar filtros
          </Button>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Pendentes"
          value={stats.pending}
          icon={Clock}
          gradient="from-sky-500 to-blue-600"
          delay={0}
        />
        <StatsCard
          title="Concluídas"
          value={stats.completed}
          icon={CheckCircle}
          gradient="from-cyan-500 to-slate-600"
          delay={0.1}
        />
        <StatsCard
          title="Atrasadas"
          value={stats.late}
          icon={AlertCircle}
          gradient="from-slate-600 to-slate-800"
          delay={0.2}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">Todas ({activities.length})</TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">Pendentes ({stats.pending})</TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">Concluídas ({stats.completed})</TabsTrigger>
          <TabsTrigger value="late" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white">Atrasadas ({stats.late})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {filteredAndSortedActivities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedActivities.map(activity => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center bg-white dark:bg-slate-900">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600 dark:text-slate-400 mb-4">Nenhuma atividade encontrada com esses filtros</p>
              <Button variant="outline" onClick={() => {
                setSelectedPeriod('all');
                setSelectedClass('all');
                setSelectedStatus('all');
              }}>
                Limpar filtros
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterActivities('pending').map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterActivities('completed').map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="late">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterActivities('late').map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {activities.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Nenhuma atividade encontrada"
          description="Entre em uma turma para ver atividades"
        />
      )}
    </div>
  );
};

export default StudentActivitiesPage;
