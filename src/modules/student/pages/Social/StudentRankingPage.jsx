import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { DashboardHeader } from '@/shared/design';
import { supabase } from '@/shared/services/supabaseClient';

const StudentRankingPage = () => {
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    const { data } = await supabase
      .from('gamification_profiles')
      .select('*, user:profiles(name, avatar_url)')
      .order('xp_total', { ascending: false })
      .limit(20);
    
    setRanking(data || []);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader title="Ranking" subtitle="Top alunos por XP" role="student" />
      
      <Card className="p-6 bg-white dark:bg-slate-900">
        <div className="space-y-3">
          {ranking.map((item, idx) => (
            <div key={item.user_id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold w-8">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}</div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                {item.user?.name?.[0] || 'A'}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{item.user?.name}</div>
                <div className="text-sm text-slate-600">Level {item.level}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-600">{item.xp_total} XP</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default StudentRankingPage;
