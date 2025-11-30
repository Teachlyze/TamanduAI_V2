/**
 * Review Page - Flashcard Study Interface
 * Full-screen card review with SM-2 algorithm
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  RotateCcw,
  Edit,
  Pause,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Clock,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import flashcardService from '@/shared/services/flashcardService';
import { previewIntervals, getQualityInfo, formatInterval } from '@/shared/services/spacedRepetition';
import { logger } from '@/shared/utils/logger';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog';

const ReviewPage = () => {
  const { deckId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [settings, setSettings] = useState(null);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    reviewed: 0,
    correct: 0,
    startTime: Date.now(),
  });
  const [paused, setPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (user?.id && deckId) {
      loadReviewSession();
    }
  }, [user, deckId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (paused) return;

      if (!showBack && e.code === 'Space') {
        e.preventDefault();
        handleShowAnswer();
      } else if (showBack) {
        switch (e.key) {
          case '1':
            handleQuality(0);
            break;
          case '2':
            handleQuality(1);
            break;
          case '3':
            handleQuality(2);
            break;
          case '4':
            handleQuality(3);
            break;
          case '5':
            handleQuality(4);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showBack, paused, currentIndex]);

  const loadReviewSession = async () => {
    try {
      setLoading(true);

      // Load deck info
      const { data: deckData, error: deckError } = await flashcardService.getDeckById(deckId);
      if (deckError) throw deckError;
      setDeck(deckData);

      // Load user settings
      const { data: userSettings, error: settingsError } = await flashcardService.getUserSettings(user.id);
      if (settingsError) throw settingsError;
      setSettings(userSettings);

      // Load due cards
      const { data: dueCards, error: cardsError } = await flashcardService.getDueCardsForReview(
        deckId,
        user.id,
        {
          include_new: true,
          include_learning: true,
          include_review: true,
          max_new: userSettings.new_cards_per_day || 20,
          max_reviews: userSettings.max_reviews_per_day || 200,
          order: userSettings.review_order || 'random',
        }
      );
      
      if (cardsError) throw cardsError;

      let sessionCards = dueCards || [];

      // Se não houver cards devidos, entrar em modo de estudo livre usando todos os cards do deck
      if (!sessionCards.length) {
        const { data: allCardsData, error: allCardsError } = await flashcardService.getCardsInDeck(deckId);
        if (allCardsError) throw allCardsError;

        if (!allCardsData || allCardsData.length === 0) {
          toast({
            title: 'Deck vazio',
            description: 'Adicione cards ao deck primeiro.',
            variant: 'destructive',
          });
          navigate(`/students/flashcards/decks/${deckId}`);
          return;
        }

        sessionCards = allCardsData.map((card) => {
          const stats = Array.isArray(card.card_stats)
            ? card.card_stats[0]
            : card.card_stats;
          const cardId = card.id;

          return {
            ...card,
            ...stats,
            id: cardId,
          };
        });

        toast({
          title: 'Estudo livre',
          description: 'Nenhum card está pendente hoje, então vamos estudar o deck completo.',
        });
      }

      setCards(sessionCards);
      setSessionStats({
        total: sessionCards.length,
        reviewed: 0,
        correct: 0,
        startTime: Date.now(),
      });
    } catch (error) {
      logger.error('Error loading review session:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os cards para revisão.',
        variant: 'destructive',
      });
      navigate('/students/flashcards');
    } finally {
      setLoading(false);
    }
  };

  const handleShowAnswer = useCallback(() => {
    setShowBack(true);
  }, []);

  const handleQuality = async (quality) => {
    const currentCard = cards[currentIndex];
    const timeMs = Date.now() - sessionStats.startTime;

    try {
      // Submit review
      await flashcardService.submitReview(
        currentCard.id,
        user.id,
        quality,
        timeMs,
        settings
      );

      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (quality >= 2 ? 1 : 0),
      }));

      // Move to next card or finish
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowBack(false);
      } else {
        // Session complete
        handleSessionComplete();
      }
    } catch (error) {
      logger.error('Error submitting review:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar sua resposta.',
        variant: 'destructive',
      });
    }
  };

  const handleSessionComplete = () => {
    const sessionTime = Math.floor((Date.now() - sessionStats.startTime) / 1000);
    const minutes = Math.floor(sessionTime / 60);
    const seconds = sessionTime % 60;
    const retention = Math.round((sessionStats.correct / sessionStats.total) * 100);

    toast({
      title: '\ud83c\udf89 Sess\u00e3o conclu\u00edda!',
      description: `${sessionStats.reviewed} cards revisados em ${minutes}m ${seconds}s. Taxa de acerto: ${retention}%`,
      duration: 5000,
    });

    navigate('/students/flashcards');
  };

  const handlePause = () => {
    setPaused(!paused);
  };

  const handleEditCard = () => {
    // TODO: Implement edit during review
    toast({
      title: 'Em desenvolvimento',
      description: 'Edição durante revisão será implementada em breve.',
    });
  };

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <LoadingSpinner size="lg" text="Preparando cards..." />
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return null;
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;
  const remaining = cards.length - currentIndex - 1;

  // Preview intervals for current card
  const intervals = showBack ? previewIntervals(currentCard, settings) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExit}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Sair
            </Button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {deck?.name}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Card {currentIndex + 1} de {cards.length}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {settings?.show_remaining_count && (
              <Badge variant="secondary">
                {remaining} restantes
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePause}
            >
              <Pause className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditCard}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="mt-4" />
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {!paused ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Card Display */}
              <Card className="mb-6 overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* Card Status Badge */}
                <div className="px-6 pt-6 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                  <Badge
                    className={
                      currentCard.card_status === 'new'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : currentCard.card_status === 'learning'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }
                  >
                    {currentCard.card_status === 'new'
                      ? 'Novo'
                      : currentCard.card_status === 'learning'
                      ? 'Aprendendo'
                      : 'Revisão'}
                  </Badge>
                  {currentCard.tags && currentCard.tags.length > 0 && (
                    <div className="flex gap-2">
                      {currentCard.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Front Side */}
                <div className="p-8 min-h-[300px] flex items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
                  <div className="text-center max-w-2xl w-full space-y-4">
                    {currentCard.image_url && (
                      <img 
                        src={currentCard.image_url} 
                        alt="Card visual" 
                        className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                      />
                    )}
                    <p className="text-2xl font-medium text-slate-900 dark:text-white leading-relaxed">
                      {currentCard.front}
                    </p>
                    {currentCard.audio_url && (
                      <audio
                        src={currentCard.audio_url}
                        controls
                        autoPlay={!!settings?.auto_play_audio}
                        className="mx-auto mt-4"
                      />
                    )}
                  </div>
                </div>

                {/* Back Side (revealed) */}
                <AnimatePresence>
                  {showBack && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                        <div className="text-left max-w-2xl mx-auto space-y-4">
                          {currentCard.back_image_url && (
                            <img 
                              src={currentCard.back_image_url} 
                              alt="Card back visual" 
                              className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                            />
                          )}
                          <div className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
                            {String(currentCard.back || '')
                              .split('\n')
                              .filter((line) => line.trim().length > 0)
                              .map((line, idx) => (
                                <p key={idx}>{line}</p>
                              ))}
                          </div>
                          {(currentCard.back_audio_url || currentCard.audio_url) && (
                            <audio
                              src={currentCard.back_audio_url || currentCard.audio_url}
                              controls
                              className="mx-auto mt-4"
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Show Answer Button */}
                {!showBack && (
                  <div className="p-6 flex justify-center border-t border-slate-100 dark:border-slate-800">
                    <Button
                      size="lg"
                      onClick={handleShowAnswer}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-12"
                    >
                      Mostrar Resposta
                      <span className="ml-2 text-xs opacity-75">(Espaço)</span>
                    </Button>
                  </div>
                )}
              </Card>

              {/* Quality Buttons */}
              <AnimatePresence>
                {showBack && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="grid grid-cols-5 gap-3">
                      {intervals.map((interval) => {
                        const info = getQualityInfo(interval.value);
                        const Icon = getIconForQuality(interval.value);

                        return (
                          <QualityButton
                            key={interval.value}
                            quality={interval.value}
                            label={interval.label}
                            interval={settings?.show_next_intervals ? interval.formatted_interval : null}
                            color={interval.color}
                            icon={Icon}
                            onClick={() => handleQuality(interval.value)}
                            shortcut={info.shortcut}
                          />
                        );
                      })}
                    </div>

                    {/* Stats Summary */}
                    <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-center gap-8 text-sm">
                        <div className="text-center">
                          <p className="text-slate-600 dark:text-slate-400">Progresso</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {sessionStats.reviewed}/{sessionStats.total}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-600 dark:text-slate-400">Acertos</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">
                            {sessionStats.correct}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-600 dark:text-slate-400">Taxa</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {sessionStats.reviewed > 0
                              ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
                              : 0}
                            %
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="paused"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <Pause className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Pausado
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Clique no botão acima para continuar
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Exit confirmation dialog */}
      <ConfirmDialog
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={() => {
          navigate(`/students/flashcards/decks/${deckId}`);
        }}
        title="Sair da revisão?"
        message="Deseja realmente sair da sessão de revisão agora? Seu progresso até este card será mantido."
        confirmText="Sair"
        cancelText="Continuar estudando"
        variant="warning"
      />
    </div>
  );
};

// ============================================================================
// QUALITY BUTTON COMPONENT
// ============================================================================

const QualityButton = ({ quality, label, interval, color, icon: Icon, onClick, shortcut }) => {
  const colorClasses = {
    red: 'bg-red-500 hover:bg-red-600 border-red-600',
    orange: 'bg-orange-500 hover:bg-orange-600 border-orange-600',
    blue: 'bg-blue-500 hover:bg-blue-600 border-blue-600',
    green: 'bg-green-500 hover:bg-green-600 border-green-600',
    emerald: 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600',
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} text-white border-2 rounded-xl p-4 transition-all hover:scale-105 hover:shadow-lg flex flex-col items-center gap-2 group`}
    >
      <Icon className="w-6 h-6" />
      <span className="font-bold text-sm">{label}</span>
      <span className="text-xs opacity-90">{interval}</span>
      <span className="text-xs opacity-75 bg-white/20 px-2 py-0.5 rounded">
        {shortcut}
      </span>
    </button>
  );
};

// Helper to get icon for quality
const getIconForQuality = (quality) => {
  switch (quality) {
    case 0:
      return X;
    case 1:
      return AlertCircle;
    case 2:
      return Check;
    case 3:
      return CheckCircle;
    case 4:
      return Sparkles;
    default:
      return Check;
  }
};

export default ReviewPage;
