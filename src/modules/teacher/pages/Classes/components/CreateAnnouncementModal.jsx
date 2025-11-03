import { logger } from '@/shared/utils/logger';
import React, { useState } from 'react';
import { X, Megaphone, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';

const CreateAnnouncementModal = ({ isOpen, onClose, classId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    urgency: 'info'
  });

  const urgencyOptions = [
    { value: 'info', label: '📘 Informação', color: 'blue', icon: Info },
    { value: 'warning', label: '⚠️ Aviso', color: 'yellow', icon: AlertTriangle },
    { value: 'urgent', label: '🔔 Urgente', color: 'orange', icon: Megaphone },
    { value: 'critical', label: '🚨 Crítico', color: 'red', icon: AlertCircle }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha título e descrição',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Salvar em class_materials com category='announcement'
      const { error } = await supabase
        .from('class_materials')
        .insert({
          class_id: classId,
          title: formData.title,
          description: formData.description,
          category: 'announcement',
          tags: [formData.urgency],
          created_by: user.id,
          is_public: false,
          file_type: 'announcement'
        });

      if (error) throw error;

      toast({
        title: 'Comunicado criado!',
        description: 'Todos os alunos serão notificados'
      });

      setFormData({ title: '', description: '', urgency: 'info' });
      onSuccess?.();
      onClose();
      
    } catch (error) {
      logger.error('Erro ao criar comunicado:', error)
      toast({
        title: 'Erro ao criar comunicado',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedUrgency = urgencyOptions.find(opt => opt.value === formData.urgency);
  const Icon = selectedUrgency?.icon || Info;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Novo Comunicado</h2>
              <p className="text-orange-100 text-sm">Envie avisos importantes para todos os alunos</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Urgência */}
          <div>
            <label className="block text-sm font-medium mb-3">Nível de Urgência</label>
            <div className="grid grid-cols-2 gap-3">
              {urgencyOptions.map((option) => {
                const OptionIcon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, urgency: option.value })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      formData.urgency === option.value
                        ? `border-${option.color}-600 bg-${option.color}-50 dark:bg-${option.color}-950/20`
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <OptionIcon className="w-5 h-5" />
                      <span className="font-medium text-sm">{option.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium mb-2">Título do Comunicado</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Alteração de horário da prova"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-600 dark:bg-slate-800"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium mb-2">Mensagem</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o comunicado em detalhes..."
              rows={6}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-600 dark:bg-slate-800"
              required
            />
          </div>

          {/* Preview */}
          <div className={`p-4 rounded-lg border-2 border-${selectedUrgency?.color}-200 bg-${selectedUrgency?.color}-50 dark:bg-${selectedUrgency?.color}-950/20`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-${selectedUrgency?.color}-100`}>
                <Icon className={`w-5 h-5 text-${selectedUrgency?.color}-600`} />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{formData.title || 'Título do comunicado'}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {formData.description || 'Mensagem do comunicado aparecerá aqui...'}
                </div>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-orange-600 to-red-600 text-white"
            >
              {loading ? 'Publicando...' : 'Publicar Comunicado'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateAnnouncementModal;
