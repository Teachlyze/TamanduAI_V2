import React, { useState, useEffect } from 'react';
import { Trophy, Award } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  DashboardHeader,
  StatsCard,
  FilterBar,
  DataTable,
  EmptyState,
  gradients
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const TeacherRankingPage = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ period: 'month' });
  const [stats, setStats] = useState({ totalStudents: 0, totalXP: 0 });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('created_by', user.id);

      const classIds = teacherClasses?.map(c => c.id) || [];

      if (classIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: members } = await supabase
        .from('class_members')
        .select('user_id, user:profiles(id, full_name, avatar_url)')
        .in('class_id', classIds)
        .eq('role', 'student');

      const studentMap = new Map();
      
      for (const member of members || []) {
        if (!studentMap.has(member.user_id)) {
          const { data: gamification } = await supabase
            .from('gamification_profiles')
            .select('*')
            .eq('user_id', member.user_id)
            .single();

          studentMap.set(member.user_id, {
            id: member.user_id,
            name: member.user?.full_name,
            avatar: member.user?.avatar_url,
            xp: gamification?.xp_total || 0,
            level: gamification?.level || 1,
            streak: gamification?.current_streak || 0
          });
        }
      }

      const studentsList = Array.from(studentMap.values())
        .sort((a, b) => b.xp - a.xp)
        .map((student, index) => ({ ...student, rank: index + 1 }));

      setStudents(studentsList);
      setStats({
        totalStudents: studentsList.length,
        totalXP: studentsList.reduce((sum, s) => sum + s.xp, 0)
      });

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'rank',
      label: 'Posição',
      render: (_, row) => {
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        return <div className="font-bold text-lg">{medals[row.rank] || ''} {row.rank}º</div>;
      }
    },
    {
      key: 'name',
      label: 'Aluno',
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
            <div className="font-semibold">{row.name}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Level {row.level}</div>
          </div>
        </div>
      )
    },
    {
      key: 'xp',
      label: 'XP',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span className="font-bold">{row.xp.toLocaleString('pt-BR')}</span>
        </div>
      )
    },
    {
      key: 'streak',
      label: 'Streak',
      render: (_, row) => <Badge>🔥 {row.streak} dias</Badge>
    }
  ];

  const podium = students.slice(0, 3);

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
        title="Ranking de Alunos"
        subtitle="Classificação por XP"
        role="teacher"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatsCard
          title="Total de Alunos"
          value={stats.totalStudents}
          icon={Trophy}
          gradient="from-amber-500 to-orange-500"
          delay={0}
        />
        <StatsCard
          title="XP Total"
          value={stats.totalXP}
          icon={Award}
          gradient="from-blue-500 to-cyan-500"
          delay={0.1}
        />
      </div>

      <div className="mb-8">
        <FilterBar
          filters={[{
            key: 'period',
            label: 'Período',
            options: [
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mês' },
              { value: 'all', label: 'Todo Período' }
            ]
          }]}
          activeFilters={filters}
          onFilterChange={(key, value) => setFilters({ ...filters, [key]: value })}
          onClearAll={() => setFilters({ period: 'month' })}
        />
      </div>

      {students.length > 0 ? (
        <>
          {podium.length >= 3 && (
            <Card className="p-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 mb-8">
              <h2 className="text-2xl font-bold text-center mb-8">🏆 Top 3</h2>
              <div className="flex items-end justify-center gap-8">
                {podium[1] && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <div className="w-20 h-20 rounded-full border-4 border-slate-400 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                        {podium[1].name?.[0]}
                      </div>
                      <div className="absolute -top-2 -right-2 text-4xl">🥈</div>
                    </div>
                    <div className="font-bold">{podium[1].name}</div>
                    <div className="text-sm">{podium[1].xp} XP</div>
                  </div>
                )}
                {podium[0] && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <div className="w-24 h-24 rounded-full border-4 border-amber-500 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold">
                        {podium[0].name?.[0]}
                      </div>
                      <div className="absolute -top-2 -right-2 text-5xl">🥇</div>
                    </div>
                    <div className="font-bold text-lg">{podium[0].name}</div>
                    <div>{podium[0].xp} XP</div>
                  </div>
                )}
                {podium[2] && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-2">
                      <div className="w-20 h-20 rounded-full border-4 border-orange-600 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                        {podium[2].name?.[0]}
                      </div>
                      <div className="absolute -top-2 -right-2 text-4xl">🥉</div>
                    </div>
                    <div className="font-bold">{podium[2].name}</div>
                    <div className="text-sm">{podium[2].xp} XP</div>
                  </div>
                )}
              </div>
            </Card>
          )}

          <DataTable columns={columns} data={students.slice(3)} />
        </>
      ) : (
        <EmptyState
          icon={Trophy}
          title="Nenhum aluno no ranking"
          description="Os alunos aparecerão aqui conforme ganharem XP."
        />
      )}
    </div>
  );
};

export default TeacherRankingPage;
