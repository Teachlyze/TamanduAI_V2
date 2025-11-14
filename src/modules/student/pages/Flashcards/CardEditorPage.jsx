/**
 * Card Editor Page
 * Create or edit a flashcard
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  X,
  Hash,
  Image as ImageIcon,
  Type,
  FlipVertical,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader } from '@/shared/design';
import flashcardService from '@/shared/services/flashcardService';
import { logger } from '@/shared/utils/logger';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog';
import SuccessDialog from '@/shared/components/ui/SuccessDialog';

const CardEditorPage = () => {
  const { deckId, cardId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isEditMode = !!cardId;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    front: '',
    back: '',
    tags: [],
    card_type: 'basic',
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

  useEffect(() => {
    if (isEditMode) {
      loadCard();
    }
  }, [cardId]);

  const loadCard = async () => {
    try {
      setLoading(true);
      // For now, we'll implement a simple get by ID
      // You might need to add this method to flashcardService
      const { data: cards, error } = await flashcardService.getCardsInDeck(deckId);
      if (error) throw error;

      const card = cards.find((c) => c.id === cardId);
      if (!card) throw new Error('Card not found');

      setFormData({
        front: card.front,
        back: card.back,
        tags: card.tags || [],
        card_type: card.card_type || 'basic',
      });
    } catch (error) {
      logger.error('Error loading card:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar o card.',
        variant: 'destructive',
      });
      navigate(`/students/flashcards/decks/${deckId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag) return;

    if (formData.tags.includes(tag)) {
      toast({
        title: 'Tag já existe',
        description: 'Esta tag já foi adicionada.',
        variant: 'destructive',
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      tags: [...prev.tags, tag],
    }));
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.front.trim()) {
      newErrors.front = 'Frente do card é obrigatória';
    } else if (formData.front.length > 2000) {
      newErrors.front = 'Frente muito longa (máx. 2000 caracteres)';
    }

    if (!formData.back.trim()) {
      newErrors.back = 'Verso do card é obrigatório';
    } else if (formData.back.length > 2000) {
      newErrors.back = 'Verso muito longo (máx. 2000 caracteres)';
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

      const cardData = {
        deck_id: deckId,
        user_id: user.id,
        front: formData.front.trim(),
        back: formData.back.trim(),
        card_type: formData.card_type,
        tags: formData.tags,
      };

      if (isEditMode) {
        const { error } = await flashcardService.updateCard(cardId, cardData);
        if (error) throw error;

        // Mostrar modal de sucesso
        setSuccessMessage({
          title: 'Card atualizado!',
          message: 'Suas alterações foram salvas e estão prontas para revisão.',
        });
        setShowSuccessDialog(true);
        
        // Aguardar usuário fechar modal antes de navegar
        setTimeout(() => {
          navigate(`/students/flashcards/decks/${deckId}`);
        }, 100);
      } else {
        const { data: createdCard, error } = await flashcardService.createCard(cardData);
        if (error) throw error;

        // Mostrar modal de sucesso
        setSuccessMessage({
          title: 'Card criado com sucesso!',
          message: `Card "${formData.front.substring(0, 40)}${formData.front.length > 40 ? '...' : ''}" foi adicionado ao deck. Continue criando mais cards ou volte ao deck.`,
        });
        setShowSuccessDialog(true);
        
        // Limpar formulário e permanecer na tela de criação
        setFormData({
          front: '',
          back: '',
          tags: [],
          card_type: 'basic',
        });
        
        // Limpar erros
        setErrors({});
        
        // Focar no campo front
        setTimeout(() => {
          document.getElementById('front')?.focus();
        }, 100);
      }
    } catch (error) {
      logger.error('Error saving card:', error);
      
      // Mensagens de erro específicas
      let errorMessage = 'Tente novamente em instantes.';
      if (error.message?.includes('duplicate')) {
        errorMessage = 'Este card já existe no deck.';
      } else if (error.message?.includes('foreign key')) {
        errorMessage = 'Deck não encontrado. Volte e tente novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: `❌ Erro ao ${isEditMode ? 'atualizar' : 'criar'} card`,
        description: errorMessage,
        variant: 'destructive',
        duration: 6000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (formData.front || formData.back || formData.tags.length > 0) {
      setShowCancelConfirm(true);
      return;
    }
    navigate(`/students/flashcards/decks/${deckId}`);
  };

  const confirmCancel = () => {
    navigate(`/students/flashcards/decks/${deckId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando card..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header com botão voltar no topo esquerdo (Nielsen) */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleCancel}
            className="mb-4 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <DashboardHeader
            title={isEditMode ? 'Editar Card' : 'Criar Novo Card'}
            subtitle={isEditMode ? 'Modifique o conteúdo do card' : 'Adicione um novo card ao deck'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Front */}
                <div className="space-y-2">
                  <Label htmlFor="front" className="text-base font-semibold flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Frente do Card *
                  </Label>
                  <Textarea
                    id="front"
                    name="front"
                    value={formData.front}
                    onChange={handleChange}
                    placeholder="Digite a pergunta, termo, kanji, vocabulário..."
                    rows={5}
                    className={errors.front ? 'border-red-500' : ''}
                    maxLength={2000}
                    autoFocus
                  />
                  {errors.front && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.front}</p>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {formData.front.length}/2000 caracteres • Suporta múltiplos idiomas
                  </p>
                </div>

                {/* Back */}
                <div className="space-y-2">
                  <Label htmlFor="back" className="text-base font-semibold flex items-center gap-2">
                    <FlipVertical className="w-4 h-4" />
                    Verso do Card *
                  </Label>
                  <Textarea
                    id="back"
                    name="back"
                    value={formData.back}
                    onChange={handleChange}
                    placeholder="Digite a resposta, tradução, explicação..."
                    rows={5}
                    className={errors.back ? 'border-red-500' : ''}
                    maxLength={2000}
                  />
                  {errors.back && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.back}</p>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {formData.back.length}/2000 caracteres
                  </p>
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Tags (opcional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="Digite uma tag..."
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleAddTag} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Tags ajudam a organizar e filtrar seus cards
                  </p>
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
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    disabled={saving}
                    className="lg:hidden"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Ocultar' : 'Ver'} Preview
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    disabled={saving || !formData.front.trim() || !formData.back.trim()}
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {isEditMode ? 'Atualizar' : 'Criar'} Card
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>

          {/* Preview - sempre visível no desktop, toggle no mobile */}
          {(showPreview || window.innerWidth >= 1024) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:sticky lg:top-6"
          >
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview do Card
              </h3>

              {/* Front Preview */}
              <div className="mb-4">
                <Label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Frente</Label>
                <Card className="p-6 min-h-[150px] flex items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-2 border-purple-200 dark:border-purple-800">
                  <p className="text-center text-lg text-slate-900 dark:text-white">
                    {formData.front || 'A frente do card aparecerá aqui...'}
                  </p>
                </Card>
              </div>

              {/* Back Preview */}
              <div className="mb-4">
                <Label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Verso</Label>
                <Card className="p-6 min-h-[150px] flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-900 border-2 border-purple-200 dark:border-purple-800">
                  <p className="text-center text-lg text-slate-700 dark:text-slate-300">
                    {formData.back || 'O verso do card aparecerá aqui...'}
                  </p>
                </Card>
              </div>

              {/* Tags Preview */}
              {formData.tags.length > 0 && (
                <div>
                  <Label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, i) => (
                      <Badge key={i} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Help Card */}
            <Card className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2 text-sm">
                💡 Dicas para criar bons cards
              </h4>
              <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                <li>• Seja conciso e objetivo</li>
                <li>• Uma pergunta por card</li>
                <li>• Use linguagem simples</li>
                <li>• Adicione tags para organizar</li>
                <li>• Revise regularmente</li>
              </ul>
            </Card>
          </motion.div>
          )}
        </div>

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={confirmCancel}
          title="Descartar alterações?"
          message="Você tem alterações não salvas. Tem certeza que deseja sair sem salvar?"
          confirmText="Sim, descartar"
          cancelText="Continuar editando"
          variant="danger"
        />

        {/* Success Dialog */}
        <SuccessDialog
          isOpen={showSuccessDialog}
          onClose={() => setShowSuccessDialog(false)}
          title={successMessage.title}
          message={successMessage.message}
        />
      </div>
    </div>
  );
};

export default CardEditorPage;
