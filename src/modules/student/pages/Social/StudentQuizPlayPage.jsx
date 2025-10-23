import React from 'react';
import { Play } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { DashboardHeader } from '@/shared/design';

const StudentQuizPlayPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader title="Jogar Quiz" subtitle="Teste seus conhecimentos" role="student" />
      <Card className="p-8 bg-white dark:bg-slate-900 text-center">
        <Play className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <p className="text-slate-600">Interface de quiz em desenvolvimento</p>
      </Card>
    </div>
  );
};

export default StudentQuizPlayPage;
