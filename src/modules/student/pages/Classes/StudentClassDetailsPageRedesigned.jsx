import { logger } from '@/shared/utils/logger';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { useStudentClassDetails } from '@/modules/student/hooks/useStudentClassDetails';
import { ActivityCard, EmptyState, StatCard, GradeCard, MaterialCardPreview } from '@/modules/student/components/redesigned';
import { BookOpen, FileText, Users, Star, ArrowLeft, Megaphone, Calendar, MessageCircle } from 'lucide-react'; 
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PostCard from '@/modules/student/components/PostCard';

const StudentClassDetailsPageRedesigned = () => {
  const { classId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('feed');

  const {
    data: classPayload,
    loading,
    refetch,
  } = useStudentClassDetails(classId);

  const classData = classPayload?.classData || null;
  const announcements = classPayload?.announcements || [];
  const activities = classPayload?.activities || [];
  const materials = classPayload?.materials || [];
  const grades = classPayload?.grades || [];
  const students = classPayload?.students || [];
  const stats = classPayload?.stats || {
    pendingActivities: 0,
    avgGrade: 0,
    studentsCount: 0,
  };

  const handleDownloadMaterial = async (material) => {
    if (material.file_url) {
      window.open(material.file_url, '_blank');
    }
  };

  const handleRefresh = () => {
    if (refetch) {
      refetch().catch((err) => {
        logger.error('[StudentClassDetails] Erro ao recarregar dados da turma:', err);
      });
    }
  };

  if (loading && !classData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const gradientClasses = {
    blue: 'from-blue-600 to-cyan-500',
    green: 'from-green-600 to-emerald-500',
    purple: 'from-purple-600 to-pink-500',
    orange: 'from-orange-600 to-amber-500',
    red: 'from-red-600 to-rose-500',
  };

  const gradient = gradientClasses[classData?.color] || gradientClasses.blue;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      {/* Botão Voltar */}
      <Button
        variant="ghost"
        onClick={() => navigate('/students/classes')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Turmas
      </Button>

      {/* Header da Turma */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r ${gradient} rounded-2xl p-8 mb-8 text-white shadow-xl relative overflow-hidden`}
      >
        {/* Ícone decorativo */}
        <div className="absolute -right-16 -bottom-16 opacity-10">
          <BookOpen className="w-64 h-64" />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <Badge className="mb-3 bg-white/20 text-white border-white/30">
                {classData?.subject || 'Matéria'}
              </Badge>
              <h1 className="text-4xl font-bold mb-2">
                {classData?.name}
              </h1>
              {classData?.description && (
                <p className="text-white/90 text-lg max-w-2xl">
                  {classData.description}
                </p>
              )}
            </div>

            {/* Professor */}
            <Card className="p-4 bg-white/10 backdrop-blur border-white/20">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-white">
                  <AvatarImage src={classData?.teacher_avatar} />
                  <AvatarFallback className="bg-white/20 text-white">
                    {classData?.teacher_name?.[0] || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-white/70">Professor(a)</p>
                  <p className="font-bold text-white">{classData?.teacher_name}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8" />
                <div>
                  <p className="text-2xl font-bold">{stats.pendingActivities}</p>
                  <p className="text-sm text-white/80">Atividades Pendentes</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8" />
                <div>
                  <p className="text-2xl font-bold">
                    {stats.avgGrade > 0 ? stats.avgGrade.toFixed(1) : '--'}
                  </p>
                  <p className="text-sm text-white/80">Média de Notas</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8" />
                <div>
                  <p className="text-2xl font-bold">{stats.studentsCount}</p>
                  <p className="text-sm text-white/80">Alunos na Turma</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="announcements">Comunicados</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
          <TabsTrigger value="materials">Materiais</TabsTrigger>
          <TabsTrigger value="grades">Notas</TabsTrigger>
          <TabsTrigger value="students">Alunos</TabsTrigger>
        </TabsList>

        {/* Tab: Feed */}
        <TabsContent value="feed">
          {announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PostCard post={post} onUpdate={handleRefresh} />
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="Nenhum post ainda"
              description="Não há posts publicados nesta turma ainda."
            />
          )}
        </TabsContent>

        {/* Tab: Comunicados */}
        <TabsContent value="announcements">
          {announcements.filter(a => a.category === 'announcement' || a.type === 'announcement').length > 0 ? (
            <div className="space-y-4">
              {announcements
                .filter(a => a.category === 'announcement' || a.type === 'announcement')
                .map((announcement, index) => (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-6 border-l-4 border-l-orange-500">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                          <Megaphone className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-slate-900 dark:text-white">
                              {announcement.title || 'Comunicado Importante'}
                            </h3>
                            <Badge className="bg-orange-100 text-orange-700">Comunicado</Badge>
                            <span className="text-sm text-slate-500">
                              {formatDistanceToNow(new Date(announcement.created_at), {
                                locale: ptBR,
                                addSuffix: true
                              })}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {announcement.content || announcement.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
            </div>
          ) : (
            <EmptyState
              icon={Megaphone}
              title="Nenhum comunicado"
              description="Não há comunicados importantes nesta turma ainda."
            />
          )}
        </TabsContent>

        {/* Tab: Atividades */}
        <TabsContent value="activities">
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => (
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
              icon={FileText}
              title="Nenhuma atividade"
              description="Não há atividades disponíveis nesta turma ainda."
            />
          )}
        </TabsContent>

        {/* Tab: Materiais */}
        <TabsContent value="materials">
          {materials.length > 0 ? (
            <div className="space-y-4">
              {materials.map((material, index) => (
                <MaterialCardPreview
                  key={material.id}
                  material={material}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Nenhum material"
              description="Não há materiais disponíveis nesta turma ainda."
            />
          )}
        </TabsContent>

        {/* Tab: Notas */}
        <TabsContent value="grades">
          {grades.length > 0 ? (
            <div className="space-y-4">
              {grades.map((grade, index) => (
                <motion.div
                  key={grade.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                          {grade.activity_title}
                        </h3>
                        <div className="flex items-center gap-4 mb-3">
                          <div>
                            <span className="text-3xl font-bold text-blue-600">
                              {parseFloat(grade.grade).toFixed(1)}
                            </span>
                            <span className="text-slate-500">/{grade.max_score}</span>
                          </div>
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${(parseFloat(grade.grade) / grade.max_score) * 100}%` }}
                            />
                          </div>
                        </div>
                        {grade.feedback && (
                          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Feedback do Professor:
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {grade.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Star}
              title="Nenhuma nota ainda"
              description="Você ainda não possui notas nesta turma."
            />
          )}
        </TabsContent>

        {/* Tab: Alunos */}
        <TabsContent value="students">
          {students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={student.avatar_url} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {(student.full_name || student.name)?.[0] || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {student.full_name || student.name || 'Aluno'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {student.email || 'Sem email'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Nenhum aluno"
              description="Não há alunos nesta turma ainda."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentClassDetailsPageRedesigned;
