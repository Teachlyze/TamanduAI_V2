import { logger } from '@/shared/utils/logger';
import React, { useEffect, useMemo, useState, useCallback, startTransition } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Users, MessageSquare, BookOpen, Megaphone, RefreshCw, Clock, Badge as BadgeIcon, Archive } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { useToast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import ActivityCard from '@/shared/components/ui/ActivityCard';
import MaterialCard from '@/shared/components/ui/MaterialCard';
import ArchiveClassModal from '@/modules/student/components/ArchiveClassModal';
import useArchiveClass from '@/modules/student/hooks/useArchiveClass';

// Importar tabs separados
import FeedTab from './tabs/FeedTab';
import AnnouncementsTab from './tabs/AnnouncementsTab';
import LibraryTab from './tabs/LibraryTab';

const StudentClassDetailsPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classData, setClassData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [library, setLibrary] = useState([]);
  const [activities, setActivities] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('feed');
  const [useEdgeFunction, setUseEdgeFunction] = useState(true); // Toggle para usar edge function
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const { archiveClass, loading: archivingClass } = useArchiveClass();

  const loadData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (useEdgeFunction) {
        // Usar Edge Function com cache Redis
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-class-data-optimized`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ classId })
          }
        );

        if (!response.ok) throw new Error('Erro ao carregar dados');

        const result = await response.json();
        const data = result.data;

        logger.debug('[StudentClassDetailsPage] 📦 Dados recebidos da Edge Function:', {
          classInfo: data.classInfo,
          posts: data.posts?.length || 0,
          discussions: data.discussions?.length || 0,
          announcements: data.announcements?.length || 0,
          library: data.library?.length || 0,
          activities: data.activities?.length || 0,
          members: data.members?.length || 0,
          fullData: data
        });

        // Combinar posts e discussions (discussions são os "posts" do professor)
        const allPosts = [
          ...(data.posts || []),
          ...(data.discussions || []).map(d => ({
            ...d,
            title: d.title,
            description: d.description,
            creator: d.author,
            is_pinned: d.is_pinned,
            created_at: d.created_at
          }))
        ];

        logger.debug('[StudentClassDetailsPage] 📝 Posts combinados (materials + discussions):', allPosts.length);

        // Filtrar apenas atividades publicadas para alunos
        const publishedActivities = (data.activities || []).filter(act => act.status === 'published');
        
        logger.debug('[StudentClassDetailsPage] 🎯 Atividades filtradas:', {
          total: data.activities?.length || 0,
          published: publishedActivities.length,
          filtered: data.activities?.filter(a => a.status !== 'published').map(a => ({ title: a.title, status: a.status }))
        });

        setClassData(data.classInfo);
        setPosts(allPosts);
        setAnnouncements(data.announcements || []);
        setLibrary(data.library || []);
        setActivities(publishedActivities);
        setMembers(data.members || []);

        if (showRefresh && result.cached) {
          toast({ title: 'Dados atualizados', description: 'Cache atualizado com sucesso' });
        }
      } else {
        // Fallback: carregar direto do Supabase
        const [classInfo, materials, acts, memberData] = await Promise.all([
          supabase.from('classes').select('id, name, subject, description, color').eq('id', classId).single(),
          supabase
            .from('class_materials')
            .select(`
              id, title, description, file_url, file_type, file_size, category, tags, created_at,
              creator:profiles!class_materials_created_by_fkey(id, full_name, avatar_url)
            `)
            .eq('class_id', classId)
            .order('created_at', { ascending: false }),
          supabase
            .from('activity_class_assignments')
            .select('activity_id, activity:activities(id, title, description, due_date, max_score, type, status)')
            .eq('class_id', classId),
          supabase
            .from('class_members')
            .select('id, role, joined_at, profile:profiles!class_members_user_id_fkey(id, full_name, avatar_url, email)')
            .eq('class_id', classId)
            .order('role', { ascending: true })
        ]);

        setClassData(classInfo.data);
        
        const allMaterials = materials.data || [];
        setPosts(allMaterials.filter(m => !m.category || m.category === 'post'));
        setAnnouncements(allMaterials.filter(m => m.category === 'announcement'));
        setLibrary(allMaterials.filter(m => m.category && m.category !== 'post' && m.category !== 'announcement'));
        
        setActivities(acts.data?.map(a => a.activity).filter(Boolean) || []);
        setMembers(memberData.data || []);
      }
    } catch (error) {
      logger.error('Erro ao carregar dados:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da turma',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, useEdgeFunction, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header Moderno com Banner */}
      <div className="relative h-72 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 overflow-hidden shadow-2xl">
        {/* Pattern de fundo animado */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:30px_30px]" />
        </div>
        
        {/* Shapes decorativos */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-300/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
        
        {/* Conteúdo do Header */}
        <div className="relative z-10 container mx-auto px-4 md:px-6 h-full flex flex-col justify-between py-6">
          {/* Botões de Navegação */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate('/students/classes')}
                className="text-white hover:bg-white/20 border border-white/30 backdrop-blur-sm transition-all hover:scale-105 cursor-pointer relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                variant="ghost"
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="text-white hover:bg-white/20 border border-white/30 backdrop-blur-sm transition-all hover:scale-105 cursor-pointer relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowArchiveModal(true)}
                disabled={archivingClass}
                className="text-white hover:bg-white/20 border border-white/30 backdrop-blur-sm transition-all hover:scale-105 cursor-pointer relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                <Archive className="w-4 h-4 mr-2" />
                Arquivar
              </Button>
            </div>
            
            {/* Badge de Membros */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30"
            >
              <Users className="w-4 h-4 text-white" />
              <span className="text-white font-medium">{members.length} membros</span>
            </motion.div>
          </div>

          {/* Informações da Turma */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-white pb-4"
          >
            <div className="flex items-start gap-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl"
              >
                <BookOpen className="w-10 h-10" />
              </motion.div>
              <div className="flex-1">
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg"
                >
                  {classData?.name || 'Carregando...'}
                </motion.h1>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3 flex-wrap"
                >
                  <div className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                    <p className="text-base font-medium">{classData?.subject || 'Disciplina'}</p>
                  </div>
                  {classData?.description && (
                    <p className="text-white/90 text-sm max-w-2xl">
                      {classData.description}
                    </p>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Conteúdo com Tabs */}
      <div className="w-full px-8 -mt-8 relative z-20">

        {/* Tabs com design moderno */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="mb-8 bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
              <TabsList className="w-full grid grid-cols-5 p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 gap-2">
                <TabsTrigger 
                  value="feed" 
                  className="flex items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl hover:scale-[1.02]"
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-semibold">Mural</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="announcements" 
                  className="flex items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl hover:scale-[1.02]"
                >
                  <Megaphone className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-semibold">Comunicados</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="library" 
                  className="flex items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl hover:scale-[1.02]"
                >
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-semibold">Biblioteca</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="activities" 
                  className="flex items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl hover:scale-[1.02]"
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-semibold">Atividades</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="members" 
                  className="flex items-center justify-center gap-2 px-4 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-xl hover:scale-[1.02]"
                >
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-semibold">Membros</span>
                </TabsTrigger>
              </TabsList>
            </Card>
          </motion.div>

          {/* Feed Tab */}
          <TabsContent value="feed">
            <FeedTab posts={posts} loading={loading} />
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <AnnouncementsTab announcements={announcements} loading={loading} />
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library">
            <LibraryTab materials={library} loading={loading} />
          </TabsContent>

        {/* Activities Tab - REDESENHADO */}
        <TabsContent value="activities">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={{
                  ...activity,
                  status: 'pending', // TODO: calcular baseado em submission
                  grade: null,
                  max_grade: activity.max_score || 100
                }}
                onClick={() => startTransition(() => navigate(`/student/activities/${activity.id}`))}
              />
            ))}
            {activities.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-full"
              >
                <Card className="p-12 text-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center">
                    <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Nenhuma atividade ainda
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    As atividades da turma aparecerão aqui
                  </p>
                </Card>
              </motion.div>
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

      {/* Modal de Arquivar Turma */}
      <ArchiveClassModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          const result = await archiveClass(classId, user.id);
          if (result.success) {
            setShowArchiveModal(false);
            navigate('/student/classes');
          }
        }}
        loading={archivingClass}
      />
    </div>
  );
};

export default StudentClassDetailsPage;
