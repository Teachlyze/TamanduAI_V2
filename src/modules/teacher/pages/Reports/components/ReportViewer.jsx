import React, { useState } from 'react';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Download, Printer, Share2, X, FileText } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from '@/shared/components/ui/use-toast';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { exportToPDF } from '@/shared/utils/exportUtils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// Helper para truncar texto com tooltip
const TruncateWithTooltip = ({ text, maxLength = 30 }) => {
  if (!text || text.length <= maxLength) return <span>{text}</span>;
  
  return (
    <UITooltip>
      <TooltipTrigger>
        <span className="cursor-help">{text.slice(0, maxLength)}…</span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{text}</p>
      </TooltipContent>
    </UITooltip>
  );
};

const ReportViewer = ({ report, onClose }) => {
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);
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

  // Função melhorada para exportar CSV
  const exportToCSV = () => {
    try {
      // Criar conteúdo CSV formatado
      let csvContent = '';
      
      // Adicionar cabeçalho do relatório
      csvContent += `${report.title || report.templateName}\n`;
      csvContent += `Gerado em: ${new Date(report.generatedAt).toLocaleString('pt-BR')}\n\n`;
      
      // Adicionar sumário se existir
      if (report.summary) {
        csvContent += 'RESUMO\n';
        Object.entries(report.summary).forEach(([key, value]) => {
          csvContent += `"${key}","${value}"\n`;
        });
        csvContent += '\n';
      }
      
      // Adicionar tabelas se existirem
      if (report.tables && report.tables.length > 0) {
        report.tables.forEach((table, index) => {
          csvContent += `${table.title}\n`;
          csvContent += table.headers.join(',') + '\n';
          table.rows.forEach(row => {
            csvContent += row.map(cell => {
              const s = typeof cell === 'object' ? JSON.stringify(cell) : String(cell ?? '');
              return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
            }).join(',');
            csvContent += '\n';
          });
          csvContent += '\n';
        });
      }
      
      // Adicionar detalhes se existirem
      if (report.details && Array.isArray(report.details)) {
        csvContent += 'DETALHES\n';
        report.details.forEach((classData, index) => {
          csvContent += `\n${classData.className} - ${classData.subject}\n`;
          csvContent += `Atividades: ${classData.activities}, Média: ${classData.avgGrade}, Frequência: ${classData.attendanceRate}%\n`;
          if (classData.details && classData.details.length > 0) {
            csvContent += 'Atividade,Nota,Valor,Data,Status\n';
            classData.details.forEach(detail => {
              csvContent += `"${detail.activityName}","${detail.grade}","${detail.maxGrade}","${detail.date}","${detail.status}"\n`;
            });
          }
        });
      }
      
      // Download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
    } catch (e) {
      toast({ variant: 'destructive', title: 'Falha na exportação', description: 'Tente novamente.' });
    }
  };

  // Função para exportar para PDF
  const exportToPDFReport = () => {
    try {
      const name = (report.title || report.templateName || 'relatorio').toLowerCase().replace(/\s+/g, '-');
      
      // Preparar dados para o PDF
      const data = report.data || [];
      const columns = report.columns || Object.keys(data[0] || {}).map(key => ({ header: key, key }));
      
      exportToPDF(
        data,
        name,
        columns,
        {
          title: report.title || report.templateName || 'Relatório',
          subtitle: `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,
          orientation: 'landscape'
        }
      );
      
      toast({ title: 'Exportado (PDF)', description: 'Arquivo PDF baixado com sucesso.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Falha na exportação', description: 'Tente novamente.' });
    }
  };

  // Função para imprimir com otimizações
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setIsPrinting(false), 100);
    }, 100);
  };

  return (
    <>
      {/* CSS específico para impressão */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .print-content .dark\\:bg-slate-900 {
            background: white !important;
          }
          .print-content .dark\\:text-white {
            color: black !important;
          }
          .print-content .dark\\:text-slate-200 {
            color: black !important;
          }
          .print-content .dark\\:border-slate-700 {
            border-color: #e2e8f0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-after: always;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
        }
      `}</style>
      
      <div className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 overflow-auto no-print ${isPrinting ? 'opacity-0 pointer-events-none' : ''}`}>
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-auto bg-white dark:bg-slate-900 print-content">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between z-10 no-print">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white break-words pr-4">
              <TruncateWithTooltip text={report.title || report.templateName} maxLength={50} />
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Gerado em {new Date(report.generatedAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDFReport}
            >
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 avoid-break">
              {Object.entries(report.summary).map(([key, value]) => (
                <Card key={key} className="p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1 break-words">
                    {typeof value === 'string' && value.length > 20 ? (
                      <TruncateWithTooltip text={value} maxLength={20} />
                    ) : (
                      typeof value === 'number' ? value.toFixed(1) : value
                    )}
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
            <Card key={index} className="p-6 avoid-break">
              <h3 className="text-lg font-bold mb-4">{table.title}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
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
                          <td key={j} className="p-2 max-w-xs">
                            {typeof cell === 'string' && cell.length > 30 ? (
                              <TruncateWithTooltip text={cell} maxLength={30} />
                            ) : (
                              cell
                            )}
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
          {report.details && Array.isArray(report.details) && report.templateName === 'Boletim Individual' && (
            <div className="space-y-6 avoid-break">
              {report.details.map((classData, index) => (
                <Card key={index} className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                      <TruncateWithTooltip text={classData.className} maxLength={40} />
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{classData.subject}</p>
                  </div>
                  
                  {/* Summary Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-xs text-blue-600 dark:text-blue-400">Atividades</p>
                      <p className="text-lg font-bold text-blue-800 dark:text-blue-300">{classData.activities}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-xs text-green-600 dark:text-green-400">Média</p>
                      <p className="text-lg font-bold text-green-800 dark:text-green-300">{classData.avgGrade}</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-xs text-purple-600 dark:text-purple-400">Frequência</p>
                      <p className="text-lg font-bold text-purple-800 dark:text-purple-300">{classData.attendanceRate}%</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-xs text-amber-600 dark:text-amber-400">Maior Nota</p>
                      <p className="text-lg font-bold text-amber-800 dark:text-amber-300">{classData.maxGrade}</p>
                    </div>
                  </div>
                  
                  {/* Activities Table */}
                  {classData.details && classData.details.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2 text-slate-800 dark:text-slate-200">Atividades Avaliadas:</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                              <th className="text-left p-2">Atividade</th>
                              <th className="text-left p-2">Nota</th>
                              <th className="text-left p-2">Valor</th>
                              <th className="text-left p-2">Data</th>
                              <th className="text-left p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classData.details.map((detail, i) => (
                              <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                                <td className="p-2 max-w-xs">
                                  <TruncateWithTooltip text={detail.activityName} maxLength={30} />
                                </td>
                                <td className="p-2 font-semibold">{detail.grade}</td>
                                <td className="p-2 text-slate-600 dark:text-slate-400">{detail.maxGrade}</td>
                                <td className="p-2">{detail.date}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    detail.status === 'No prazo' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                  }`}>
                                    {detail.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Generic Details Array */}
          {report.details && Array.isArray(report.details) && report.templateName !== 'Boletim Individual' && (
            <Card className="p-6 avoid-break">
              <h3 className="text-lg font-bold mb-4">Detalhes</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {Object.keys(report.details[0] || {}).map((key, i) => (
                        <th key={i} className="text-left p-2 font-semibold capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.details.map((item, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                        {Object.values(item).map((value, j) => (
                          <td key={j} className="p-2 max-w-xs">
                            {typeof value === 'string' && value.length > 30 ? (
                              <TruncateWithTooltip text={value} maxLength={30} />
                            ) : (
                              value
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Observations */}
          {report.observations && (
            <Card className="p-6 avoid-break">
              <h3 className="text-lg font-bold mb-4">Observações</h3>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {report.observations}
              </p>
            </Card>
          )}
        </div>
      </Card>
    </div>
    </>
  );
};

export default ReportViewer;
