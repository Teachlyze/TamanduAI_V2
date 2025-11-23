import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Settings, Edit, MoreVertical, Copy, Users, 
  LayoutDashboard, FileText, Megaphone, BookOpen, ClipboardList,
  BarChart2, MessageSquare, CheckCircle, TrendingUp, Clock
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { ClassService } from '@/shared/services/classService';

// Importar tabs
import OverviewTab from './tabs/OverviewTab';
import ContentFeedTab from './tabs/ContentFeedTab';
import AnnouncementsTab from './tabs/AnnouncementsTab';
import LibraryTab from './tabs/LibraryTab';
import ActivitiesTab from './tabs/ActivitiesTab';
import StudentsTab from './tabs/StudentsTab';
import MetricsTab from './tabs/MetricsTab';
import ChatbotTab from './tabs/ChatbotTab';

const ClassDetailsPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [studentCount, setStudentCount] = useState(0);
  const [isTeacher, setIsTeacher] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [copyStudents, setCopyStudents] = useState(true);
  const [copyActivities, setCopyActivities] = useState(true);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    // Guard: evitar UUID inválido (ex: 'new')
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(classId);
    if (!isUUID) {
      navigate('/dashboard/classes', { replace: true });
      return;
    }
    if (classId) {
      loadClassData();
    }
  }, [classId]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const loadClassData = async () => {
    try {
      setLoading(true);

      const { data: classInfo, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (error) {
        logger.error('Erro ao buscar turma:', error);
        throw error;
      }

      if (!classInfo) {
        logger.error('Turma não encontrada:', classId);
        throw new Error('Turma não encontrada');
      }

      setClassData(classInfo);

      // Contar alunos
      const { count } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('role', 'student');

      setStudentCount(count || 0);

      // Verificar se usuário é professor da turma
      if (user?.id) {
        const { data: membership, error: membershipError } = await supabase
          .from('class_members')
          .select('role')
          .eq('class_id', classId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (membershipError) {
          logger.warn('Erro ao verificar papel do usuário na turma:', membershipError);
        } else {
          setIsTeacher(membership?.role === 'teacher');
        }
      }

    } catch (error) {
      logger.error('Erro ao carregar turma:', error);
      toast({
        title: 'Erro ao carregar turma',
        description: error.message || 'Não foi possível carregar os dados da turma.',
        variant: 'destructive'
      });
      navigate('/dashboard/classes');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleCopyInviteCode = () => {
    if (classData?.invite_code) {
      navigator.clipboard.writeText(classData.invite_code);
      toast({
        title: 'Código copiado!',
        description: 'O código de convite foi copiado para a área de transferência.'
      });
    }
  };

  const handleOpenCloneModal = () => {
    if (!classData) return;
    setCloneName(`${classData.name} - Cópia`);
    setCopyStudents(true);
    setCopyActivities(true);
    setCloneModalOpen(true);
  };

  const handleCloneClass = async () => {
    if (!classId || !classData) return;
    try {
      setCloning(true);

      const clonedClass = await ClassService.cloneClassStructure(classId, {
        name: cloneName || `${classData.name} - Cópia`,
        copyStudents,
        copyActivities,
      });

      toast({
        title: 'Turma clonada com sucesso',
        description: 'Redirecionando para a nova turma...',
      });

      setCloneModalOpen(false);
      navigate(`/dashboard/classes/${clonedClass.id}`);
    } catch (error) {
      logger.error('Erro ao clonar turma:', error);
      toast({
        title: 'Erro ao clonar turma',
        description: error.message || 'Não foi possível clonar a turma.',
        variant: 'destructive',
      });
    } finally {
      setCloning(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'content', label: 'Mural de Conteúdo', icon: FileText },
    { id: 'announcements', label: 'Comunicados', icon: Megaphone },
    { id: 'library', label: 'Biblioteca', icon: BookOpen },
    { id: 'activities', label: 'Atividades', icon: ClipboardList },
    { id: 'students', label: 'Alunos', icon: Users },
    { id: 'metrics', label: 'Métricas', icon: BarChart2 },
    { id: 'chatbot', label: 'Chatbot', icon: MessageSquare }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const bannerGradient = classData?.color || 'from-blue-600 to-cyan-500';
  const canClone = !loading && isTeacher;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header com Banner */}
      <div className={`relative h-64 bg-gradient-to-r ${bannerGradient} overflow-hidden`}>
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        
        {/* Navegação */}
        <div className="absolute top-4 left-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard/classes')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {/* Ações Rápidas */}
        <div className="absolute top-4 right-6 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => {}}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => {}}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {classData?.invite_code && (
                <DropdownMenuItem onClick={handleCopyInviteCode}>
                  <Copy className="w-4 h-4 mr-2" />
                  Ver Código de Convite
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleOpenCloneModal} disabled={!canClone}>
                <Copy className="w-4 h-4 mr-2" />
                {canClone ? 'Clonar Turma' : 'Clonar Turma (apenas professor)'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                Arquivar Turma (em breve)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Informações Principais */}
        <div className="relative z-10 h-full flex flex-col justify-center px-6 max-w-7xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white mb-2"
          >
            {classData?.name}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-white/90 mb-4"
          >
            {classData?.subject}
          </motion.p>

          {classData?.description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/80 max-w-2xl line-clamp-2"
            >
              {classData.description}
            </motion.p>
          )}

          {/* Badges */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 mt-4"
          >
            <Badge className="bg-white/20 text-white border-white/30">
              <Users className="w-3 h-3 mr-1" />
              {studentCount} alunos
            </Badge>
            
            {classData?.is_active !== false ? (
              <Badge className="bg-green-500/20 text-green-100 border-green-400/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ativa
              </Badge>
            ) : (
              <Badge className="bg-gray-500/20 text-gray-100 border-gray-400/30">
                Arquivada
              </Badge>
            )}

            {classData?.invite_code && (
              <Badge 
                className="bg-white/20 text-white border-white/30 cursor-pointer hover:bg-white/30"
                onClick={handleCopyInviteCode}
              >
                <Copy className="w-3 h-3 mr-1" />
                Código: {classData.invite_code}
              </Badge>
            )}
          </motion.div>
        </div>

        {/* Shadow Gradient Bottom */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-all
                    ${isActive 
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && <OverviewTab classId={classId} classData={classData} />}
        {activeTab === 'content' && <ContentFeedTab classId={classId} />}
        {activeTab === 'announcements' && <AnnouncementsTab classId={classId} />}
        {activeTab === 'library' && <LibraryTab classId={classId} />}
        {activeTab === 'activities' && <ActivitiesTab classId={classId} />}
        {activeTab === 'students' && <StudentsTab classId={classId} classData={classData} />}
        {activeTab === 'metrics' && <MetricsTab classId={classId} />}
        {activeTab === 'chatbot' && <ChatbotTab classId={classId} classData={classData} />}
      </div>

      <Dialog open={cloneModalOpen} onOpenChange={setCloneModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Clonar Turma</DialogTitle>
            <DialogDescription>
              Crie uma nova turma a partir de {classData?.name}. As atividades serão copiadas como rascunhos e não serão publicadas automaticamente. Apenas professores podem clonar turmas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="clone-name" className="text-sm font-medium">
                Nome da nova turma
              </Label>
              <Input
                id="clone-name"
                type="text"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                className="mt-1"
                placeholder={`${classData?.name || 'Turma'} - Cópia`}
              />
            </div>

            <Card className="p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-students"
                  checked={copyStudents}
                  onCheckedChange={(checked) => setCopyStudents(Boolean(checked))}
                />
                <Label htmlFor="copy-students" className="cursor-pointer">
                  Copiar alunos da turma original
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-activities"
                  checked={copyActivities}
                  onCheckedChange={(checked) => setCopyActivities(Boolean(checked))}
                />
                <Label htmlFor="copy-activities" className="cursor-pointer">
                  Copiar atividades (como rascunhos) para a nova turma
                </Label>
              </div>
            </Card>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setCloneModalOpen(false)}
              disabled={cloning}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCloneClass}
              disabled={cloning || loading || !isTeacher}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {cloning ? 'Clonando...' : 'Clonar Turma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassDetailsPage;
