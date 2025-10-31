import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, GraduationCap, TrendingUp, Award } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  DashboardHeader,
  StatsCard,
  SearchInput,
  FilterBar,
  DataTable,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const TeacherStudentsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ classId: null });
  const [stats, setStats] = useState({
    total: 0,
    classesWithStudents: 0,
    averageGrade: 0,
    totalXP: 0
  });
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [students, searchQuery, filters]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get teacher's classes
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id, name')
        .eq('created_by', user.id);

      setClasses(teacherClasses || []);

      const classIds = teacherClasses?.map(c => c.id) || [];

      if (classIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get all students from these classes
      const { data: members } = await supabase
        .from('class_members')
        .select(`
          user_id,
          class_id,
          user:profiles(id, full_name, email, avatar_url)
        `)
        .in('class_id', classIds)
        .eq('role', 'student');

      // Group students and get their stats
      const studentMap = new Map();
      
      members?.forEach(member => {
        if (!studentMap.has(member.user_id)) {
          studentMap.set(member.user_id, {
            id: member.user_id,
            name: member.user?.full_name,
            email: member.user?.email,
            avatar: member.user?.avatar_url,
            classes: []
          });
        }
        
        const className = teacherClasses.find(c => c.id === member.class_id)?.name;
        if (className) {
          studentMap.get(member.user_id).classes.push(className);
        }
      });

      const studentsList = Array.from(studentMap.values());

      // Get grades and XP for each student
      const studentsWithStats = await Promise.all(
        studentsList.map(async (student) => {
          // Get grades
          const { data: subs } = await supabase
            .from('submissions')
            .select('grade')
            .eq('user_id', student.id)
            .not('grade', 'is', null);

          const grades = subs?.map(s => s.grade).filter(g => g !== null) || [];
          const average = grades.length > 0
            ? grades.reduce((a, b) => a + b, 0) / grades.length
            : 0;

          // Get XP
          const { data: profile } = await supabase
            .from('gamification_profiles')
            .select('xp_total, level')
            .eq('user_id', student.id)
            .single();

          return {
            ...student,
            average: Number(average.toFixed(2)),
            xp: profile?.xp_total || 0,
            level: profile?.level || 1
          };
        })
      );

      setStudents(studentsWithStats);

      // Calculate stats
      const totalXP = studentsWithStats.reduce((sum, s) => sum + s.xp, 0);
      const avgGrade = studentsWithStats.length > 0
        ? studentsWithStats.reduce((sum, s) => sum + s.average, 0) / studentsWithStats.length
        : 0;

      setStats({
        total: studentsWithStats.length,
        classesWithStudents: classIds.length,
        averageGrade: Number(avgGrade.toFixed(2)),
        totalXP
      });

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...students];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query)
      );
    }

    if (filters.classId) {
      const className = classes.find(c => c.id === filters.classId)?.name;
      result = result.filter(s => s.classes.includes(className));
    }

    setFilteredStudents(result);
  };

  const columns = [
    {
      key: 'name',
      label: 'Aluno',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.avatar ? (
            <img src={row.avatar} alt={row.name} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
              {row.name?.[0] || 'A'}
            </div>
          )}
          <div>
            <div className="font-semibold">{row.name || 'Sem nome'}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'classes',
      label: 'Turmas',
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.classes.slice(0, 3).map((className, i) => (
            <Badge key={i} variant="secondary">{className}</Badge>
          ))}
          {row.classes.length > 3 && (
            <Badge variant="secondary">+{row.classes.length - 3}</Badge>
          )}
        </div>
      )
    },
    {
      key: 'average',
      label: 'Média',
      sortable: true,
      render: (_, row) => (
        <span className="font-semibold">{row.average > 0 ? row.average.toFixed(2) : '-'}</span>
      )
    },
    {
      key: 'xp',
      label: 'XP / Level',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>{row.xp} XP</span>
          <span className="text-xs text-slate-600 dark:text-slate-400">Lv {row.level}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      align: 'right',
      render: (_, row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/teacher/students/${row.id}`)}
        >
          Ver Perfil
        </Button>
      )
    }
  ];

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
        title="Meus Alunos"
        subtitle={`${stats.total} aluno${stats.total !== 1 ? 's' : ''}`}
        role="teacher"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total de Alunos"
          value={stats.total}
          icon={Users}
          gradient={gradients.stats.students}
          delay={0}
        />
        <StatsCard
          title="Turmas"
          value={stats.classesWithStudents}
          icon={GraduationCap}
          gradient={gradients.stats.classes}
          delay={0.1}
        />
        <StatsCard
          title="Média Geral"
          value={stats.averageGrade.toFixed(2)}
          icon={TrendingUp}
          gradient={gradients.success}
          format="text"
          delay={0.2}
        />
        <StatsCard
          title="XP Total"
          value={stats.totalXP}
          icon={Award}
          gradient="from-amber-500 to-orange-500"
          delay={0.3}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        
        {classes.length > 0 && (
          <FilterBar
            filters={[
              {
                key: 'classId',
                label: 'Turma',
                options: classes.map(c => ({ value: c.id, label: c.name }))
              }
            ]}
            activeFilters={filters}
            onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            onClearAll={() => {
              setFilters({ classId: null });
              setSearchQuery('');
            }}
          />
        )}
      </div>

      {filteredStudents.length > 0 ? (
        <DataTable
          columns={columns}
          data={filteredStudents}
          sortBy="name"
          sortOrder="asc"
        />
      ) : (
        <EmptyState
          icon={Users}
          title={searchQuery || filters.classId ? 'Nenhum aluno encontrado' : 'Nenhum aluno ainda'}
          description={searchQuery || filters.classId ? 'Ajuste os filtros.' : 'Seus alunos aparecerão aqui.'}
        />
      )}
    </div>
  );
};

export default TeacherStudentsPage;
