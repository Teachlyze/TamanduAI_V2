import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, FileText, TrendingUp, Edit, Archive, Trash2, Eye, Settings, Key } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import EditClassModal from './EditClassModal';
import ClassSettingsModal from './ClassSettingsModal';
import ViewCodeModal from './ViewCodeModal';

const ClassCard = ({ classData, index, onUpdate }) => {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);

  const handleArchive = async () => {
    try {
      const { error } = await supabase
        .from('classes')
        .update({ is_active: !classData.is_active })
        .eq('id', classData.id);

      if (error) throw error;

      toast({
        title: classData.is_active ? 'Turma arquivada!' : 'Turma restaurada!',
        description: classData.is_active 
          ? 'A turma foi arquivada com sucesso.' 
          : 'A turma foi restaurada com sucesso.'
      });

      onUpdate();
    } catch (error) {
      console.error('Erro ao arquivar turma:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível arquivar a turma.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (classData.studentCount > 0 || classData.activityCount > 0) {
      toast({
        title: 'Não é possível excluir',
        description: 'A turma possui alunos ou atividades. Arquive a turma ao invés de excluí-la.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classData.id);

      if (error) throw error;

      toast({
        title: 'Turma excluída!',
        description: 'A turma foi excluída permanentemente.'
      });

      onUpdate();
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a turma.',
        variant: 'destructive'
      });
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const getGradeColor = (grade) => {
    if (grade >= 7) return 'text-green-600';
    if (grade >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const bannerColor = classData.color || 'from-blue-600 to-cyan-500';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`overflow-hidden hover:shadow-xl transition-all ${classData.is_active === false ? 'opacity-60' : ''}`}>
        {/* Banner */}
        <div className={`h-32 bg-gradient-to-r ${bannerColor} flex items-center justify-center relative`}>
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <BookOpen className="w-12 h-12 text-white relative z-10" />
          
          {/* Badges de Status */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {classData.is_active === false && (
              <Badge className="bg-gray-600 text-white">Arquivada</Badge>
            )}
          </div>
        </div>

        {/* Corpo do Card */}
        <div className="p-6">
          {/* Nome e Disciplina */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 line-clamp-2">
            {classData.name}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            {classData.subject}
          </p>
          {classData.description && (
            <p className="text-sm text-slate-500 dark:text-slate-500 line-clamp-2 mb-4">
              {classData.description}
            </p>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {classData.studentCount} {classData.studentCount === 1 ? 'aluno' : 'alunos'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {classData.activityCount} {classData.activityCount === 1 ? 'atividade' : 'atividades'}
              </span>
            </div>
            {classData.avgGrade > 0 && (
              <div className="flex items-center gap-2 col-span-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Média: <span className={`font-semibold ${getGradeColor(classData.avgGrade)}`}>
                    {classData.avgGrade.toFixed(1)}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Última atualização */}
          <p className="text-xs text-slate-500 mb-4">
            Atualizada {formatDistanceToNow(new Date(classData.updated_at), { locale: ptBR, addSuffix: true })}
          </p>

          {/* Confirmação de Exclusão */}
          {showDeleteConfirm && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                Confirmar exclusão permanente?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Excluir
                </Button>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="space-y-2">
            <Button
              onClick={() => navigate(`/dashboard/classes/${classData.id}`)}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Eye className="w-4 h-4 mr-2" />
              Abrir Turma
            </Button>
            
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                title="Editar"
              >
                <Edit className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCodeModal(true)}
                title="Ver Código"
              >
                <Key className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettingsModal(true)}
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                className="flex-1"
                title={classData.is_active ? 'Arquivar' : 'Restaurar'}
              >
                <Archive className="w-4 h-4 mr-1" />
                {classData.is_active ? 'Arquivar' : 'Restaurar'}
              </Button>
              
              {(classData.studentCount === 0 && classData.activityCount === 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              )}
            </div>
          </div>
          
          {/* Modals */}
          {showEditModal && (
            <EditClassModal
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              onSuccess={onUpdate}
              classData={classData}
            />
          )}
          
          {showSettingsModal && (
            <ClassSettingsModal
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              onSuccess={onUpdate}
              classData={classData}
            />
          )}
          
          {showCodeModal && (
            <ViewCodeModal
              isOpen={showCodeModal}
              onClose={() => setShowCodeModal(false)}
              classData={classData}
            />
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default ClassCard;
