/**
 * Create Deck Page
 * Form to create a new flashcard deck
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Palette, Hash } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import { DashboardHeader } from '@/shared/design';
import flashcardService from '@/shared/services/flashcardService';
import { logger } from '@/shared/utils/logger';

const DECK_COLORS = [
  { value: '#3B82F6', label: 'Azul' },
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#F59E0B', label: 'Laranja' },
  { value: '#10B981', label: 'Verde' },
  { value: '#06B6D4', label: 'Ciano' },
  { value: '#6366F1', label: 'Índigo' },
];

const CreateDeckPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleColorSelect = (color) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Nome muito longo (máx. 100 caracteres)';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Descrição muito longa (máx. 500 caracteres)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast({
        title: 'Erro de validação',
        description: 'Verifique os campos e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const deckData = {
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
        icon: 'BookOpen', // Default icon
      };

      const { data: deck, error } = await flashcardService.createDeck(deckData);

      if (error) throw error;

      toast({
        title: 'Deck criado!',
        description: 'Agora você pode adicionar cards ao seu deck.',
      });

      // Navigate to deck detail page to add cards
      navigate(`/students/flashcards/decks/${deck.id}`);
    } catch (error) {
      logger.error('Error creating deck:', error);
      toast({
        title: 'Erro ao criar deck',
        description: error.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (formData.name || formData.description) {
      if (!confirm('Deseja descartar as alterações?')) {
        return;
      }
    }
    navigate('/students/flashcards');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <DashboardHeader
          title="Criar Novo Deck"
          subtitle="Configure seu deck de flashcards"
          actions={
            <Button variant="ghost" onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          }
        />

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Deck Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold">
                  Nome do Deck *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ex: Vocabulário de Inglês"
                  className={errors.name ? 'border-red-500' : ''}
                  maxLength={100}
                  autoFocus
                />
                {errors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formData.name.length}/100 caracteres
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">
                  Descrição (opcional)
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Descreva o conteúdo deste deck..."
                  rows={4}
                  className={errors.description ? 'border-red-500' : ''}
                  maxLength={500}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formData.description.length}/500 caracteres
                </p>
              </div>

              {/* Color Picker */}
              <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Cor do Deck
                </Label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  {DECK_COLORS.map((colorOption) => (
                    <button
                      key={colorOption.value}
                      type="button"
                      onClick={() => handleColorSelect(colorOption.value)}
                      className={`
                        w-full aspect-square rounded-xl border-2 transition-all
                        hover:scale-110 hover:shadow-lg
                        ${
                          formData.color === colorOption.value
                            ? 'border-slate-900 dark:border-white scale-110 shadow-lg'
                            : 'border-transparent'
                        }
                      `}
                      style={{ backgroundColor: colorOption.value }}
                      title={colorOption.label}
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Esta cor será usada para identificar seu deck visualmente
                </p>
              </div>

              {/* Preview */}
              <div className="pt-4">
                <Label className="text-base font-semibold mb-3 block">Preview</Label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4">
                  <div
                    className="h-2 rounded-full mb-4"
                    style={{ backgroundColor: formData.color }}
                  />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {formData.name || 'Nome do Deck'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {formData.description || 'Descrição do deck'}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="text-center">
                      <div className="text-xl font-bold" style={{ color: formData.color }}>
                        0
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Cards</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold" style={{ color: formData.color }}>
                        0
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Novos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold" style={{ color: formData.color }}>
                        0
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Devidos</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  disabled={saving || !formData.name.trim()}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Criar Deck
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Help Card */}
          <Card className="mt-6 p-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Dicas
            </h3>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li>• Escolha um nome descritivo para encontrar facilmente</li>
              <li>• Use cores diferentes para organizar decks por tema</li>
              <li>• Você poderá adicionar cards logo após criar o deck</li>
              <li>• É possível editar o deck depois de criado</li>
            </ul>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateDeckPage;
