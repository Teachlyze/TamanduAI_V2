/**
 * Deck Settings Page
 * Configurações de um deck específico
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Trash2,
  Download,
  Upload,
  Share2,
  Palette,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader } from '@/shared/design';
import flashcardService from '@/shared/services/flashcardService';
import { logger } from '@/shared/utils/logger';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog';
import SuccessDialog from '@/shared/components/ui/SuccessDialog';

const COLORS = [
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#F97316', label: 'Laranja' },
  { value: '#F59E0B', label: 'Amarelo' },
  { value: '#10B981', label: 'Verde' },
  { value: '#3B82F6', label: 'Azul' },
  { value: '#6366F1', label: 'Índigo' },
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#EC4899', label: 'Rosa' },
];

const DeckSettingsPage = () => {
  const { deckId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [deck, setDeck] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'BookOpen',
    is_public: false,
  });

  useEffect(() => {
    if (user?.id && deckId) {
      loadDeck();
    }
  }, [user, deckId]);

  const loadDeck = async () => {
    try {
      setLoading(true);
      const { data, error } = await flashcardService.getDeckById(deckId);
      if (error) throw error;

      setDeck(data);
      setFormData({
        name: data.name || '',
        description: data.description || '',
        color: data.color || '#3B82F6',
        icon: data.icon || 'BookOpen',
        is_public: data.is_public || false,
      });
    } catch (error) {
      logger.error('Error loading deck:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar o deck.',
        variant: 'destructive',
      });
      navigate('/students/flashcards');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await flashcardService.updateDeck(deckId, formData);
      if (error) throw error;

      setShowSuccessDialog(true);
    } catch (error) {
      logger.error('Error saving deck:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    navigate(`/students/flashcards/decks/${deckId}`);
  };

  const handleDelete = async () => {
    try {
      const { error } = await flashcardService.deleteDeck(deckId);
      if (error) throw error;

      toast({
        title: 'Deck excluído',
        description: 'O deck e todos os cards foram removidos.',
      });
      
      navigate('/students/flashcards');
    } catch (error) {
      logger.error('Error deleting deck:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o deck.',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async () => {
    try {
      const { data: cards } = await flashcardService.getCardsInDeck(deckId);
      
      const exportData = {
        deck: formData,
        cards: cards || [],
        exported_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formData.name.replace(/\s+/g, '_')}_deck.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Deck exportado!',
        description: 'O arquivo foi baixado com sucesso.',
      });
    } catch (error) {
      logger.error('Error exporting deck:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar o deck.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando deck..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header com botão voltar */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/students/flashcards/decks/${deckId}`)}
            className="mb-4 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <DashboardHeader
            title="Configurações do Deck"
            subtitle={`Gerenciar "${formData.name}"`}
          />
        </div>

        {/* Informações Básicas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Informações Básicas
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Nome, descrição e aparência do deck
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Deck *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Vocabulário Japonês"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o conteúdo deste deck..."
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Cor do Deck</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.color === color.value
                          ? 'border-slate-900 dark:border-white scale-105'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    >
                      <span className="sr-only">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Privacidade */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                {formData.is_public ? (
                  <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                ) : (
                  <EyeOff className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Privacidade
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Controle quem pode ver este deck
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Deck público</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Outros usuários poderão ver e clonar este deck
                </p>
              </div>
              <Switch
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>
          </Card>
        </motion.div>

        {/* Ações */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Share2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Ações
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Exportar, compartilhar ou excluir
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleExport}
                className="justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Deck
              </Button>
              
              <Button
                variant="outline"
                onClick={() => toast({ title: 'Em breve', description: 'Funcionalidade de importação em desenvolvimento' })}
                className="justify-start"
                disabled
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar Cards
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/students/flashcards/decks/${deckId}`);
                  toast({ title: 'Link copiado!', description: 'Link do deck copiado para área de transferência.' });
                }}
                className="justify-start"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Copiar Link
              </Button>

              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="justify-start"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Deck
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Botões de Ação */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="outline"
            onClick={() => navigate(`/students/flashcards/decks/${deckId}`)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Excluir deck?"
          message={`Tem certeza que deseja excluir "${formData.name}"? Esta ação não pode ser desfeita e todos os ${deck?.total_cards || 0} cards serão perdidos.`}
          confirmText="Sim, excluir"
          cancelText="Cancelar"
          variant="danger"
        />

        {/* Success Dialog */}
        <SuccessDialog
          isOpen={showSuccessDialog}
          onClose={handleCloseSuccessDialog}
          title="Deck atualizado!"
          message={`As configurações do deck "${formData.name}" foram salvas com sucesso.`}
        />
      </div>
    </div>
  );
};

export default DeckSettingsPage;
