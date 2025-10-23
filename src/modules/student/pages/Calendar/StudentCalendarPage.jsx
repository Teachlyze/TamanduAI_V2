import React from 'react';
import { Calendar } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { DashboardHeader } from '@/shared/design';

const StudentCalendarPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <DashboardHeader title="Calendário" subtitle="Eventos e prazos" role="student" />
      <Card className="p-6 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-600">Calendário em desenvolvimento</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentCalendarPage;
