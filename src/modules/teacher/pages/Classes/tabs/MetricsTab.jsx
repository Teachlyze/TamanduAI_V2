import React from 'react';
import { BarChart2, TrendingUp } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';

const MetricsTab = ({ classId }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Métricas da Turma</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Nota Média', value: '7.8', color: 'green' },
          { label: 'Taxa de Entrega', value: '82%', color: 'blue' },
          { label: 'Engajamento', value: '75%', color: 'purple' }
        ].map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="text-3xl font-bold mb-2">{stat.value}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-12 text-center">
        <BarChart2 className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-semibold mb-2">Análises Detalhadas</h3>
        <p className="text-slate-600 dark:text-slate-400">
          Gráficos e análises detalhadas estarão disponíveis em breve
        </p>
      </Card>
    </div>
  );
};

export default MetricsTab;
