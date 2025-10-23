import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import {
  DashboardHeader,
  StatsCard,
  SearchInput,
  DataTable,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { ClassService } from '@/shared/services/classService';

const ClassGradesPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    average: 0,
    highest: 0,
    lowest: 0,
    totalGrades: 0
  });

  useEffect(() => {
    loadData();
  }, [classId]);

  useEffect(() => {
    applySearch();
  }, [students, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);

      const classInfo = await ClassService.getClassById(classId);
      setClassData(classInfo);

      // Get class members
      const members = await ClassService.getClassMembers(classId, { role: 'student' });

      // Get activities
      const { data: acts } = await supabase
        .from('activity_class_assignments')
        .select('activity_id')
        .eq('class_id', classId);

      const activityIds = acts?.map(a => a.activity_id) || [];

      // Get submissions for each student
      const studentsWithGrades = await Promise.all(
        members.map(async (member) => {
          const { data: subs } = await supabase
            .from('submissions')
            .select('grade, activity_id')
            .eq('user_id', member.user_id)
            .in('activity_id', activityIds)
            .not('grade', 'is', null);

          const grades = subs?.map(s => s.grade) || [];
          const average = grades.length > 0
            ? grades.reduce((a, b) => a + b, 0) / grades.length
            : null;

          return {
            id: member.user_id,
            name: member.user?.name || 'Sem nome',
            email: member.user?.email,
            avatar: member.user?.avatar_url,
            grades: subs || [],
            average: average ? Number(average.toFixed(2)) : null
          };
        })
      );

      setStudents(studentsWithGrades);

      // Calculate class stats
      const validAverages = studentsWithGrades
        .map(s => s.average)
        .filter(a => a !== null);

      const classAverage = validAverages.length > 0
        ? validAverages.reduce((a, b) => a + b, 0) / validAverages.length
        : 0;

      setStats({
        average: Number(classAverage.toFixed(2)),
        highest: validAverages.length > 0 ? Math.max(...validAverages) : 0,
        lowest: validAverages.length > 0 ? Math.min(...validAverages) : 0,
        totalGrades: studentsWithGrades.reduce((sum, s) => sum + s.grades.length, 0)
      });

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const applySearch = () => {
    if (!searchQuery) {
      setFilteredStudents(students);
      return;
    }

    const query = searchQuery.toLowerCase();
    setFilteredStudents(students.filter(s =>
      s.name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query)
    ));
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {row.name[0]}
            </div>
          )}
          <div>
            <div className="font-semibold">{row.name}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'gradesCount',
      label: 'Notas Lançadas',
      sortable: true,
      render: (_, row) => row.grades.length
    },
    {
      key: 'average',
      label: 'Média',
      sortable: true,
      render: (_, row) => {
        if (row.average === null) return '-';
        
        const diff = row.average - stats.average;
        const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
        const color = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-slate-600';
        
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{row.average.toFixed(2)}</span>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        );
      }
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
      <Button
        variant="ghost"
        onClick={() => navigate(`/teacher/classes/${classId}`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <DashboardHeader
        title={`Notas - ${classData?.name || 'Turma'}`}
        subtitle="Visualização de notas dos alunos"
        role="teacher"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Média da Turma"
          value={stats.average.toFixed(2)}
          icon={TrendingUp}
          gradient={gradients.primary}
          format="text"
          delay={0}
        />
        <StatsCard
          title="Maior Nota"
          value={stats.highest.toFixed(2)}
          icon={TrendingUp}
          gradient={gradients.success}
          format="text"
          delay={0.1}
        />
        <StatsCard
          title="Menor Nota"
          value={stats.lowest.toFixed(2)}
          icon={TrendingDown}
          gradient={gradients.danger}
          format="text"
          delay={0.2}
        />
        <StatsCard
          title="Notas Lançadas"
          value={stats.totalGrades}
          icon={TrendingUp}
          gradient={gradients.stats.activities}
          delay={0.3}
        />
      </div>

      <Card className="p-6 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 mb-8">
        <p className="text-amber-800 dark:text-amber-200 text-sm">
          ⚠️ <strong>Versão FREE:</strong> Upgrade para visualização em matriz interativa e exportação em Excel/PDF.
        </p>
      </Card>

      <div className="mb-8">
        <SearchInput
          placeholder="Buscar aluno..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
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
          icon={TrendingUp}
          title="Nenhum aluno encontrado"
          description="Aguardando notas dos alunos."
        />
      )}
    </div>
  );
};

export default ClassGradesPage;
