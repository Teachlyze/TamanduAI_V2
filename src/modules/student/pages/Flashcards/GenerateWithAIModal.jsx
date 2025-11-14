/**
 * Generate with AI Modal
 * Modal to generate flashcards automatically using AI
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useToast } from '@/shared/components/ui/use-toast';
import { supabase } from '@/shared/services/supabaseClient';
import { logger } from '@/shared/utils/logger';

const GenerateWithAIModal = ({ isOpen, onClose, deckId, onGenerated }) => {
  const { toast } = useToast();
  
  const [content, setContent] = useState('');
  const [cardCount, setCardCount] = useState('10');
  const [difficulty, setDifficulty] = useState('medium');
  const [cardTypes, setCardTypes] = useState(['basic', 'cloze', 'multiple_choice']);
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState(null);
  const [step, setStep] = useState('input'); // input, generating, review

  const handleGenerate = async () => {
    if (content.length < 50) {
      toast({
        title: 'Conteúdo muito curto',
        description: 'Forneça pelo menos 50 caracteres de conteúdo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      setStep('generating');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-flashcards`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            deck_id: deckId,
            card_count: parseInt(cardCount),
            difficulty,
            card_types: cardTypes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao gerar flashcards');
      }

      setGeneratedCards(data.cards);
      setStep('review');

      toast({
        title: '✨ Flashcards gerados!',
        description: `${data.count} cards criados com sucesso.`,
      });

      if (data.saved_to_deck) {
        // Cards already saved, just refresh
        setTimeout(() => {
          onGenerated();
          onClose();
        }, 2000);
      }
    } catch (error) {
      logger.error('Error generating flashcards:', error);
      toast({
        title: 'Erro ao gerar',
        description: error.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
      setStep('input');
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    if (generating) {
      if (!confirm('Cancelar geração?')) return;
    }
    setContent('');
    setGeneratedCards(null);
    setStep('input');
    onClose();
  };

  const toggleCardType = (type) => {
    if (cardTypes.includes(type)) {
      if (cardTypes.length > 1) {
        setCardTypes(cardTypes.filter(t => t !== type));
      }
    } else {
      setCardTypes([...cardTypes, type]);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Gerar Flashcards com IA
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Cole seu conteúdo e a IA criará flashcards automaticamente
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={generating}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            {step === 'input' && (
              <div className="space-y-6">
                {/* Content Input */}
                <div className="space-y-2">
                  <Label htmlFor="content" className="text-base font-semibold">
                    Conteúdo para Gerar Flashcards
                  </Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Cole aqui o texto, notas de aula, ou qualquer conteúdo que você quer transformar em flashcards..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {content.length} caracteres (mínimo 50)
                  </p>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Count */}
                  <div className="space-y-2">
                    <Label htmlFor="count">Quantidade de Cards</Label>
                    <Select value={cardCount} onValueChange={setCardCount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 cards</SelectItem>
                        <SelectItem value="10">10 cards</SelectItem>
                        <SelectItem value="15">15 cards</SelectItem>
                        <SelectItem value="20">20 cards</SelectItem>
                        <SelectItem value="30">30 cards</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Difficulty */}
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Dificuldade</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Fácil</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="hard">Difícil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Card Types */}
                <div className="space-y-2">
                  <Label>Tipos de Cards</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={cardTypes.includes('basic') ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCardType('basic')}
                    >
                      Básico (Pergunta → Resposta)
                    </Badge>
                    <Badge
                      variant={cardTypes.includes('cloze') ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCardType('cloze')}
                    >
                      Cloze (Preencher Lacuna)
                    </Badge>
                    <Badge
                      variant={cardTypes.includes('multiple_choice') ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCardType('multiple_choice')}
                    >
                      Múltipla Escolha
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    A IA variará entre os tipos selecionados
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={content.length < 50}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Flashcards
                  </Button>
                </div>
              </div>
            )}

            {step === 'generating' && (
              <div className="py-12 text-center">
                <Loader className="w-12 h-12 mx-auto mb-4 animate-spin text-purple-600" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Gerando flashcards...
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  A IA está analisando seu conteúdo e criando cards personalizados
                </p>
              </div>
            )}

            {step === 'review' && generatedCards && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {generatedCards.length} flashcards gerados e salvos no deck!
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-3">
                  {generatedCards.map((card, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-600">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {card.card_type}
                            </Badge>
                            {card.tags?.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                            {card.front}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {card.back}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GenerateWithAIModal;
