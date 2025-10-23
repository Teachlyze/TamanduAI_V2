import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { DashboardHeader } from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { ClassService } from '@/shared/services/classService';

const StudentClassDetailsPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get class info
      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);

      // Get activities for this class
      const { data: acts } = await supabase
        .from('activity_class_assignments')
        .select(`
          activity_id,
          activity:activities (
            id,
            title,
            description,
            due_date,
            max_score,
            type,
            status
          )
        `)
        .eq('class_id', classId);

      const activitiesList = acts?.map(a => a.activity).filter(Boolean) || [];
      setActivities(activitiesList);

      // Get discussions (from discussions table)
      const { data: discs } = await supabase
        .from('discussions')
        .select(`
          id,
          title,
          content,
          type,
          created_at,
          created_by,
          author:profiles!discussions_created_by_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(10);

      setDiscussions(discs || []);

      // Get materials
      const { data: mats } = await supabase
        .from('materials')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      setMaterials(mats || []);

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
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
      <Button
        variant="ghost"
        onClick={() => navigate('/student/classes')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <DashboardHeader
        title={classData?.name || 'Turma'}
        subtitle={classData?.subject || 'Sem matéria'}
        role="student"
      />

      {/* Tabs */}
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="feed">Mural</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
          <TabsTrigger value="materials">Materiais</TabsTrigger>
        </TabsList>

        {/* Feed Tab */}
        <TabsContent value="feed">
          <div className="space-y-4">
            {discussions.length > 0 ? (
              discussions.map(disc => (
                <Card key={disc.id} className="p-6 bg-white dark:bg-slate-900">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      {disc.author?.name?.[0] || 'A'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">{disc.author?.name}</span>
                        <Badge>{disc.type}</Badge>
                        <span className="text-xs text-slate-600">
                          {new Date(disc.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <h3 className="font-bold mb-2">{disc.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400">{disc.content}</p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600">Nenhuma publicação no mural ainda</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map(activity => (
              <Card
                key={activity.id}
                onClick={() => navigate(`/student/activities/${activity.id}`)}
                className="p-6 cursor-pointer hover:shadow-lg transition-all bg-white dark:bg-slate-900"
              >
                <div className="flex items-start justify-between mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <Badge className={
                    activity.status === 'active' ? 'bg-green-100 text-green-700' :
                    activity.status === 'closed' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }>
                    {activity.status === 'active' ? 'Ativa' :
                     activity.status === 'closed' ? 'Encerrada' : 'Rascunho'}
                  </Badge>
                </div>
                <h3 className="font-bold mb-2">{activity.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                  {activity.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    📅 {activity.due_date ? new Date(activity.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                  </span>
                  <span className="font-semibold text-blue-600">
                    {activity.max_score} pts
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <div className="space-y-4">
            {materials.map(material => (
              <Card key={material.id} className="p-6 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      📎
                    </div>
                    <div>
                      <h3 className="font-semibold">{material.title}</h3>
                      <p className="text-sm text-slate-600">{material.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Download</Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentClassDetailsPage;
