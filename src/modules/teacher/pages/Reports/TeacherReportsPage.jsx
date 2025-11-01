import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, User, Users, GitCompare, ClipboardList, BarChart, Download,
  Eye, Clock, Star, FileSpreadsheet, FileImage, Plus, History, Settings
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader } from '@/shared/design';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import reportService from '@/services/reportService';
import ReportViewer from './components/ReportViewer';

const REPORT_TEMPLATES = [
  {
    id: 'individual-student',
    name: 'Relatório Individual de Aluno',
    description: 'Relatório completo de um aluno específico',
    icon: User,
    color: 'from-blue-500 to-cyan-500',
    includes: [
      'Dados pessoais',
      'Histórico de notas',
      'Frequência',
      'Feedbacks recebidos',
      'Gráficos de evolução',
      'Análise de desempenho'
    ],
    usage: 'Reunião com pais, coordenação',
    popular: true
  },
  {
    id: 'class-report',
    name: 'Relatório de Turma',
    description: 'Análise completa de uma turma',
    icon: Users,
    color: 'from-purple-500 to-pink-500',
    includes: [
      'Estatísticas gerais',
      'Distribuição de notas',
      'Taxa de aprovação/reprovação',
      'Média da turma',
      'Alunos em destaque',
      'Áreas de atenção'
    ],
    usage: 'Fechamento de semestre, relatórios institucionais',
    popular: true
  },
  {
    id: 'comparative',
    name: 'Relatório Comparativo',
    description: 'Comparação entre múltiplas turmas',
    icon: GitCompare,
    color: 'from-orange-500 to-red-500',
    includes: [
      'Tabela comparativa',
      'Gráficos lado a lado',
      'Análise de diferenças',
      'Melhores práticas identificadas'
    ],
    usage: 'Análise pedagógica, ajustes metodológicos'
  },
  {
    id: 'activity-report',
    name: 'Relatório de Atividade',
    description: 'Análise de uma atividade específica',
    icon: ClipboardList,
    color: 'from-green-500 to-teal-500',
    includes: [
      'Estatísticas de submissão',
      'Distribuição de notas',
      'Questões mais erradas',
      'Tempo médio de resolução',
      'Lista de notas por aluno'
    ],
    usage: 'Validação de atividade, ajustes'
  },
  {
    id: 'bulletin',
    name: 'Boletim (Período)',
    description: 'Boletim formal por período',
    icon: FileText,
    color: 'from-indigo-500 to-purple-500',
    includes: [
      'Notas por disciplina',
      'Médias parciais e finais',
      'Frequência',
      'Observações do professor',
      'Assinatura'
    ],
    usage: 'Entrega oficial para instituição/pais',
    popular: true
  },
  {
    id: 'teacher-performance',
    name: 'Relatório de Desempenho (Professor)',
    description: 'Auto-avaliação do professor',
    icon: BarChart,
    color: 'from-yellow-500 to-orange-500',
    includes: [
      'Atividades postadas',
      'Correções realizadas',
      'Tempo médio de feedback',
      'Satisfação dos alunos',
      'Evolução das turmas'
    ],
    usage: 'Avaliação institucional, portfólio'
  }
];

const TeacherReportsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [recentReports, setRecentReports] = useState([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    loadRecentReports();
  }, [user]);

  const loadRecentReports = async () => {
    // Placeholder - implementar histórico de relatórios
    setRecentReports([]);
  };

  const handleGenerateReport = async (templateId) => {
    setGeneratingReport(true);
    setCurrentReport(null);

    try {
      let targetId = user?.id; // Usar ID do professor por padrão
      
      // Para relatórios que precisam de contexto específico
      const reportInfo = REPORT_TEMPLATES.find(t => t.id === templateId);
      
      toast({
        title: `📊 Gerando ${reportInfo?.name || 'Relatório'}`,
        description: 'Processando dados... Aguarde.',
      });

      // Gerar relatório com dados reais
      const report = await reportService.generateReport(templateId, targetId, { period: parseInt(period) });
      
      setCurrentReport(report);
      
      toast({
        title: '✅ Relatório Gerado',
        description: `${report.templateName} gerado com sucesso!`,
      });

      // Adicionar ao histórico
      setRecentReports(prev => [
        {
          id: Date.now(),
          templateId,
          generatedAt: new Date().toISOString(),
          cached: false
        },
        ...prev.slice(0, 9)
      ]);

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível gerar o relatório',
        variant: 'destructive'
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleViewHistory = () => {
    setActiveTab('history');
  };

  const handleManageTemplates = () => {
    toast({
      title: 'Em desenvolvimento',
      description: 'Gerenciamento de templates será implementado em breve'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header */}
      <DashboardHeader
        title="Relatórios"
        subtitle="Gere relatórios formais e exportáveis"
        role="teacher"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleViewHistory}>
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
            <Button variant="outline" onClick={handleManageTemplates}>
              <Settings className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button onClick={() => toast({ title: 'Selecione um template abaixo' })}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Relatório
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REPORT_TEMPLATES.map((template, index) => {
              const Icon = template.icon;
              
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <Card className="p-6 h-full flex flex-col hover:shadow-lg transition-shadow relative" style={{ pointerEvents: 'auto' }}>
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                    
                    {/* Popular Badge */}
                    {template.popular && (
                      <Badge className="absolute top-4 right-4 bg-yellow-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    )}

                    {/* Icon */}
                    <div className="mb-4 relative z-10">
                      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${template.color}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold mb-2">{template.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      {template.description}
                    </p>

                    {/* Includes */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Inclui:</p>
                      <ul className="space-y-1">
                        {template.includes.slice(0, 3).map((item, i) => (
                          <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-center">
                            <div className="w-1 h-1 rounded-full bg-slate-400 mr-2" />
                            {item}
                          </li>
                        ))}
                        {template.includes.length > 3 && (
                          <li className="text-xs text-blue-600 dark:text-blue-400">
                            +{template.includes.length - 3} mais...
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Usage */}
                    <div className="mb-4">
                      <Badge variant="outline" className="text-xs">
                        {template.usage}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto pt-4 relative z-50">
                      <Button 
                        className={`flex-1 bg-gradient-to-r ${template.color} text-white hover:opacity-90`}
                        onClick={() => {
                          console.log('Botão Gerar clicado:', template.id);
                          handleGenerateReport(template.id);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Gerar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          console.log('Botão Preview clicado');
                          toast({ title: 'Preview', description: 'Visualização será implementada' });
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <Card className="mt-8 p-6">
            <h3 className="text-lg font-bold mb-4">Formatos de Exportação</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/20"
                onClick={() => {
                  console.log('Exportar PDF clicado');
                  toast({ title: 'Exportar PDF', description: 'Funcionalidade em desenvolvimento' });
                }}
              >
                <FileText className="w-8 h-8 mb-2 text-red-600" />
                <span className="text-sm font-medium">PDF</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950/20"
                onClick={() => {
                  console.log('Exportar Excel clicado');
                  toast({ title: 'Exportar Excel', description: 'Funcionalidade em desenvolvimento' });
                }}
              >
                <FileSpreadsheet className="w-8 h-8 mb-2 text-green-600" />
                <span className="text-sm font-medium">Excel</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/20"
                onClick={() => {
                  console.log('Exportar Word clicado');
                  toast({ title: 'Exportar Word', description: 'Funcionalidade em desenvolvimento' });
                }}
              >
                <FileText className="w-8 h-8 mb-2 text-blue-600" />
                <span className="text-sm font-medium">Word</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950/20"
                onClick={() => {
                  console.log('Exportar PNG clicado');
                  toast({ title: 'Exportar PNG', description: 'Funcionalidade em desenvolvimento' });
                }}
              >
                <FileImage className="w-8 h-8 mb-2 text-purple-600" />
                <span className="text-sm font-medium">PNG</span>
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card className="p-12">
            <div className="text-center">
              <History className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-bold mb-2">Nenhum relatório gerado ainda</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Relatórios que você gerar aparecerão aqui para fácil acesso
              </p>
              <Button onClick={() => setActiveTab('templates')}>
                <Plus className="w-4 h-4 mr-2" />
                Gerar Primeiro Relatório
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Viewer Modal */}
      {currentReport && (
        <ReportViewer 
          report={currentReport} 
          onClose={() => setCurrentReport(null)} 
        />
      )}
    </div>
  );
};

export default TeacherReportsPage;
