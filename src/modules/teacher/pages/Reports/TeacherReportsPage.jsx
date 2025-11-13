import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, User, Users, GitCompare, ClipboardList, BarChart, Download,
  Eye, Clock, Star, FileSpreadsheet, FileImage, Plus, History, Settings,
  Filter, X
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader } from '@/shared/design';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import reportService from '@/services/reportService';
import ReportViewer from './components/ReportViewer';
import { cacheService } from '@/shared/services/cacheService';

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
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filterType, setFilterType] = useState(''); // '', 'student', 'class', 'all'
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    loadRecentReports();
    loadClassesAndStudents();
  }, [user]);

  const loadRecentReports = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('report_history')
        .select(`
          id,
          template_id,
          template_name,
          filter_type,
          student_id,
          class_id,
          activity_id,
          period,
          created_at,
          report_data
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      setRecentReports(data || []);
      console.log(`✅ [Reports] ${data?.length || 0} relatórios carregados do histórico`);
    } catch (error) {
      logger.error('Erro ao carregar histórico:', error);
      setRecentReports([]);
    }
  };

  const loadClassesAndStudents = async () => {
    if (!user) return;
    
    try {
      setLoadingData(true);
      
      // Chave do cache para este professor
      const cacheKey = `teacher:reports:data:${user.id}:${period}`;
      
      // Tentar buscar do cache
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        console.log('✅ [Reports] Dados carregados do cache');
        setClasses(cached.classes || []);
        setStudents(cached.students || []);
        setLoadingData(false);
        return;
      }
      
      console.log('🔄 [Reports] Buscando dados do banco...');
      
      // Buscar turmas do professor
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name, subject')
        .eq('created_by', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (classesError) throw classesError;
      setClasses(classesData || []);
      
      // Buscar alunos de todas as turmas do professor
      const { data: studentsData, error: studentsError } = await supabase
        .from('class_members')
        .select(`
          user_id,
          profile:profiles!class_members_user_id_fkey(id, full_name, email),
          class:classes!class_members_class_id_fkey(id, name)
        `)
        .in('class_id', classesData?.map(c => c.id) || [])
        .eq('role', 'student');
      
      if (studentsError) throw studentsError;
      
      // Agrupar alunos únicos
      const uniqueStudents = [];
      const seenIds = new Set();
      studentsData?.forEach(member => {
        if (member.profile && !seenIds.has(member.profile.id)) {
          seenIds.add(member.profile.id);
          uniqueStudents.push({
            id: member.profile.id,
            name: member.profile.full_name,
            email: member.profile.email,
            className: member.class?.name
          });
        }
      });
      
      setStudents(uniqueStudents);
      
      // Salvar no cache (TTL: 5 minutos = 300s)
      await cacheService.set(cacheKey, {
        classes: classesData || [],
        students: uniqueStudents
      }, 300);
      
      console.log('💾 [Reports] Dados salvos no cache (TTL: 5min)');
      
    } catch (error) {
      logger.error('Erro ao carregar dados:', error)
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoadingData(false);
    }
  };

  // Função para determinar se um template deve ser desabilitado baseado nos filtros
  const isTemplateDisabled = (templateId) => {
    // Relatório comparativo sempre ativo - compara todas as turmas ativas
    if (templateId === 'comparative') {
      return false;
    }
    
    // Se selecionou aluno, desabilitar relatórios de turma
    if (filterType === 'student' && ['class-report'].includes(templateId)) {
      return true;
    }
    
    // Se selecionou turma, desabilitar relatórios individuais
    if (filterType === 'class' && ['individual-student'].includes(templateId)) {
      return true;
    }
    
    // Se selecionou atividade, apenas permitir relatório de atividade
    if (selectedActivity && templateId !== 'activity-report') {
      return true;
    }
    
    return false;
  };

  const handleGenerateReport = async (templateId) => {
    // Relatório comparativo não precisa de filtros - compara todas as turmas
    if (templateId !== 'comparative') {
      // Validar filtros obrigatórios para outros relatórios
      if (!filterType) {
        toast({
          title: 'Selecione o escopo do relatório',
          description: 'Escolha se deseja gerar para um aluno, turma ou todos os alunos.',
          variant: 'destructive'
        });
        return;
      }

      if (filterType === 'student' && !selectedStudent) {
        toast({
          title: 'Selecione um aluno',
          description: 'Escolha qual aluno você deseja incluir no relatório.',
          variant: 'destructive'
        });
        return;
      }

      if (filterType === 'class' && !selectedClass) {
        toast({
          title: 'Selecione uma turma',
          description: 'Escolha qual turma você deseja incluir no relatório.',
          variant: 'destructive'
        });
        return;
      }
    }

    setGeneratingReport(true);
    setCurrentReport(null);

    try {
      let targetId = user?.id; // Padrão: professor
      
      // Para relatórios que precisam de contexto específico
      const reportInfo = REPORT_TEMPLATES.find(t => t.id === templateId);
      
      toast({
        title: `📊 Gerando ${reportInfo?.name || 'Relatório'}`,
        description: 'Processando dados... Aguarde.',
      });

      // Ajustar targetId baseado no filterType
      if (filterType === 'student' && selectedStudent) {
        targetId = selectedStudent; // Usar ID do aluno selecionado
      } else if (filterType === 'class' && selectedClass) {
        targetId = selectedClass; // Usar ID da turma selecionada
      } else if (templateId === 'class-report') {
        // Para relatório de turma sem filtro, usar primeira turma
        if (!selectedClass) {
          const { data: classes } = await supabase
            .from('classes')
            .select('id, is_active')
            .eq('created_by', user.id)
            .eq('is_active', true)
            .order('name', { ascending: true });
          if (!classes || classes.length === 0) {
            throw new Error('Nenhuma turma ativa encontrada para gerar o relatório.');
          }
          targetId = classes[0].id;
        } else {
          targetId = selectedClass;
        }
      }

      // Gerar relatório com dados reais e filtros aplicados
      const report = await reportService.generateReport(templateId, targetId, { 
        period: parseInt(period), 
        includeArchived: false,
        filterType,
        studentId: selectedStudent,
        classId: selectedClass,
        activityId: selectedActivity
      });
      
      setCurrentReport(report);
      
      toast({
        title: '✅ Relatório Gerado',
        description: `${report.templateName} gerado com sucesso!`,
      });

      // Salvar no histórico do banco de dados
      try {
        const { error: historyError } = await supabase
          .from('report_history')
          .insert({
            teacher_id: user.id,
            template_id: templateId,
            template_name: reportInfo?.name || 'Relatório',
            filter_type: filterType || null,
            student_id: selectedStudent || null,
            class_id: selectedClass || null,
            activity_id: selectedActivity || null,
            period: parseInt(period),
            report_data: report
          });
        
        if (historyError) {
          logger.error('Erro ao salvar histórico:', historyError);
        } else {
          console.log('✅ Relatório salvo no histórico');
        }
      } catch (error) {
        logger.error('Erro ao salvar histórico:', error);
      }

      // Adicionar ao histórico local
      setRecentReports(prev => [
        {
          id: Date.now(),
          templateId,
          templateName: reportInfo?.name,
          generatedAt: new Date().toISOString(),
          cached: false,
          filterType,
          studentId: selectedStudent,
          classId: selectedClass
        },
        ...prev.slice(0, 9)
      ]);

    } catch (error) {
      logger.error('Erro ao gerar relatório:', error)
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

  // Helpers: Export
  const deriveTabularData = (report) => {
    if (!report) return null;
    if (Array.isArray(report)) return report;
    if (Array.isArray(report?.rows)) return report.rows;
    if (Array.isArray(report?.data)) return report.data;
    if (Array.isArray(report?.items)) return report.items;
    // Try to find first array in object values
    const arr = Object.values(report).find((v) => Array.isArray(v));
    if (Array.isArray(arr)) return arr;
    // Fallback: single row from flattened object
    return [report];
  };

  const toCSV = (rows) => {
    if (!rows || rows.length === 0) return '';
    // Collect headers
    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row || {}).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );
    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const s = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const headerLine = headers.map(escape).join(',');
    const lines = rows.map((row) => headers.map((h) => escape(row?.[h])).join(','));
    return [headerLine, ...lines].join('\n');
  };

  const downloadBlob = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (!currentReport) {
      toast({ title: 'Nenhum relatório para exportar', description: 'Gere um relatório primeiro.', variant: 'destructive' });
      return;
    }
    try {
      const rows = deriveTabularData(currentReport).map((r) => {
        // flatten simple nested props
        const flat = {};
        Object.entries(r || {}).forEach(([k, v]) => {
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            Object.entries(v).forEach(([sk, sv]) => {
              flat[`${k}.${sk}`] = sv;
            });
          } else {
            flat[k] = v;
          }
        });
        return flat;
      });
      const csv = toCSV(rows);
      if (!csv) throw new Error('Não há dados tabulares para exportar');
      const name = (currentReport?.templateName || 'relatorio')
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-');
      downloadBlob(csv, `${name}-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
      toast({ title: 'Exportado com sucesso', description: 'Arquivo CSV baixado.' });
    } catch (err) {
      logger.warn('CSV export fallback to JSON:', err)
      const name = (currentReport?.templateName || 'relatorio')
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-');
      downloadBlob(JSON.stringify(currentReport, null, 2), `${name}-${Date.now()}.json`, 'application/json');
      toast({ title: 'Exportado como JSON', description: 'Não foi possível gerar CSV. Baixamos o JSON.', variant: 'destructive' });
    }
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

      {/* Filtros Obrigatórios */}
      <Card className="mt-4 sm:mt-6 p-4 sm:p-6 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Filter className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-bold mb-2 text-blue-900 dark:text-blue-100">
              Selecione o Escopo do Relatório
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Escolha para quem deseja gerar o relatório antes de selecionar um template
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Tipo de Filtro */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Tipo de Relatório</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Aluno Específico</SelectItem>
                    <SelectItem value="class">Turma Completa</SelectItem>
                    <SelectItem value="all">Todos os Alunos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Aluno (se tipo = student) */}
              {filterType === 'student' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Selecionar Aluno</Label>
                  <Select value={selectedStudent || ''} onValueChange={setSelectedStudent}>
                    <SelectTrigger className="bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Escolha um aluno..." />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} {student.className && `(${student.className})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Seletor de Turma (se tipo = class) */}
              {filterType === 'class' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Selecionar Turma</Label>
                  <Select value={selectedClass || ''} onValueChange={setSelectedClass}>
                    <SelectTrigger className="bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Escolha uma turma..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.subject && `- ${cls.subject}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Período */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Período</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="bg-white dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="180">Últimos 6 meses</SelectItem>
                    <SelectItem value="365">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Limpar Filtros */}
            {filterType && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Filtro ativo:</strong> {
                    filterType === 'student' ? `Aluno - ${students.find(s => s.id === selectedStudent)?.name || 'Selecione'}` :
                    filterType === 'class' ? `Turma - ${classes.find(c => c.id === selectedClass)?.name || 'Selecione'}` :
                    'Todos os alunos'
                  }
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterType('');
                    setSelectedStudent(null);
                    setSelectedClass(null);
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {REPORT_TEMPLATES.map((template, index) => {
              const Icon = template.icon;
              const disabled = isTemplateDisabled(template.id);
              
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{ pointerEvents: 'auto' }}
                >
                  <Card className={`p-6 h-full flex flex-col hover:shadow-lg transition-shadow relative ${disabled ? 'opacity-50' : ''}`} style={{ pointerEvents: 'auto' }}>
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
                          if (disabled) {
                            toast({
                              title: 'Template incompatível',
                              description: 'Este template não é compatível com os filtros selecionados.',
                              variant: 'destructive'
                            });
                            return;
                          }
                          logger.debug('Botão Gerar clicado:', template.id)
                          handleGenerateReport(template.id);
                        }}
                        disabled={disabled}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Gerar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          logger.debug('Botão Preview clicado')
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Button 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/20"
                onClick={() => {
                  logger.debug('Exportar PDF clicado')
                  toast({ title: 'Exportar PDF', description: 'Funcionalidade em desenvolvimento' });
                }}
              >
                <FileText className="w-8 h-8 mb-2 text-red-600" />
                <span className="text-sm font-medium">PDF</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950/20"
                onClick={handleExportExcel}
              >
                <FileSpreadsheet className="w-8 h-8 mb-2 text-green-600" />
                <span className="text-sm font-medium">Excel</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col items-center justify-center hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/20"
                onClick={() => {
                  logger.debug('Exportar Word clicado')
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
                  logger.debug('Exportar PNG clicado')
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
