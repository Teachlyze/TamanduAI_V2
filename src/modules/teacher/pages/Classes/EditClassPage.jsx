import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Archive } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card } from '@/shared/components/ui/card';
import {
  DashboardHeader,
  ColorPicker,
  CopyButton
} from '@/shared/design';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { ClassService } from '@/shared/services/classService';
import { useToast } from '@/shared/components/ui/use-toast';

const EditClassPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classData, setClassData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    description: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    loadClass();
  }, [classId]);

  const loadClass = async () => {
    try {
      setLoading(true);
      const data = await ClassService.getClassById(classId);
      setClassData(data);
      setFormData({
        name: data.name || '',
        subject: data.subject || '',
        description: data.description || '',
        color: data.color || '#3B82F6'
      });
    } catch (error) {
      logger.error('Erro ao carregar turma:', error)
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await ClassService.updateClass(classId, formData);
      toast({ title: '✅ Turma atualizada!', description: 'As alterações foram salvas com sucesso.' });
      navigate(`/dashboard/classes/${classId}`);
    } catch (error) {
      logger.error('Erro ao salvar:', error)
      toast({ title: '❌ Erro ao salvar', description: 'Tente novamente em alguns instantes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Tem certeza que deseja arquivar esta turma?')) return;
    
    try {
      await ClassService.archiveClass(classId);
      toast({ title: '📦 Turma arquivada', description: 'A turma foi movida para arquivados.' });
      navigate('/dashboard/classes');
    } catch (error) {
      logger.error('Erro ao arquivar:', error)
      toast({ title: '❌ Erro ao arquivar', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirm('TEM CERTEZA? Esta ação não pode ser desfeita!')) return;
    
    try {
      await ClassService.deleteClass(classId);
      toast({ title: '🗑️ Turma deletada', description: 'A turma foi removida permanentemente.' });
      navigate('/dashboard/classes');
    } catch (error) {
      logger.error('Erro ao deletar:', error)
      toast({ title: '❌ Erro ao deletar', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleGenerateCode = async () => {
    try {
      const newCode = await ClassService.generateInviteCode(classId);
      setClassData(prev => ({ ...prev, invite_code: newCode }));
      toast({ title: '🔑 Novo código gerado!', description: 'O código anterior foi invalidado.' });
    } catch (error) {
      logger.error('Erro:', error)
      toast({ title: '❌ Erro ao gerar código', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Carregando..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/dashboard/classes/${classId}`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <DashboardHeader
        title="Editar Turma"
        subtitle={classData?.name || ''}
        role="teacher"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Form */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <div className="space-y-6">
            <div>
              <Label>Nome da Turma *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Matemática 3º Ano A"
              />
            </div>

            <div>
              <Label>Matéria/Disciplina</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Ex: Matemática"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição da turma..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <ColorPicker
              label="Cor da Turma"
              value={formData.color}
              onChange={(color) => setFormData(prev => ({ ...prev, color }))}
            />
          </div>
        </Card>

        {/* Invite Code */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <h3 className="font-bold mb-4">Código de Convite</h3>
          <div className="flex items-center gap-2 mb-4">
            <Input value={classData?.invite_code || ''} readOnly />
            <CopyButton text={classData?.invite_code || ''} label="Copiar" />
          </div>
          <Button
            variant="outline"
            onClick={handleGenerateCode}
            className="w-full"
          >
            Gerar Novo Código
          </Button>
        </Card>

        {/* Actions */}
        <Card className="p-6 bg-white dark:bg-slate-900">
          <div className="flex gap-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/classes/${classId}`)}
            >
              Cancelar
            </Button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 bg-white dark:bg-slate-900 border-red-200 dark:border-red-800">
          <h3 className="font-bold text-red-600 dark:text-red-400 mb-4">Zona de Perigo</h3>
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={handleArchive}
              className="w-full text-amber-600 border-amber-300"
            >
              <Archive className="w-4 h-4 mr-2" />
              Arquivar Turma
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              className="w-full text-red-600 border-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Turma
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EditClassPage;
