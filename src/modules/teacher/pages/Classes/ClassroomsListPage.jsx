import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Users, BookOpen, FileText, Clock } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DashboardHeader,
  StatsCard,
  SearchInput,
  FilterBar,
  ClassCard,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { ClassService } from '@/shared/services/classService';
import { useAuth } from '@/shared/hooks/useAuth';

const ClassroomsListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: null,
    sort: 'name'
  });
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalActivities: 0,
    pendingCorrections: 0
  });

  // Load data
  useEffect(() => {
    loadClasses();
  }, [user]);

  // Apply filters and search
  useEffect(() => {
    applyFiltersAndSearch();
  }, [classes, searchQuery, filters]);

  const loadClasses = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch classes
      const classesData = await ClassService.getClasses({
        teacherId: user.id,
        activeOnly: false // Trazer todas para poder filtrar
      });

      setClasses(classesData || []);

      // Calculate stats
      const totalStudents = classesData.reduce((sum, cls) => {
        const studentCount = cls.members?.filter(m => m.role === 'student').length || 0;
        return sum + studentCount;
      }, 0);

      // Get stats for each class and sum
      let totalActivities = 0;
      let totalPendingCorrections = 0;

      for (const cls of classesData) {
        const classStats = await ClassService.getClassStats(cls.id);
        totalActivities += classStats.activitiesCount;
        totalPendingCorrections += classStats.pendingCorrections;
      }

      setStats({
        totalClasses: classesData.length,
        totalStudents,
        totalActivities,
        pendingCorrections: totalPendingCorrections
      });

    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...classes];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(cls => 
        cls.name?.toLowerCase().includes(query) ||
        cls.subject?.toLowerCase().includes(query) ||
        cls.invite_code?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.status !== null) {
      if (filters.status === 'active') {
        result = result.filter(cls => cls.is_active);
      } else if (filters.status === 'inactive') {
        result = result.filter(cls => !cls.is_active);
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (filters.sort) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'recent':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'students': {
          const aCount = a.members?.filter(m => m.role === 'student').length || 0;
          const bCount = b.members?.filter(m => m.role === 'student').length || 0;
          return bCount - aCount;
        }
        default:
          return 0;
      }
    });

    setFilteredClasses(result);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ status: null, sort: 'name' });
    setSearchQuery('');
  };

  const handleClassClick = (classId) => {
    navigate(`/dashboard/classes/${classId}`);
  };

  const handleCreateClass = () => {
    navigate('/dashboard/classes');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando turmas..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header */}
      <DashboardHeader
        title="Minhas Turmas"
        subtitle={`${stats.totalClasses} turma${stats.totalClasses !== 1 ? 's' : ''} ${stats.totalClasses > 0 ? (filters.status === 'active' ? 'ativa' : filters.status === 'inactive' ? 'inativa' : '') : ''}`}
        role="teacher"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total de Alunos"
          value={stats.totalStudents}
          icon={Users}
          gradient={gradients.stats.students}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
          delay={0}
        />
        <StatsCard
          title="Total de Atividades"
          value={stats.totalActivities}
          icon={FileText}
          gradient={gradients.stats.activities}
          bgColor="bg-emerald-50 dark:bg-emerald-950/30"
          delay={0.1}
        />
        <StatsCard
          title="Correções Pendentes"
          value={stats.pendingCorrections}
          icon={Clock}
          gradient={gradients.stats.pending}
          bgColor="bg-amber-50 dark:bg-amber-950/30"
          delay={0.2}
        />
        <StatsCard
          title="Total de Turmas"
          value={stats.totalClasses}
          icon={BookOpen}
          gradient={gradients.stats.classes}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
          delay={0.3}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar por nome, matéria ou código..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        
        <FilterBar
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'active', label: 'Ativas' },
                { value: 'inactive', label: 'Inativas' }
              ]
            },
            {
              key: 'sort',
              label: 'Ordenar',
              options: [
                { value: 'name', label: 'Nome (A-Z)' },
                { value: 'recent', label: 'Mais Recentes' },
                { value: 'students', label: 'Mais Alunos' }
              ]
            }
          ]}
          activeFilters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearFilters}
        />
      </div>

      {/* Classes Grid */}
      {filteredClasses.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20"
        >
          {filteredClasses.map((classItem, index) => {
            const studentCount = classItem.members?.filter(m => m.role === 'student').length || 0;
            
            return (
              <ClassCard
                key={classItem.id}
                id={classItem.id}
                name={classItem.name}
                subject={classItem.subject}
                studentCount={studentCount}
                status={classItem.is_active ? 'active' : 'inactive'}
                color={classItem.banner_color || classItem.color || 'from-blue-500 to-indigo-500'}
                delay={index * 0.05}
                onClick={() => handleClassClick(classItem.id)}
                actionLabel="Ver Turma"
                onAction={() => handleClassClick(classItem.id)}
              />
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={searchQuery || filters.status ? 'Nenhuma turma encontrada' : 'Você ainda não criou nenhuma turma'}
          description={
            searchQuery || filters.status
              ? 'Tente ajustar os filtros ou buscar por outro termo.'
              : 'Crie sua primeira turma para começar a gerenciar suas aulas e atividades.'
          }
          actionLabel="Criar Primeira Turma"
          actionIcon={Plus}
          action={handleCreateClass}
        />
      )}

      {/* Floating Action Button */}
      {filteredClasses.length > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <Button
            onClick={handleCreateClass}
            className="w-16 h-16 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
          >
            <Plus className="w-8 h-8" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default ClassroomsListPage;
