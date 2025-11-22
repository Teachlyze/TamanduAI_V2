import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/services/supabaseClient';
import { useToast } from '@/shared/components/ui/use-toast';
import { ClassCard, EmptyState } from '@/modules/student/components/redesigned';
import { BookOpen, Search, Grid3x3, List, Star, LogIn, X } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';

const StudentClassesPageRedesigned = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningClass, setJoiningClass] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadClasses();
    }
  }, [user]);

  useEffect(() => {
    filterClasses();
  }, [classes, searchQuery, sortBy]);

  const loadClasses = async () => {
    try {
      setLoading(true);

      // Buscar turmas do aluno
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id, joined_at')
        .eq('user_id', user.id)
        .eq('role', 'student');

      const classIds = memberships?.map(m => m.class_id) || [];

      // Buscar dados das classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name, subject, color, created_at, created_by')
        .in('id', classIds);

      // Buscar dados dos professores
      const teacherIds = classesData?.map(c => c.created_by).filter(Boolean) || [];
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', teacherIds);

      const teachersMap = {};
      teachers?.forEach(t => { teachersMap[t.id] = t; });

      if (classIds.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      // Para cada turma, buscar estatísticas
      const classesWithStats = await Promise.all(
        classesData.map(async (classItem) => {
          const membership = memberships.find(m => m.class_id === classItem.id);

          // Contar atividades
          const { data: assignments } = await supabase
            .from('activity_class_assignments')
            .select('activity_id')
            .eq('class_id', classItem.id);

          const activityIds = assignments?.map(a => a.activity_id) || [];

          // Buscar submissões do aluno nesta turma
          const { data: submissions } = await supabase
            .from('submissions')
            .select('activity_id, status, grade')
            .eq('student_id', user.id)
            .in('activity_id', activityIds);

          const submittedIds = new Set(submissions?.map(s => s.activity_id) || []);
          const pendingActivities = activityIds.length - submittedIds.size;

          // Calcular média
          const gradesData = submissions?.filter(s => s.grade !== null) || [];
          const avgGrade = gradesData.length > 0
            ? gradesData.reduce((sum, s) => sum + parseFloat(s.grade), 0) / gradesData.length
            : null;

          // Contar alunos (apenas não arquivados)
          const { data: studentsList } = await supabase
            .from('class_members')
            .select('id, is_archived')
            .eq('class_id', classItem.id)
            .eq('role', 'student');
          
          const studentsCount = studentsList?.filter(s => !s.is_archived).length || 0;

          // Verificar novas atividades (últimos 7 dias)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const { data: newAssignments } = await supabase
            .from('activity_class_assignments')
            .select('activity_id, assigned_at')
            .eq('class_id', classItem.id)
            .gte('assigned_at', sevenDaysAgo.toISOString());

          const newActivityIds = newAssignments?.map(a => a.activity_id) || [];
          const newActivitiesCount = newActivityIds.filter(id => !submittedIds.has(id)).length;

          const teacher = teachersMap[classItem.created_by];
          
          return {
            id: classItem.id,
            name: classItem.name,
            subject: classItem.subject,
            color: classItem.color || 'blue',
            teacher_name: teacher?.full_name || 'Professor',
            teacher_avatar: teacher?.avatar_url,
            pendingActivities,
            avgGrade,
            studentsCount: studentsCount || 0,
            newActivities: newActivitiesCount,
            joined_at: membership?.joined_at,
            created_at: classItem.created_at
          };
        })
      );

      setClasses(classesWithStats);
    } catch (error) {
      logger.error('Erro ao carregar turmas:', error);
      toast({
        title: 'Erro ao carregar turmas',
        description: 'Não foi possível carregar suas turmas. Tente novamente em instantes.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  };

  const filterClasses = () => {
    let filtered = [...classes];

    // Filtro por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.subject?.toLowerCase().includes(query) ||
        c.teacher_name?.toLowerCase().includes(query)
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'pending':
          return b.pendingActivities - a.pendingActivities;
        case 'grade':
          const gradeA = a.avgGrade || 0;
          const gradeB = b.avgGrade || 0;
          return gradeB - gradeA;
        case 'recent':
          return new Date(b.joined_at) - new Date(a.joined_at);
        default:
          return 0;
      }
    });

    setFilteredClasses(filtered);
  };

  const handleJoinClass = async () => {
    const code = joinCode.replace(/\s/g, '').trim().toUpperCase();

    if (!code) {
      setJoinError('Digite o código da turma');
      return;
    }

    if (code.length !== 8) {
      setJoinError('O código deve ter 8 caracteres');
      return;
    }

    if (!user?.id) {
      setJoinError('Você precisa estar autenticado para entrar em uma turma.');
      return;
    }

    try {
      setJoiningClass(true);
      setJoinError('');

      // Buscar turma pelo código (case-insensitive, como na tela antiga)
      const { data: classData, error: searchError } = await supabase
        .from('classes')
        .select('id, name')
        .ilike('invite_code', code)
        .maybeSingle();

      if (searchError || !classData) {
        logger.error('Erro ao buscar turma:', searchError);
        setJoinError('Código inválido! Verifique se digitou corretamente.');
        return;
      }

      // Verificar se já é membro
      const { data: existingMembership } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', classData.id)
        .eq('user_id', user.id)
        .single();

      if (existingMembership) {
        setJoinError('Você já está nesta turma!');
        return;
      }

      // Adicionar como membro
      const { data: inserted, error: insertError } = await supabase
        .from('class_members')
        .insert({
          class_id: classData.id,
          user_id: user.id,
          role: 'student',
          joined_at: new Date().toISOString(),
        })
        .select();

      if (insertError) throw insertError;

      if (!inserted || inserted.length === 0) {
        throw new Error('Falha ao adicionar você à turma');
      }

      setShowJoinModal(false);
      setJoinCode('');
      setJoinError('');

      await loadClasses();

      toast({
        title: '🎉 Bem-vindo(a)!',
        description: `Você entrou na turma "${classData.name}" com sucesso!`,
      });
    } catch (error) {
      logger.error('Erro ao entrar na turma:', error);
      setJoinError('Erro ao entrar na turma. Tente novamente.');
    } finally {
      setJoiningClass(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          Minhas Turmas
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {classes.length} turma{classes.length !== 1 ? 's' : ''} ativa{classes.length !== 1 ? 's' : ''}
        </p>
      </motion.div>

      {/* Filtros e Controles */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Busca */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar turmas por nome, matéria ou professor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Ordenação e Ações */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <Tabs value={sortBy} onValueChange={setSortBy}>
            <TabsList>
              <TabsTrigger value="name">Nome</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="grade">Média</TabsTrigger>
              <TabsTrigger value="recent">Recentes</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* View Mode */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Entrar com código */}
          <Button
            type="button"
            onClick={() => setShowJoinModal(true)}
            className="sm:ml-2 bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Entrar com código
          </Button>
        </div>
      </div>

      {/* Grid de Turmas */}
      {filteredClasses.length > 0 ? (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'
            : 'space-y-3 sm:space-y-4'
        }>
          {filteredClasses.map((classItem, index) => (
            <ClassCard
              key={classItem.id}
              classItem={classItem}
              onClick={() => navigate(`/students/classes/${classItem.id}`)}
              index={index}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={searchQuery ? Search : BookOpen}
          title={searchQuery ? 'Nenhuma turma encontrada' : 'Você ainda não está em nenhuma turma'}
          description={
            searchQuery
              ? 'Tente ajustar sua busca para encontrar o que procura.'
              : 'Use o código fornecido pelo seu professor para entrar em uma turma.'
          }
          action={
            searchQuery
              ? undefined
              : () => setShowJoinModal(true)
          }
          actionLabel={searchQuery ? undefined : 'Entrar com código da turma'}
          variant="default"
        />
      )}

      {/* Stats Rápidas */}
      {classes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        >
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border-2 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Total de Turmas</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{classes.length}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border-2 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Star className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Atividades Pendentes</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-orange-600">
              {classes.reduce((sum, c) => sum + c.pendingActivities, 0)}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border-2 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Star className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Média Geral</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              {(() => {
                const classesWithGrades = classes.filter(c => c.avgGrade !== null);
                if (classesWithGrades.length === 0) return '--';
                const totalAvg = classesWithGrades.reduce((sum, c) => sum + c.avgGrade, 0) / classesWithGrades.length;
                return totalAvg.toFixed(1);
              })()}
            </p>
          </div>
        </motion.div>
      )}
      {showJoinModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowJoinModal(false);
            setJoinCode('');
            setJoinError('');
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="p-8 max-w-md w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Entrar em uma Turma
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode('');
                    setJoinError('');
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Digite o código fornecido pelo professor
              </p>

              <div className="mb-6">
                <Input
                  value={joinCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    if (value.length <= 8) {
                      setJoinCode(value);
                      setJoinError('');
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinClass();
                    }
                  }}
                  placeholder="CÓDIGO DA TURMA"
                  maxLength={8}
                  className="text-center text-2xl font-mono tracking-widest uppercase h-14 border-2 focus:border-blue-500"
                  autoFocus
                  disabled={joiningClass}
                />
                {joinError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">
                    {joinError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode('');
                    setJoinError('');
                  }}
                  className="flex-1 border-slate-300 dark:border-slate-700"
                  disabled={joiningClass}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleJoinClass}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={joiningClass || !joinCode.trim()}
                >
                  {joiningClass ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StudentClassesPageRedesigned;
