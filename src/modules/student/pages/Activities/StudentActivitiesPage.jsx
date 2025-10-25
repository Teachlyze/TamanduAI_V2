import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
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
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    late: 0
  });

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
        .select('class_id')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

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

  const ActivityCard = ({ activity }) => {
    const status = getActivityStatus(activity);
    
    return (
      <Card
        onClick={() => navigate(`/student/activities/${activity.id}`)}
        className="p-6 cursor-pointer hover:shadow-lg transition-all bg-white dark:bg-slate-900"
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: activity.class?.color || '#3B82F6' }}
          >
            <FileText className="w-5 h-5 text-white" />
          </div>
          <Badge className={status.color}>{status.label}</Badge>
        </div>

        <h3 className="font-bold mb-2">{activity.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {activity.class?.name} • {activity.class?.subject}
        </p>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            {activity.due_date ? (
              <>
                <Clock className="w-4 h-4 inline mr-1" />
                {new Date(activity.due_date).toLocaleDateString('pt-BR')}
              </>
            ) : (
              'Sem prazo'
            )}
          </span>
          <span className="font-semibold text-blue-600">
            {activity.max_score} pts
          </span>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader
        title="Minhas Atividades"
        subtitle="Gerencie suas tarefas e entregas"
        role="student"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Pendentes"
          value={stats.pending}
          icon={Clock}
          gradient="from-amber-500 to-orange-500"
          delay={0}
        />
        <StatsCard
          title="Concluídas"
          value={stats.completed}
          icon={CheckCircle}
          gradient="from-green-500 to-emerald-500"
          delay={0.1}
        />
        <StatsCard
          title="Atrasadas"
          value={stats.late}
          icon={AlertCircle}
          gradient="from-red-500 to-rose-500"
          delay={0.2}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">Todas ({activities.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({stats.pending})</TabsTrigger>
          <TabsTrigger value="completed">Concluídas ({stats.completed})</TabsTrigger>
          <TabsTrigger value="late">Atrasadas ({stats.late})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
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
