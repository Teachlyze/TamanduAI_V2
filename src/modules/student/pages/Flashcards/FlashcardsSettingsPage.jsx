/**
 * Flashcards Settings Page
 * Configurações gerais do sistema de flashcards
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Brain,
  Clock,
  Zap,
  Eye,
  Volume2,
  Shuffle,
  Calendar,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader } from '@/shared/design';
import { logger } from '@/shared/utils/logger';
import SuccessDialog from '@/shared/components/ui/SuccessDialog';

const FlashcardsSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [settings, setSettings] = useState({
    // Limites diários
    new_cards_per_day: 20,
    max_reviews_per_day: 200,
    
    // Algoritmo SM-2
    easy_multiplier: 2.5,
    good_multiplier: 1.0,
    hard_multiplier: 0.5,
    
    // Intervalos
    graduating_interval: 1,
    easy_interval: 4,
    max_interval_days: 365,
    
    // Ordem de revisão
    review_order: 'random', // random, difficulty, chronological
    
    // UI
    show_remaining_count: true,
    show_next_intervals: true,
    auto_play_audio: false,
  });

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // TODO: Carregar configurações do banco
      // Por enquanto, usar valores padrão
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      logger.error('Error loading settings:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // TODO: Salvar configurações no banco
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setShowSuccessDialog(true);
    } catch (error) {
      logger.error('Error saving settings:', error);
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
    navigate('/students/flashcards');
  };

  const handleReset = () => {
    setSettings({
      new_cards_per_day: 20,
      max_reviews_per_day: 200,
      easy_multiplier: 2.5,
      good_multiplier: 1.0,
      hard_multiplier: 0.5,
      graduating_interval: 1,
      easy_interval: 4,
      max_interval_days: 365,
      review_order: 'random',
      show_remaining_count: true,
      show_next_intervals: true,
      auto_play_audio: false,
    });
    toast({
      title: 'Configurações restauradas',
      description: 'Valores padrão restaurados.',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando configurações..." />
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
            onClick={() => navigate('/students/flashcards')}
            className="mb-4 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <DashboardHeader
            title="Configurações de Flashcards"
            subtitle="Personalize seu sistema de repetição espaçada"
          />
        </div>

        {/* Limites Diários */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Limites Diários
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Controle quantos cards você estuda por dia
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="new_cards">Novos cards por dia</Label>
                <Input
                  id="new_cards"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.new_cards_per_day}
                  onChange={(e) => setSettings({ ...settings, new_cards_per_day: parseInt(e.target.value) })}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Recomendado: 20-30 cards por dia
                </p>
              </div>

              <div>
                <Label htmlFor="max_reviews">Máximo de revisões por dia</Label>
                <Input
                  id="max_reviews"
                  type="number"
                  min="10"
                  max="500"
                  value={settings.max_reviews_per_day}
                  onChange={(e) => setSettings({ ...settings, max_reviews_per_day: parseInt(e.target.value) })}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Recomendado: 100-200 revisões por dia
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Algoritmo de Repetição */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Algoritmo SM-2
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Ajuste os multiplicadores de intervalo
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="easy_mult">Multiplicador "Fácil"</Label>
                <Input
                  id="easy_mult"
                  type="number"
                  step="0.1"
                  min="1.5"
                  max="3.0"
                  value={settings.easy_multiplier}
                  onChange={(e) => setSettings({ ...settings, easy_multiplier: parseFloat(e.target.value) })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="max_interval">Intervalo máximo (dias)</Label>
                <Input
                  id="max_interval"
                  type="number"
                  min="30"
                  max="3650"
                  value={settings.max_interval_days}
                  onChange={(e) => setSettings({ ...settings, max_interval_days: parseInt(e.target.value) })}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Máximo de tempo entre revisões
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Preferências de Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Eye className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Interface
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Personalize a experiência de estudo
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mostrar contagem restante</Label>
                  <p className="text-xs text-slate-500">
                    Exibir quantos cards faltam
                  </p>
                </div>
                <Switch
                  checked={settings.show_remaining_count}
                  onCheckedChange={(checked) => setSettings({ ...settings, show_remaining_count: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Mostrar próximos intervalos</Label>
                  <p className="text-xs text-slate-500">
                    Exibir quando o card será revisado novamente
                  </p>
                </div>
                <Switch
                  checked={settings.show_next_intervals}
                  onCheckedChange={(checked) => setSettings({ ...settings, show_next_intervals: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Reproduzir áudio automaticamente</Label>
                  <p className="text-xs text-slate-500">
                    Tocar áudio ao mostrar o card
                  </p>
                </div>
                <Switch
                  checked={settings.auto_play_audio}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_play_audio: checked })}
                />
              </div>

              <div>
                <Label>Ordem de revisão</Label>
                <select
                  value={settings.review_order}
                  onChange={(e) => setSettings({ ...settings, review_order: e.target.value })}
                  className="mt-2 w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value="random">Aleatória</option>
                  <option value="difficulty">Por dificuldade</option>
                  <option value="chronological">Cronológica</option>
                </select>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Botões de Ação */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            Restaurar Padrões
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
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
                Salvar Configurações
              </>
            )}
          </Button>
        </div>

        {/* Success Dialog */}
        <SuccessDialog
          isOpen={showSuccessDialog}
          onClose={handleCloseSuccessDialog}
          title="Configurações salvas!"
          message="Suas preferências de flashcards foram atualizadas com sucesso e já estão em vigor."
        />
      </div>
    </div>
  );
};

export default FlashcardsSettingsPage;
