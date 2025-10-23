import React from 'react';
import { Target } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { DashboardHeader } from '@/shared/design';

const StudentMissionsPage = () => {
  const missions = [
    { id: 1, title: 'Complete 5 atividades', progress: 3, total: 5, reward: 50 },
    { id: 2, title: 'Participe de 3 discussões', progress: 1, total: 3, reward: 30 },
    { id: 3, title: 'Mantenha streak de 7 dias', progress: 4, total: 7, reward: 100 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader title="Missões Diárias" subtitle="Complete missões e ganhe XP" role="student" />
      
      <div className="space-y-4">
        {missions.map(mission => (
          <Card key={mission.id} className="p-6 bg-white dark:bg-slate-900">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-bold">{mission.title}</h3>
                  <p className="text-sm text-slate-600">{mission.progress}/{mission.total} concluído</p>
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-700">+{mission.reward} XP</Badge>
            </div>
            <Progress value={(mission.progress / mission.total) * 100} />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StudentMissionsPage;
