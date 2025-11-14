/**
 * Cram Mode Page
 * Intensive review mode that ignores spacing algorithm
 * Useful for studying before exams
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Shuffle,
  RotateCcw,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader } from '@/shared/design';
import flashcardService from '@/shared/services/flashcardService';
import { logger } from '@/shared/utils/logger';

const CramModePage = () => {
  const { deckId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    reviewed: 0,
    known: 0,
    unknown: 0,
    startTime: Date.now(),
  });
  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState({
    shuffle: true,
    autoFlip: false,
    timer: false,
  });
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (user?.id && deckId) {
      loadCramSession();
    }
  }, [user, deckId]);

  // Timer
  useEffect(() => {
    if (!paused && settings.timer) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStats.startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [paused, settings.timer, sessionStats.startTime]);

  const loadCramSession = async () => {
    try {
      setLoading(true);

      // Load deck
      const { data: deckData, error: deckError } = await flashcardService.getDeckById(deckId);
      if (deckError) throw deckError;
      setDeck(deckData);

      // Load all cards (ignoring intervals)
      const { data: cardsData, error: cardsError } = await flashcardService.getCardsInDeck(deckId);
      if (cardsError) throw cardsError;

      if (!cardsData || cardsData.length === 0) {
        toast({
          title: 'Nenhum card disponível',
          description: 'Adicione cards ao deck primeiro.',
        });
        navigate(`/students/flashcards/decks/${deckId}`);
        return;
      }

      // Shuffle if enabled
      const finalCards = settings.shuffle ? shuffleArray([...cardsData]) : cardsData;
      setCards(finalCards);
      setSessionStats({
        total: finalCards.length,
        reviewed: 0,
        known: 0,
        unknown: 0,
        startTime: Date.now(),
      });
    } catch (error) {
      logger.error('Error loading cram session:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível iniciar o modo cram.',
        variant: 'destructive',
      });
      navigate('/students/flashcards');
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleShowAnswer = () => {
    setShowBack(true);
  };

  const handleKnown = () => {
    setSessionStats((prev) => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      known: prev.known + 1,
    }));
    handleNext();
  };

  const handleUnknown = () => {
    setSessionStats((prev) => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      unknown: prev.unknown + 1,
    }));
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowBack(false);
    } else {
      handleSessionComplete();
    }
  };

  const handleSessionComplete = () => {
    const time = Math.floor((Date.now() - sessionStats.startTime) / 1000);
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const accuracy = Math.round((sessionStats.known / sessionStats.total) * 100);

    toast({
      title: '🎉 Sessão de Cram concluída!',
      description: `${sessionStats.reviewed} cards em ${minutes}m ${seconds}s. Acurácia: ${accuracy}%`,
      duration: 5000,
    });

    navigate(`/students/flashcards/decks/${deckId}`);
  };

  const handleRestart = () => {
    const finalCards = settings.shuffle ? shuffleArray([...cards]) : cards;
    setCards(finalCards);
    setCurrentIndex(0);
    setShowBack(false);
    setSessionStats({
      total: finalCards.length,
      reviewed: 0,
      known: 0,
      unknown: 0,
      startTime: Date.now(),
    });
    setElapsedTime(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Preparando modo cram..." />
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/students/flashcards/decks/${deckId}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Sair
            </Button>
            <div>
              <Badge variant="secondary" className="mb-1">Modo Cram</Badge>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {deck?.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {settings.timer && (
              <Badge variant="outline" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {formatTime(elapsedTime)}
              </Badge>
            )}
            <Badge variant="secondary">
              {currentIndex + 1}/{cards.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setPaused(!paused)}>
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
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
            >
              {/* Card */}
              <Card className="mb-6 overflow-hidden border-2 border-orange-200 dark:border-orange-800">
                {/* Front */}
                <div className="p-8 min-h-[300px] flex items-center justify-center bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
                  <p className="text-2xl font-medium text-slate-900 dark:text-white text-center">
                    {currentCard.front}
                  </p>
                </div>

                {/* Back */}
                <AnimatePresence>
                  {showBack && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <div className="p-8 border-t-2 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-900">
                        <p className="text-xl text-slate-700 dark:text-slate-300 text-center">
                          {currentCard.back}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="p-6 flex justify-center border-t border-slate-100 dark:border-slate-800">
                  {!showBack ? (
                    <Button
                      size="lg"
                      onClick={handleShowAnswer}
                      className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-12"
                    >
                      Mostrar Resposta
                    </Button>
                  ) : (
                    <div className="flex gap-4">
                      <Button
                        size="lg"
                        onClick={handleUnknown}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Não Sabia
                      </Button>
                      <Button
                        size="lg"
                        onClick={handleKnown}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Sabia
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Session Stats */}
              <Card className="p-6">
                <div className="flex items-center justify-center gap-8 text-sm">
                  <div className="text-center">
                    <p className="text-slate-600 dark:text-slate-400">Progresso</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {sessionStats.reviewed}/{sessionStats.total}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-600 dark:text-slate-400">Sabia</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {sessionStats.known}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-600 dark:text-slate-400">Não Sabia</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {sessionStats.unknown}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-600 dark:text-slate-400">Acurácia</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {sessionStats.reviewed > 0
                        ? Math.round((sessionStats.known / sessionStats.reviewed) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="paused"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Pause className="w-16 h-16 mx-auto mb-4 text-slate-400" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Pausado</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Clique no botão de play para continuar
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CramModePage;
