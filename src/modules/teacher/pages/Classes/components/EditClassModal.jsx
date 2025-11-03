import { logger } from '@/shared/utils/logger';
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';

const EditClassModal = ({ isOpen, onClose, onSuccess, classData }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    description: '',
    color: '',
    student_capacity: 30
  });

  useEffect(() => {
    if (classData) {
      setFormData({
        name: classData.name || '',
        subject: classData.subject || '',
        description: classData.description || '',
        color: classData.color || 'from-blue-600 to-cyan-500',
        student_capacity: classData.student_capacity || 30
      });
    }
  }, [classData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.subject.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e a disciplina da turma.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('classes')
        .update({
          name: formData.name,
          subject: formData.subject,
          description: formData.description,
          color: formData.color,
          student_capacity: formData.student_capacity,
          updated_at: new Date().toISOString()
        })
        .eq('id', classData.id);

      if (error) throw error;

      toast({
        title: 'Turma atualizada!',
        description: 'As alterações foram salvas com sucesso.'
      });

      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Erro ao atualizar turma:', error)
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar a turma.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const colorOptions = [
    { value: 'from-blue-600 to-cyan-500', label: 'Azul-Ciano' },
    { value: 'from-green-600 to-emerald-500', label: 'Verde' },
    { value: 'from-purple-600 to-pink-500', label: 'Roxo-Rosa' },
    { value: 'from-orange-600 to-red-500', label: 'Laranja-Vermelho' },
    { value: 'from-indigo-600 to-blue-500', label: 'Índigo' },
    { value: 'from-teal-600 to-cyan-500', label: 'Teal' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Editar Turma</h2>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nome da Turma *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Disciplina *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Capacidade de Alunos
            </label>
            <input
              type="number"
              value={formData.student_capacity}
              onChange={(e) => setFormData({ ...formData, student_capacity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cor do Banner
            </label>
            <div className="grid grid-cols-3 gap-3">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: option.value })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.color === option.value
                      ? 'border-blue-600 scale-105'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className={`h-8 rounded bg-gradient-to-r ${option.value} mb-2`} />
                  <span className="text-xs">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600">
              {loading ? <><LoadingSpinner size="sm" className="mr-2" />Salvando...</> : <><Save className="w-4 h-4 mr-2" />Salvar</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClassModal;
