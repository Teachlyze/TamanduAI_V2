import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Settings, Edit, MoreVertical, Copy, Users, 
  LayoutDashboard, FileText, Megaphone, BookOpen, ClipboardList,
  BarChart2, MessageSquare, CheckCircle, AlertCircle
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';

// Importar tabs (expandidas conforme necessário)
import OverviewTab from './tabs/OverviewTab';
import ContentFeedTab from './tabs/ContentFeedTab';
import AnnouncementsTab from './tabs/AnnouncementsTab';
import LibraryTab from './tabs/LibraryTab';
import ActivitiesTab from './tabs/ActivitiesTab';
import StudentsTab from './tabs/StudentsTab';
import MetricsTab from './tabs/MetricsTab';
import ChatbotTab from './tabs/ChatbotTab';

/**
 * TeacherClassDetailsPage - PÁGINA MAIS COMPLEXA DO SISTEMA
 * 
 * Esta é a página central do professor para gerenciar uma turma.
 * Contém 8 tabs com funcionalidades completas:
 * 1. Visão Geral - Dashboard resumido
 * 2. Mural de Conteúdo - Posts pedagógicos
 * 3. Comunicados - Avisos com notificações
 * 4. Biblioteca - Materiais organizados
 * 5. Atividades - Gestão de atividades
 * 6. Alunos - Gestão de membros
 * 7. Métricas - Analytics avançados
 * 8. Chatbot - Assistente virtual
 */
const TeacherClassDetailsPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    if (classId === 'new') {
      navigate('/dashboard/classes', { replace: true });
      return;
    }
    if (classId && user) {
      loadClassData();
    }
  }, [classId, user]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  /**
   * Carrega dados completos da turma
   */
  const loadClassData = async () => {
    try {
      setLoading(true);

      // Verificar se usuário tem permissão
      const { data: membership, error: memberError } = await supabase
        .from('class_members')
        .select('role')
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .single();

      if (memberError || membership?.role !== 'teacher') {
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para acessar esta turma.',
          variant: 'destructive'
        });
        navigate('/dashboard/classes');
        return;
      }

      // Buscar dados da turma
      const { data: classInfo, error: classError } = await supabase
        .from('classes')
        .select(`
          *,
          created_by_profile:profiles!created_by(full_name, avatar_url),
          school:schools(name, logo_url)
        `)
        .eq('id', classId)
        .single();

      if (classError) throw classError;
      setClassData(classInfo);

      // Contar alunos
      const { count, error: countError } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('role', 'student');

      if (countError) throw countError;
      setStudentCount(count || 0);

    } catch (error) {
      logger.error('Erro ao carregar turma:', error)
      toast({
        title: 'Erro ao carregar turma',
        description: 'Não foi possível carregar os dados da turma.',
        variant: 'destructive'
      });
      navigate('/dashboard/classes');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Muda tab ativa e atualiza URL
   */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  /**
   * Copia código de convite para clipboard
   */
  const handleCopyInviteCode = async () => {
    if (classData?.invite_code) {
      try {
        await navigator.clipboard.writeText(classData.invite_code);
        toast({
          title: '✅ Código copiado!',
          description: 'O código de convite foi copiado para a área de transferência.'
        });
      } catch (error) {
        logger.error('Erro ao copiar:', error)
        toast({
          title: 'Erro ao copiar',
          description: 'Não foi possível copiar o código.',
          variant: 'destructive'
        });
      }
    }
  };

  /**
   * Copia link completo de convite
   */
  const handleCopyInviteLink = async () => {
    if (classData?.invite_code) {
      const link = `${window.location.origin}/join/class/${classData.invite_code}`;
      try {
        await navigator.clipboard.writeText(link);
        toast({
          title: '✅ Link copiado!',
          description: 'O link de convite foi copiado.'
        });
      } catch (error) {
        logger.error('Erro ao copiar:', error)
      }
    }
  };

  /**
   * Configuração das 8 tabs
   */
  const tabs = [
    { 
      id: 'overview', 
      label: 'Visão Geral', 
      icon: LayoutDashboard,
      description: 'Dashboard resumido da turma'
    },
    { 
      id: 'content', 
      label: 'Mural de Conteúdo', 
      icon: FileText,
      description: 'Posts com materiais pedagógicos'
    },
    { 
      id: 'announcements', 
      label: 'Comunicados', 
      icon: Megaphone,
      description: 'Avisos importantes com notificações'
    },
    { 
      id: 'library', 
      label: 'Biblioteca', 
      icon: BookOpen,
      description: 'Materiais organizados em módulos'
    },
    { 
      id: 'activities', 
      label: 'Atividades', 
      icon: ClipboardList,
      description: 'Gestão de atividades da turma'
    },
    { 
      id: 'students', 
      label: 'Alunos', 
      icon: Users,
      description: 'Gestão de membros da turma'
    },
    { 
      id: 'metrics', 
      label: 'Métricas', 
      icon: BarChart2,
      description: 'Analytics e relatórios'
    },
    { 
      id: 'chatbot', 
      label: 'Chatbot', 
      icon: MessageSquare,
      description: 'Assistente virtual inteligente'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Carregando turma...</p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Turma não encontrada</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            A turma solicitada não existe ou você não tem permissão para acessá-la.
          </p>
          <Button onClick={() => navigate('/dashboard/classes')}>
            Voltar para Turmas
          </Button>
        </Card>
      </div>
    );
  }

  // Cor do banner (gradiente personalizado ou padrão)
  const bannerGradient = classData?.banner_color || classData?.color || 'from-blue-600 to-cyan-500';
  const hasCustomColor = classData?.banner_color || classData?.color;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* ==================== HEADER COM BANNER IMERSIVO ==================== */}
      <div className={`relative h-64 bg-gradient-to-r ${bannerGradient} overflow-hidden shadow-xl`}>
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        
        {/* Animated Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        
        {/* Navegação (canto superior esquerdo) */}
        <div className="absolute top-4 left-6 z-10">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard/classes')}
            className="text-white hover:bg-white/20 backdrop-blur-sm cursor-pointer relative z-10"
            style={{ pointerEvents: 'auto' }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Ações Rápidas (canto superior direito) */}
        <div className="absolute top-4 right-6 z-10 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 backdrop-blur-sm"
            title="Configurações da turma"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 backdrop-blur-sm"
            title="Editar turma"
          >
            <Edit className="w-4 h-4" />
          </Button>
          
          {/* Dropdown Mais Opções */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleCopyInviteLink}>
                <Copy className="w-4 h-4 mr-2" />
                Ver Código/Link de Convite
              </DropdownMenuItem>
              <DropdownMenuItem>
                Duplicar Turma
              </DropdownMenuItem>
              <DropdownMenuItem>
                Arquivar Turma
              </DropdownMenuItem>
              <DropdownMenuItem>
                Exportar Dados
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 dark:text-red-400">
                Excluir Turma
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Informações Principais (centralizadas) */}
        <div className="relative z-10 h-full flex flex-col justify-center px-6 max-w-7xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-lg"
          >
            {classData.name}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg lg:text-xl text-white/90 mb-3 drop-shadow-md"
          >
            {classData.subject}
          </motion.p>

          {classData.description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/80 max-w-3xl line-clamp-2 drop-shadow-md"
            >
              {classData.description}
            </motion.p>
          )}

          {/* Badges de Status */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center gap-3 mt-4"
          >
            {/* Badge: Quantidade de Alunos */}
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1">
              <Users className="w-3 h-3 mr-1" />
              {studentCount} {studentCount === 1 ? 'aluno' : 'alunos'}
            </Badge>
            
            {/* Badge: Status da Turma */}
            {classData.is_active !== false ? (
              <Badge className="bg-green-500/20 text-green-100 border-green-400/30 backdrop-blur-sm px-3 py-1">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ativa
              </Badge>
            ) : (
              <Badge className="bg-gray-500/20 text-gray-100 border-gray-400/30 backdrop-blur-sm px-3 py-1">
                Arquivada
              </Badge>
            )}

            {/* Badge: Código de Convite (copiável) */}
            {classData.invite_code && (
              <Badge 
                className="bg-white/20 text-white border-white/30 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors px-3 py-1"
                onClick={handleCopyInviteCode}
                title="Clique para copiar"
              >
                <Copy className="w-3 h-3 mr-1" />
                Código: {classData.invite_code}
              </Badge>
            )}

            {/* Badge: Limite de Alunos (se configurado) */}
            {classData.student_capacity && (
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1">
                Limite: {studentCount} de {classData.student_capacity}
              </Badge>
            )}
          </motion.div>
        </div>

        {/* Shadow Gradient (transição suave para conteúdo) */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* ==================== BARRA DE NAVEGAÇÃO (TABS) ==================== */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  title={tab.description}
                  className={`
                    flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-all
                    ${isActive 
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================== CONTEÚDO DAS TABS ==================== */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab 
            classId={classId} 
            classData={classData}
          />
        )}
        {activeTab === 'content' && (
          <ContentFeedTab 
            classId={classId}
          />
        )}
        {activeTab === 'announcements' && (
          <AnnouncementsTab 
            classId={classId}
          />
        )}
        {activeTab === 'library' && (
          <LibraryTab 
            classId={classId}
          />
        )}
        {activeTab === 'activities' && (
          <ActivitiesTab 
            classId={classId}
          />
        )}
        {activeTab === 'students' && (
          <StudentsTab 
            classId={classId} 
            classData={classData}
          />
        )}
        {activeTab === 'metrics' && (
          <MetricsTab 
            classId={classId}
          />
        )}
        {activeTab === 'chatbot' && (
          <ChatbotTab 
            classId={classId} 
            classData={classData}
          />
        )}
      </div>
    </div>
  );
};

export default TeacherClassDetailsPage;
