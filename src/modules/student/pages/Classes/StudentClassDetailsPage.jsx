import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Calendar, Users, MessageSquare, Download, BookOpen, Clock } from 'lucide-react';
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
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('feed');

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
            full_name,
            avatar_url
          )
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(10);

      setDiscussions(discs || []);

      // Get materials from class_materials join table
      const { data: mats } = await supabase
        .from('class_materials')
        .select(`
          id,
          title,
          description,
          file_url,
          file_type,
          created_at,
          created_by,
          uploader:profiles!class_materials_created_by_fkey ( id, full_name )
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      setMaterials(mats || []);

      // Get members (students + teachers) from class_members and profiles
      const { data: memberData } = await supabase
        .from('class_members')
        .select(`
          id,
          role,
          created_at,
          profile:profiles!class_members_user_id_fkey (
            id,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('class_id', classId)
        .order('role', { ascending: true });

      setMembers(memberData || []);

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const materialsMapped = useMemo(() => {
    return materials.map((material) => ({
      ...material,
      createdAtFormatted: material.created_at
        ? new Date(material.created_at).toLocaleDateString('pt-BR')
        : null,
      uploaderName: material.uploader?.full_name || 'Professor'
    }));
  }, [materials]);

  const membersGrouped = useMemo(() => {
    if (!members.length) return { teachers: [], students: [] };
    const teachers = members.filter((member) => member.role === 'teacher');
    const students = members.filter((member) => member.role === 'student');
    return { teachers, students };
  }, [members]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header Grande com Banner */}
      <div className="relative h-64 bg-gradient-to-r from-blue-600 to-cyan-500 overflow-hidden">
        {/* Pattern de fundo */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        
        {/* Conteúdo do Header */}
        <div className="relative z-10 container mx-auto px-6 h-full flex flex-col justify-between py-6">
          {/* Botão Voltar */}
          <Button
            variant="ghost"
            onClick={() => navigate('/students/classes')}
            className="self-start text-white hover:bg-white/20 border-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Turmas
          </Button>

          {/* Informações da Turma */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  {classData?.name || 'Carregando...'}
                </h1>
                <p className="text-lg text-white/90">
                  {classData?.subject || 'Disciplina'}
                </p>
              </div>
            </div>
            {classData?.description && (
              <p className="text-white/80 max-w-2xl mt-3">
                {classData.description}
              </p>
            )}
          </motion.div>
        </div>

        {/* Decorações */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-cyan-300/10 rounded-full blur-3xl" />
      </div>

      {/* Conteúdo com Tabs */}
      <div className="container mx-auto px-6 -mt-8 relative z-20">

        {/* Tabs com novo design */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <Card className="mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
            <TabsList className="w-full grid grid-cols-4 p-2 bg-transparent">
              <TabsTrigger 
                value="feed" 
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:bg-blue-950/30 dark:data-[state=active]:text-blue-400 rounded-t-lg"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Mural
              </TabsTrigger>
              <TabsTrigger 
                value="activities" 
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:bg-blue-950/30 dark:data-[state=active]:text-blue-400 rounded-t-lg"
              >
                <FileText className="w-4 h-4 mr-2" />
                Atividades
              </TabsTrigger>
              <TabsTrigger 
                value="materials" 
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:bg-blue-950/30 dark:data-[state=active]:text-blue-400 rounded-t-lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Materiais
              </TabsTrigger>
              <TabsTrigger 
                value="members" 
                className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:bg-blue-950/30 dark:data-[state=active]:text-blue-400 rounded-t-lg"
              >
                <Users className="w-4 h-4 mr-2" />
                Membros
              </TabsTrigger>
            </TabsList>
          </Card>

        {/* Feed Tab */}
        <TabsContent value="feed">
          <div className="space-y-4">
            {discussions.length > 0 ? (
              discussions.map(disc => (
                <motion.div
                  key={disc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {disc.author?.full_name?.[0]?.toUpperCase() || 'A'}
                      </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-slate-900 dark:text-white">{disc.author?.full_name || 'Autor'}</span>
                        {disc.type && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {disc.type}
                          </Badge>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(disc.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">{disc.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{disc.content}</p>
                    </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <Card className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
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
                onClick={() => navigate(`/students/activities/${activity.id}`)}
                className="p-6 cursor-pointer hover:shadow-xl transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <div className="flex items-start justify-between mb-4">
                  <FileText className="w-8 h-8 text-sky-600" />
                  <Badge className={
                    activity.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : activity.status === 'closed'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
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
            {activities.length === 0 && (
              <Card className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600">Nenhuma atividade vinculada ainda</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials">
          <div className="space-y-4">
            {materialsMapped.map(material => (
              <Card key={material.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{material.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{material.description}</p>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {material.createdAtFormatted && `Publicado em ${material.createdAtFormatted}`} · Por {material.uploaderName}
                      </div>
                    </div>
                  </div>
                  {material.file_url ? (
                    <Button asChild variant="outline" size="sm" className="border-slate-300 dark:border-slate-700">
                      <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                        Baixar
                      </a>
                    </Button>
                  ) : (
                    <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">Arquivo indisponível</Badge>
                  )}
                </div>
              </Card>
            ))}
            {materialsMapped.length === 0 && (
              <Card className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Download className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600">Nenhum material publicado nesta turma ainda.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <div className="space-y-6">
            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Professores ({membersGrouped.teachers.length})
              </h3>
              {membersGrouped.teachers.length > 0 ? (
                <div className="space-y-3">
                  {membersGrouped.teachers.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                        {member.profile?.full_name?.[0]?.toUpperCase() || 'P'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">{member.profile?.full_name || 'Professor(a)'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{member.profile?.email}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex-shrink-0">Professor</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum professor listado.</p>
              )}
            </Card>

            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Colegas de turma ({membersGrouped.students.length})
              </h3>
              {membersGrouped.students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {membersGrouped.students.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                        {member.profile?.full_name?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{member.profile?.full_name || 'Colega'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.profile?.email}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Desde {new Date(member.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum colega listado no momento.</p>
              )}
            </Card>
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentClassDetailsPage;
