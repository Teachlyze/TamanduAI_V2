import React from 'react';
import { Brain } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { DashboardHeader } from '@/shared/design';

const StudentPublicQuizzesPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader title="Quizzes Públicos" subtitle="Teste seus conhecimentos" role="student" />
      <Card className="p-8 bg-white dark:bg-slate-900 text-center">
        <Brain className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <p className="text-slate-600">Quizzes em desenvolvimento</p>
      </Card>
    </div>
  );
};

export default StudentPublicQuizzesPage;
