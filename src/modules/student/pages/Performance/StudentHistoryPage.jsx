import React from 'react';
import { DashboardHeader } from '@/shared/design';
import { Card } from '@/shared/components/ui/card';

const StudentHistoryPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader title="Histórico Acadêmico" subtitle="Visualize todo seu histórico" role="student" />
      <Card className="p-6 bg-white dark:bg-slate-900">
        <p className="text-center text-slate-600">Histórico em desenvolvimento</p>
      </Card>
    </div>
  );
};

export default StudentHistoryPage;
