import React, { useState, useEffect } from 'react';
import { Trophy, Star, Award } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { DashboardHeader, StatsCard } from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

const StudentGamificationPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gamification, setGamification] = useState(null);

  useEffect(() => {
    loadGamification();
  }, [user]);

  const loadGamification = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('gamification_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setGamification(data || { level: 1, xp_total: 0, xp_current: 0, xp_to_next_level: 100 });
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader title="Gamificação" subtitle="Seu progresso e conquistas" role="student" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard title="Nível Atual" value={gamification?.level || 1} icon={Trophy} gradient="from-amber-500 to-yellow-500" delay={0} />
        <StatsCard title="XP Total" value={gamification?.xp_total || 0} icon={Star} gradient="from-purple-500 to-pink-500" delay={0.1} />
        <StatsCard title="Badges" value={gamification?.badges_count || 0} icon={Award} gradient="from-blue-500 to-cyan-500" delay={0.2} />
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900 mb-6">
        <h3 className="font-bold text-lg mb-4">Progresso para o Próximo Nível</h3>
        <Progress value={(gamification?.xp_current / gamification?.xp_to_next_level) * 100} className="h-4" />
        <p className="text-sm text-slate-600 mt-2">
          {gamification?.xp_current} / {gamification?.xp_to_next_level} XP
        </p>
      </Card>

      <Card className="p-6 bg-white dark:bg-slate-900">
        <h3 className="font-bold text-lg mb-4">Conquistas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['🏆', '⭐', '🎯', '🔥', '💎', '🚀', '🎓', '📚'].map((emoji, i) => (
            <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
              <div className="text-4xl mb-2">{emoji}</div>
              <Badge>Conquista {i + 1}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default StudentGamificationPage;
