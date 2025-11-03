import { logger } from '@/shared/utils/logger';
import React, { useState } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { toast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';

const CreateClassModal = ({ isOpen, onClose, onSuccess, teacherId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    description: '',
    color: 'from-blue-600 to-cyan-500',
    student_capacity: 30,
    invite_code: generateInviteCode()
  });

  function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

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

      // Verificar se código é único
      const { data: existing } = await supabase
        .from('classes')
        .select('id')
        .eq('invite_code', formData.invite_code)
        .single();

      if (existing) {
        // Gerar novo código
        const newCode = generateInviteCode();
        setFormData({ ...formData, invite_code: newCode });
        toast({
          title: 'Código duplicado',
          description: 'Gerando novo código automaticamente...',
        });
        return;
      }

      // Criar turma
      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert([
          {
            name: formData.name,
            subject: formData.subject,
            description: formData.description,
            color: formData.color,
            invite_code: formData.invite_code,
            student_capacity: formData.student_capacity,
            created_by: teacherId,
            is_active: true
          }
        ])
        .select()
        .single();

      if (classError) {
        logger.error('Erro ao criar turma:', classError)
        throw new Error(classError.message || 'Erro ao criar turma no banco de dados');
      }

      // Adicionar professor como membro
      const { error: memberError } = await supabase
        .from('class_members')
        .insert([
          {
            class_id: newClass.id,
            user_id: teacherId,
            role: 'teacher'
          }
        ]);

      if (memberError) {
        logger.error('Erro ao adicionar professor como membro:', memberError)
        throw new Error(memberError.message || 'Erro ao adicionar professor à turma');
      }

      toast({
        title: '✅ Turma criada com sucesso!',
        description: `${formData.name} foi criada. Código: ${formData.invite_code}`
      });

      onSuccess();
      onClose();
      navigate(`/dashboard/classes/${newClass.id}`);
    } catch (error) {
      logger.error('Erro ao criar turma:', error)
      toast({
        title: '❌ Erro ao criar turma',
        description: error.message || 'Não foi possível criar a turma. Tente novamente.',
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
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Nova Turma</h2>
              <p className="text-cyan-100 text-sm mt-1">Configure as informações básicas da turma</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
              Informações Básicas
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nome da Turma *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                placeholder="Ex: Matemática Avançada 2025.1"
                maxLength={100}
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
                placeholder="Ex: Matemática, Física, Programação"
                maxLength={50}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Descrição
                </label>
                <span className="text-xs text-slate-500">
                  {formData.description.length}/500
                </span>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setFormData({ ...formData, description: e.target.value });
                  }
                }}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                placeholder="Descreva o conteúdo, objetivos e características da turma..."
              />
            </div>
          </div>

          {/* Configurações */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
              Configurações
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Número Máximo de Alunos
              </label>
              <input
                type="number"
                value={formData.student_capacity}
                onChange={(e) => setFormData({ ...formData, student_capacity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
                min="1"
                max="1000"
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
                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <div className={`h-8 rounded bg-gradient-to-r ${option.value} mb-2`} />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Código de Convite
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.invite_code}
                  readOnly
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, invite_code: generateInviteCode() })}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Alunos usarão este código para entrar na turma
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Criar Turma
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClassModal;
