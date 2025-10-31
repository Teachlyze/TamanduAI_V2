import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, UserPlus, Search, Filter, Download, Mail, MoreVertical,
  Eye, UserX, TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  Copy, ExternalLink, Calendar, FileText
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { supabase } from '@/shared/services/supabaseClient';
import { toast } from '@/shared/components/ui/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AddStudentModal from '../components/AddStudentModal';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog';

/**
 * TAB 6: ALUNOS - Gestão Completa de Membros da Turma
 * 
 * Funcionalidades:
 * 1. Lista de alunos com métricas
 * 2. Busca e filtros avançados
 * 3. Adicionar aluno (múltiplos métodos)
 * 4. Ver detalhes do aluno
 * 5. Remover aluno
 * 6. Gerar links de convite
 * 7. Exportar lista
 */
const StudentsTab = ({ classId, classData }) => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [removeConfirm, setRemoveConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    alert: 0,
    critical: 0
  });

  useEffect(() => {
    loadStudents();
  }, [classId]);

  const loadStudents = async () => {
    try {
      setLoading(true);

      // Buscar membros da turma
      const { data: members, error: membersError } = await supabase
        .from('class_members')
        .select(`
          *,
          profile:profiles!inner(id, full_name, email, avatar_url)
        `)
        .eq('class_id', classId)
        .eq('role', 'student')
        .order('joined_at', { ascending: false });

      if (membersError) throw membersError;

      // Buscar IDs de atividades da turma
      const { data: activityIds } = await supabase
        .from('activity_class_assignments')
        .select('activity_id')
        .eq('class_id', classId);

      const ids = activityIds?.map(a => a.activity_id) || [];

      // Para cada aluno, calcular métricas
      const studentsWithMetrics = await Promise.all(
        (members || []).map(async (member) => {
          if (!member.user_id || ids.length === 0) {
            return {
              ...member,
              avgGrade: null,
              deliveryRate: 0,
              submissionsCount: 0,
              totalActivities: ids.length,
              status: 'active',
              lastActivity: null
            };
          }

          // Buscar submissões do aluno
          const { data: submissions } = await supabase
            .from('submissions')
            .select('grade, status, submitted_at')
            .eq('student_id', member.user_id)
            .in('activity_id', ids);

          // Calcular nota média
          const grades = submissions
            ?.map(s => parseFloat(s.grade))
            .filter(g => !isNaN(g)) || [];
          const avgGrade = grades.length > 0
            ? grades.reduce((sum, g) => sum + g, 0) / grades.length
            : null;

          // Calcular taxa de entrega
          const submitted = submissions?.filter(s => 
            s.status === 'submitted' || s.status === 'graded'
          ).length || 0;
          const deliveryRate = ids.length > 0 
            ? (submitted / ids.length) * 100 
            : 0;

          // Determinar status
          let status = 'active';
          if (avgGrade !== null && avgGrade < 5.0) {
            status = 'critical';
          } else if ((avgGrade !== null && avgGrade < 6.0) || deliveryRate < 60) {
            status = 'alert';
          }

          // Última atividade
          const lastActivity = submissions && submissions.length > 0
            ? new Date(Math.max(...submissions.map(s => new Date(s.submitted_at || 0))))
            : null;

          return {
            ...member,
            avgGrade,
            deliveryRate,
            submissionsCount: submitted,
            totalActivities: ids.length,
            status,
            lastActivity
          };
        })
      );

      // Calcular estatísticas
      const statsData = {
        total: studentsWithMetrics.length,
        active: studentsWithMetrics.filter(s => s.status === 'active').length,
        alert: studentsWithMetrics.filter(s => s.status === 'alert').length,
        critical: studentsWithMetrics.filter(s => s.status === 'critical').length
      };

      setStudents(studentsWithMetrics);
      setStats(statsData);

    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      toast({
        title: 'Erro ao carregar alunos',
        description: error.message,
        variant: 'destructive'
      });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filtra e ordena lista de alunos
   */
  const getFilteredAndSortedStudents = () => {
    let filtered = students;

    // Aplicar busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.profile?.full_name?.toLowerCase().includes(query) ||
        s.profile?.email?.toLowerCase().includes(query)
      );
    }

    // Filtrar por status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filterStatus);
    }

    // Filtrar por faixa de nota
    if (filterGrade !== 'all') {
      filtered = filtered.filter(s => {
        if (!s.avgGrade) return filterGrade === 'none';
        
        switch (filterGrade) {
          case 'excellent': return s.avgGrade >= 9.0;
          case 'good': return s.avgGrade >= 7.0 && s.avgGrade < 9.0;
          case 'regular': return s.avgGrade >= 5.0 && s.avgGrade < 7.0;
          case 'low': return s.avgGrade < 5.0;
          default: return true;
        }
      });
    }

    // Filtrar por taxa de entrega
    if (filterDelivery !== 'all') {
      filtered = filtered.filter(s => {
        switch (filterDelivery) {
          case 'high': return s.deliveryRate >= 80;
          case 'medium': return s.deliveryRate >= 50 && s.deliveryRate < 80;
          case 'low': return s.deliveryRate < 50;
          default: return true;
        }
      });
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.profile?.full_name || '').localeCompare(b.profile?.full_name || '');
        case 'grade':
          return (b.avgGrade || 0) - (a.avgGrade || 0);
        case 'delivery':
          return b.deliveryRate - a.deliveryRate;
        case 'recent':
          return new Date(b.joined_at) - new Date(a.joined_at);
        default:
          return 0;
      }
    });

    return filtered;
  };

  /**
   * Remove aluno da turma
   */
  const handleViewStudentDetails = (student) => {
    toast({
      title: 'Em desenvolvimento',
      description: 'Página de detalhes do aluno será implementada em breve'
    });
    // TODO: Navegar para página de detalhes do aluno
  };

  const handleViewStudentActivities = (student) => {
    toast({
      title: 'Em desenvolvimento',
      description: 'Visualização de atividades do aluno será implementada em breve'
    });
    // TODO: Abrir modal com atividades do aluno
  };

  const handleSendMessage = (student) => {
    toast({
      title: 'Em desenvolvimento',
      description: 'Sistema de mensagens será implementado em breve'
    });
    // TODO: Abrir modal de mensagem
  };

  const handleRemoveStudent = (studentId, studentName) => {
    setRemoveConfirm({ isOpen: true, id: studentId, name: studentName });
  };

  const confirmRemove = async () => {
    const { id, name } = removeConfirm;
    
    try {
      const { error } = await supabase
        .from('class_members')
        .delete()
        .eq('user_id', id)
        .eq('class_id', classId);

      if (error) throw error;

      toast({
        title: '✅ Aluno removido',
        description: `${name} foi removido da turma com sucesso.`
      });

      loadStudents();
    } catch (error) {
      console.error('Erro ao remover aluno:', error);
      toast({
        title: '❌ Erro ao remover aluno',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  /**
   * Exporta lista de alunos para CSV
   */
  const handleExportStudents = () => {
    const filtered = getFilteredAndSortedStudents();
    
    const csvContent = [
      ['Nome', 'Email', 'Nota Média', 'Taxa de Entrega', 'Status', 'Data de Entrada'],
      ...filtered.map(s => [
        s.profile?.full_name || '',
        s.profile?.email || '',
        s.avgGrade?.toFixed(1) || 'N/A',
        `${s.deliveryRate.toFixed(0)}%`,
        s.status === 'active' ? 'Ativo' : s.status === 'alert' ? 'Alerta' : 'Crítico',
        format(new Date(s.joined_at), 'dd/MM/yyyy', { locale: ptBR })
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alunos_${classData?.name || 'turma'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: 'Lista exportada',
      description: 'Arquivo CSV baixado com sucesso.'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const filteredStudents = getFilteredAndSortedStudents();

  return (
    <div className="space-y-6">
      {/* ========== CARDS DE ESTATÍSTICAS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.active}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Ativos</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.alert}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Em Alerta</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.critical}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Crítico</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ========== HEADER COM AÇÕES ========== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Alunos da Turma</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {filteredStudents.length} de {stats.total} alunos
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportStudents}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar Aluno
          </Button>
        </div>
      </div>

      {/* ========== FILTROS E BUSCA ========== */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Busca */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro Status */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="alert">Em Alerta</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro Nota */}
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger>
              <SelectValue placeholder="Nota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Notas</SelectItem>
              <SelectItem value="excellent">Excelente (≥9.0)</SelectItem>
              <SelectItem value="good">Bom (7.0-8.9)</SelectItem>
              <SelectItem value="regular">Regular (5.0-6.9)</SelectItem>
              <SelectItem value="low">Baixo (&lt;5.0)</SelectItem>
              <SelectItem value="none">Sem Nota</SelectItem>
            </SelectContent>
          </Select>

          {/* Ordenação */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
              <SelectItem value="grade">Nota (maior)</SelectItem>
              <SelectItem value="delivery">Taxa Entrega</SelectItem>
              <SelectItem value="recent">Mais Recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* ========== LISTA DE ALUNOS ========== */}
      {filteredStudents.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Users className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {students.length === 0 ? 'Nenhum aluno na turma' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {students.length === 0 
                ? 'Adicione alunos ou compartilhe o código de convite da turma.'
                : 'Ajuste os filtros para ver mais resultados.'}
            </p>
            {students.length === 0 && (
              <Button onClick={() => setShowAddModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Aluno
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student, index) => {
            const gradeColor = student.avgGrade >= 7 ? 'text-green-600' : 
                             student.avgGrade >= 5 ? 'text-yellow-600' : 
                             'text-red-600';
            const deliveryColor = student.deliveryRate >= 80 ? 'text-green-600' :
                                 student.deliveryRate >= 60 ? 'text-yellow-600' :
                                 'text-red-600';

            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-4">
                    {/* Avatar e Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={student.profile?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold">
                          {student.profile?.full_name?.[0] || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="font-semibold text-lg">
                          {student.profile?.full_name || 'Nome não disponível'}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {student.profile?.email || 'Email não disponível'}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3" />
                          Entrou {formatDistanceToNow(new Date(student.joined_at), { locale: ptBR, addSuffix: true })}
                        </div>
                      </div>
                    </div>

                    {/* Métricas */}
                    <div className="hidden lg:flex items-center gap-6">
                      {/* Nota Média */}
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${gradeColor}`}>
                          {student.avgGrade?.toFixed(1) || '—'}
                        </div>
                        <div className="text-xs text-slate-500">Nota Média</div>
                      </div>

                      {/* Taxa de Entrega */}
                      <div className="text-center min-w-[120px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold ${deliveryColor}`}>
                            {student.deliveryRate.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={student.deliveryRate} className="h-2" />
                        <div className="text-xs text-slate-500 mt-1">
                          {student.submissionsCount}/{student.totalActivities} entregas
                        </div>
                      </div>

                      {/* Status */}
                      <Badge 
                        className={
                          student.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                          student.status === 'alert' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }
                      >
                        {student.status === 'active' ? 'Ativo' :
                         student.status === 'alert' ? 'Alerta' :
                         'Crítico'}
                      </Badge>
                    </div>

                    {/* Ações */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewStudentDetails(student)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewStudentActivities(student)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Ver Atividades
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendMessage(student)}>
                          <Mail className="w-4 h-4 mr-2" />
                          Enviar Mensagem
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 dark:text-red-400"
                          onClick={() => handleRemoveStudent(student.id, student.profile?.full_name)}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Remover da Turma
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de Adicionar Aluno */}
      <AddStudentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        classId={classId}
        classData={classData}
        onSuccess={() => {
          setShowAddModal(false);
          loadStudents();
        }}
      />

      {/* Dialog de Confirmação de Remoção */}
      <ConfirmDialog
        isOpen={removeConfirm.isOpen}
        onClose={() => setRemoveConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmRemove}
        title="Remover Aluno da Turma"
        message={`Tem certeza que deseja remover ${removeConfirm.name} desta turma? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default StudentsTab;
