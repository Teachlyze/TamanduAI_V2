import React from 'react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Download, Printer, Share2, X } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from '@/shared/components/ui/use-toast';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const ReportViewer = ({ report, onClose }) => {
  const { toast } = useToast();
  if (!report) return null;

  const renderChart = (type, data) => {
    const truncate = (s, n = 16) => (s?.length > n ? s.slice(0, n) + '…' : s);
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 32, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tickFormatter={(v) => truncate(v)} interval="preserveEnd" />
              <YAxis />
              <Tooltip />
              <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 32, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tickFormatter={(v) => truncate(v)} interval="preserveEnd" />
              <YAxis />
              <Tooltip />
              <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${truncate(entry.name)}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 overflow-auto">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-auto bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {report.title || report.templateName}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Gerado em {new Date(report.generatedAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  // Preferir exportar primeira tabela como CSV se existir
                  if (report.tables && report.tables.length > 0) {
                    const table = report.tables[0];
                    const headers = table.headers || [];
                    const csvRows = [headers.join(',')];
                    (table.rows || []).forEach((row) => {
                      const line = row.map((cell) => {
                        const s = typeof cell === 'object' ? JSON.stringify(cell) : String(cell ?? '');
                        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
                      }).join(',');
                      csvRows.push(line);
                    });
                    const csv = csvRows.join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const name = (report.title || report.templateName || 'relatorio').toLowerCase().replace(/\s+/g, '-');
                    a.href = url;
                    a.download = `${name}-${Date.now()}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                    toast({ title: 'Exportado (CSV)', description: 'Arquivo CSV baixado com sucesso.' });
                    return;
                  }
                  // Fallback: exportar JSON completo
                  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  const name = (report.title || report.templateName || 'relatorio').toLowerCase().replace(/\s+/g, '-');
                  a.href = url;
                  a.download = `${name}-${Date.now()}.json`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                  toast({ title: 'Exportado (JSON)', description: 'Arquivo JSON baixado com sucesso.' });
                } catch (e) {
                  toast({ variant: 'destructive', title: 'Falha na exportação', description: 'Tente novamente.' });
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  window.print();
                } catch (e) {
                  toast({ variant: 'destructive', title: 'Falha ao imprimir', description: 'Tente novamente.' });
                }
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const title = report.title || report.templateName || 'Relatório';
                  if (navigator.share) {
                    await navigator.share({ title, text: title, url });
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast({ title: 'Link copiado', description: 'Link do relatório copiado para a área de transferência.' });
                  }
                } catch (e) {
                  toast({ variant: 'destructive', title: 'Falha ao compartilhar', description: 'Tente novamente.' });
                }
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Stats */}
          {report.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(report.summary).map(([key, value]) => (
                <Card key={key} className="p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {typeof value === 'number' ? value.toFixed(1) : value}
                  </p>
                </Card>
              ))}
            </div>
          )}

          {/* Charts */}
          {report.charts && report.charts.map((chart, index) => (
            <Card key={index} className="p-6">
              <h3 className="text-lg font-bold mb-4">{chart.title}</h3>
              {renderChart(chart.type, chart.data)}
            </Card>
          ))}

          {/* Tables */}
          {report.tables && report.tables.map((table, index) => (
            <Card key={index} className="p-6">
              <h3 className="text-lg font-bold mb-4">{table.title}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {table.headers.map((header, i) => (
                        <th key={i} className="text-left p-2 font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                        {row.map((cell, j) => (
                          <td key={j} className="p-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          {/* Details */}
          {report.details && (
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Detalhes</h3>
              <div className="prose dark:prose-invert max-w-none">
                {report.details}
              </div>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ReportViewer;
