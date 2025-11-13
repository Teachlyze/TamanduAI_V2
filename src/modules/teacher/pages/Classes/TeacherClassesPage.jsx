import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Users, TrendingUp, Archive, Search, Filter, Sparkles } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { redisCache } from '@/shared/services/redisCache';
import ClassCard from './components/ClassCard';
import CreateClassModal from './components/CreateClassModal';

const TeacherClassesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    totalStudents: 0,
    avgGrade: 0,
    totalArchived: 0
  });
  
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [filters, setFilters] = useState({
    searchTerm: '',
    subject: 'all',
    status: 'active',
    sortBy: 'recent'
  });

  useEffect(() => {
    if (user?.id) {
      loadClasses();
      loadStats();
    }
  }, [user, showArchived]);

  useEffect(() => {
    applyFilters();
  }, [classes, filters]);

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);

      // Usar cache Redis para lista de turmas
      const cachedClasses = await redisCache.cacheQuery(
        `teacher:${user.id}:classes`,
        async () => {
          // Buscar turmas
          const { data: classesData, error } = await supabase
            .from('classes')
            .select('*')
            .eq('created_by', user.id)
            .order('updated_at', { ascending: false });

          if (error) throw error;

          const classIds = classesData.map(c => c.id);

          // Buscar todas estatísticas em paralelo (mais eficiente)
          const [membersResult, activitiesResult] = await Promise.all([
            // Contar alunos de todas turmas
            supabase
              .from('class_members')
              .select('class_id')
              .in('class_id', classIds)
              .eq('role', 'student'),
            
            // Contar atividades de todas turmas
            supabase
              .from('activity_class_assignments')
              .select('class_id, activity_id')
              .in('class_id', classIds)
          ]);

          // Agrupar contagens por turma
          const studentCounts = {};
          const activityCounts = {};

          membersResult.data?.forEach(member => {
            studentCounts[member.class_id] = (studentCounts[member.class_id] || 0) + 1;
          });

          activitiesResult.data?.forEach(activity => {
            activityCounts[activity.class_id] = (activityCounts[activity.class_id] || 0) + 1;
          });

          // Combinar dados
          const classesWithStats = classesData.map(classItem => ({
            ...classItem,
            studentCount: studentCounts[classItem.id] || 0,
            activityCount: activityCounts[classItem.id] || 0,
            avgGrade: 0 // Mock - calcular depois se necessário
          }));

          return classesWithStats;
        },
        300 // Cache de 5 minutos
      );

      setClasses(cachedClasses);
    } catch (error) {
      logger.error('Erro ao carregar turmas:', error)
      toast({
        title: 'Erro ao carregar turmas',
        description: 'Não foi possível carregar suas turmas.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refreshClasses = useCallback(async () => {
    try {
      if (user?.id) {
        await redisCache.delete(`teacher:${user.id}:classes`);
      }
    } catch (e) {
      logger.warn('Falha ao invalidar cache de turmas:', e)
    } finally {
      await loadClasses();
      await loadStats();
    }
  }, [user?.id, loadClasses]);

  const loadStats = async () => {
    try {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, is_active')
        .eq('created_by', user.id);

      const activeClasses = classesData?.filter(c => c.is_active) || [];
      const archivedClasses = classesData?.filter(c => !c.is_active) || [];

      // Total de alunos únicos
      const { data: students } = await supabase
        .from('class_members')
        .select('user_id')
        .in('class_id', classesData?.map(c => c.id) || [])
        .eq('role', 'student');

      const uniqueStudents = new Set(students?.map(s => s.user_id) || []);

      // Média geral
      const { data: activities } = await supabase
        .from('activity_class_assignments')
        .select('activity_id')
        .in('class_id', activeClasses.map(c => c.id));

      const activityIds = activities?.map(a => a.activity_id) || [];
      let avgGrade = 0;

      if (activityIds.length > 0) {
        const { data: submissions } = await supabase
          .from('submissions')
          .select('grade')
          .in('activity_id', activityIds)
          .not('grade', 'is', null);

        if (submissions && submissions.length > 0) {
          const sum = submissions.reduce((acc, s) => acc + s.grade, 0);
          avgGrade = sum / submissions.length;
        }
      }

      setStats({
        totalActive: activeClasses.length,
        totalStudents: uniqueStudents.size,
        avgGrade: Number(avgGrade.toFixed(1)),
        totalArchived: archivedClasses.length
      });
    } catch (error) {
      logger.error('Erro ao carregar estatísticas:', error)
    }
  };

  const applyFilters = () => {
    let filtered = [...classes];

    // Filtro de busca
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.subject?.toLowerCase().includes(term)
      );
    }

    // Filtro de disciplina
    if (filters.subject !== 'all') {
      filtered = filtered.filter(c => c.subject === filters.subject);
    }

    // Filtro de status (usar showArchived ao invés de filters.status)
    if (showArchived) {
      filtered = filtered.filter(c => c.is_active !== true);
    } else {
      filtered = filtered.filter(c => c.is_active !== false);
    }

    // Ordenação
    switch (filters.sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'alphabetical-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'most-students':
        filtered.sort((a, b) => b.studentCount - a.studentCount);
        break;
      case 'least-students':
        filtered.sort((a, b) => a.studentCount - b.studentCount);
        break;
      default:
        break;
    }

    setFilteredClasses(filtered);
  };

  const uniqueSubjects = [...new Set(classes.map(c => c.subject).filter(Boolean))];

  const getGradeColor = (grade) => {
    if (grade >= 7) return 'text-green-600';
    if (grade >= 5) return 'text-yellow-600';
    return 'text-red-600';
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
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-4 sm:p-6 md:p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0"
        >
          <div className="w-full md:w-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Minhas Turmas</h1>
            <p className="text-cyan-100 text-sm sm:text-base">Gerencie suas turmas, alunos e atividades</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
            <label className="flex items-center justify-center gap-2 cursor-pointer bg-white/10 hover:bg-white/20 px-3 sm:px-4 py-2 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="w-4 h-4 flex-shrink-0"
              />
              <span className="text-sm whitespace-nowrap">Mostrar Arquivadas</span>
            </label>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-white text-blue-600 hover:bg-white/90 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Turma
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Turmas Ativas</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.totalActive}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total de Alunos</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.totalStudents}
              </p>
            </div>
            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Média Geral</p>
              <p className={`text-3xl font-bold mt-1 ${getGradeColor(stats.avgGrade)}`}>
                {stats.avgGrade.toFixed(1)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card 
          className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setShowArchived(!showArchived)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Arquivadas</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.totalArchived}
              </p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Archive className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              placeholder="Buscar turma por nome ou disciplina..."
              className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
            />
          </div>

          <select
            value={filters.subject}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
          >
            <option value="all">Todas as Disciplinas</option>
            {uniqueSubjects.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
          >
            <option value="recent">Atualizadas Recentemente</option>
            <option value="alphabetical">Alfabética (A-Z)</option>
            <option value="alphabetical-desc">Alfabética (Z-A)</option>
            <option value="most-students">Mais Alunos</option>
            <option value="least-students">Menos Alunos</option>
          </select>
        </div>
      </Card>

      {/* Grade de Turmas */}
      {filteredClasses.length === 0 ? (
        <Card className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            {classes.length === 0 ? 'Nenhuma turma criada ainda' : 'Nenhuma turma encontrada'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {classes.length === 0 
              ? 'Comece criando sua primeira turma' 
              : 'Tente ajustar os filtros'}
          </p>
          <Button
            onClick={() => {
              if (classes.length === 0) {
                setShowCreateModal(true);
              } else {
                setFilters({ searchTerm: '', subject: 'all', status: 'active', sortBy: 'recent' });
              }
            }}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            {classes.length === 0 ? 'Criar Primeira Turma' : 'Limpar Filtros'}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((classItem, idx) => (
            <ClassCard
              key={classItem.id}
              classData={classItem}
              index={idx}
              onUpdate={refreshClasses}
            />
          ))}
        </div>
      )}

      {/* Modal Criar Turma */}
      {showCreateModal && (
        <CreateClassModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={refreshClasses}
          teacherId={user?.id}
        />
      )}
    </div>
  );
};

export default TeacherClassesPage;
