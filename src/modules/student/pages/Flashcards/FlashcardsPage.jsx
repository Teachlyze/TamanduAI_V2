/**
 * Flashcards Dashboard - Main page
 * Shows user's decks, stats, and due cards
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain,
  Plus,
  Play,
  BarChart3,
  Clock,
  TrendingUp,
  BookOpen,
  Zap,
  Settings,
  Search,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader, StatsCard, EmptyState, gradients } from '@/shared/design';
import flashcardService from '@/shared/services/flashcardService';
import { logger } from '@/shared/utils/logger';

const FlashcardsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState([]);
  const [stats, setStats] = useState({
    total_decks: 0,
    total_cards: 0,
    cards_due_today: 0,
    reviews_today: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [deckDueCounts, setDeckDueCounts] = useState({});

  useEffect(() => {
    if (user?.id) {
      loadDashboard();
    }
  }, [user]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      const { data: userStats, error } = await flashcardService.getUserStats(user.id);
      
      if (error) throw error;
      
      setStats(userStats);
      setDecks(userStats.decks || []);
      
    } catch (error) {
      logger.error('Error loading flashcards dashboard:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar seus flashcards.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar contagem de cards devidos por deck usando o mesmo algoritmo da tela de revisão
  useEffect(() => {
    const loadDeckDueCounts = async () => {
      if (!user?.id || !decks || decks.length === 0) return;

      try {
        const { data: userSettings } = await flashcardService.getUserSettings(user.id);

        const results = await Promise.all(
          decks.map(async (deck) => {
            const { data: dueCards } = await flashcardService.getDueCardsForReview(
              deck.id,
              user.id,
              {
                include_new: true,
                include_learning: true,
                include_review: true,
                max_new: userSettings?.new_cards_per_day || 20,
                max_reviews: userSettings?.max_reviews_per_day || 200,
                order: userSettings?.review_order || 'random',
              }
            );

            return {
              deckId: deck.id,
              dueCount: dueCards?.length || 0,
            };
          })
        );

        const map = {};
        results.forEach((item) => {
          if (!item) return;
          map[item.deckId] = item.dueCount;
        });

        setDeckDueCounts(map);
      } catch (error) {
        logger.error('Error loading deck due counts:', error);
      }
    };

    loadDeckDueCounts();
  }, [decks, user]);

  const handleCreateDeck = () => {
    navigate('/students/flashcards/decks/new');
  };

  const handleStudyDeck = (deckId) => {
    navigate(`/students/flashcards/decks/${deckId}/review`);
  };

  const handleViewDeck = (deckId) => {
    navigate(`/students/flashcards/decks/${deckId}`);
  };

  const handleSettings = () => {
    navigate('/students/flashcards/settings');
  };

  const handleStats = () => {
    navigate('/students/flashcards/stats');
  };

  const filteredDecks = decks.filter(deck =>
    deck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deck.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando flashcards..." />
      </div>
    );
  }

  const aggregatedDueFromDecks = Object.keys(deckDueCounts).length
    ? Object.values(deckDueCounts).reduce((sum, value) => sum + (value || 0), 0)
    : stats.cards_due_today;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header */}
      <DashboardHeader
        title="Flashcards"
        subtitle={`Sistema de repetição espaçada para memorização eficiente • Hoje: ${aggregatedDueFromDecks} cards para revisar`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStats}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Estatísticas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSettings}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
            <Button
              onClick={handleCreateDeck}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Deck
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total de Decks"
          value={stats.total_decks}
          icon={BookOpen}
          gradient="from-purple-500 to-pink-600"
          delay={0}
        />
        <StatsCard
          title="Total de Cards"
          value={stats.total_cards}
          icon={Brain}
          gradient="from-blue-500 to-cyan-600"
          delay={0.1}
        />
        <StatsCard
          title="Para Revisar Hoje"
          value={aggregatedDueFromDecks}
          icon={Clock}
          gradient="from-orange-500 to-red-600"
          delay={0.2}
        />
        <StatsCard
          title="Revisões Hoje"
          value={stats.reviews_today}
          icon={TrendingUp}
          gradient="from-emerald-500 to-teal-600"
          delay={0.3}
        />
      </div>

      {/* Search Bar */}
      {decks.length > 0 && (
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar decks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Decks Grid */}
      {filteredDecks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDecks.map((deck, index) => {
            const deckDueCount = deckDueCounts[deck.id];

            return (
              <motion.div
                key={deck.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <DeckCard
                  deck={deck}
                  dueCount={deckDueCount}
                  onStudy={() => handleStudyDeck(deck.id)}
                  onView={() => handleViewDeck(deck.id)}
                />
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Brain}
          title={searchQuery ? "Nenhum deck encontrado" : "Nenhum deck criado"}
          description={searchQuery ? "Tente buscar com outros termos" : "Crie seu primeiro deck de flashcards para começar a estudar!"}
          actionLabel="Criar Deck"
          actionIcon={Plus}
          action={handleCreateDeck}
        />
      )}
    </div>
  );
};

// ============================================================================
// DECK CARD COMPONENT
// ============================================================================

const DeckCard = ({ deck, onStudy, onView, dueCount: dueCountOverride }) => {
  const deckStats = deck.deck_stats?.[0] || null;
  const totalCards =
    Number(deck.total_cards ?? 0) ||
    Number(deck.cards_count ?? 0) ||
    (Array.isArray(deck.cards) ? deck.cards.length : 0);
  // Se não houver deck_stats (ou estiver zerado), considere todos os cards como estudáveis
  const computedDueFromStats = deckStats
    ? (Number(deckStats.cards_due_today || 0) + Number(deckStats.new_cards || 0))
    : totalCards;
  const dueCount = typeof dueCountOverride === 'number' ? dueCountOverride : computedDueFromStats;
  const newCount = deckStats ? Number(deckStats.new_cards || 0) : totalCards;

  const getDueStatus = () => {
    if (totalCards > 0 && dueCount === 0) {
      return { text: 'Tudo revisado hoje', color: 'green' };
    }
    if (dueCount === 0) {
      return { text: 'Sem cards', color: 'slate' };
    }
    if (dueCount < 10) return { text: `${dueCount} para revisar`, color: 'blue' };
    if (dueCount < 50) return { text: `${dueCount} para revisar`, color: 'orange' };
    return { text: `${dueCount} para revisar`, color: 'red' };
  };

  const dueStatus = getDueStatus();

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border-2 hover:border-purple-300 dark:hover:border-purple-700">
      {/* Color Bar */}
      <div
        className="h-2"
        style={{ backgroundColor: deck.color || '#3B82F6' }}
      />

      {/* Content */}
      <div className="p-6" onClick={onView}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {deck.name}
            </h3>
            {deck.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {deck.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {totalCards}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Cards</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {newCount}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Novos</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold text-${dueStatus.color}-600 dark:text-${dueStatus.color}-400`}>
              {dueCount}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Devidos</div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <Badge
            className={`bg-${dueStatus.color}-100 text-${dueStatus.color}-700 dark:bg-${dueStatus.color}-900/30 dark:text-${dueStatus.color}-300`}
          >
            {dueStatus.text}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (dueCount === 0) return;
              onStudy();
            }}
            disabled={dueCount === 0}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50"
          >
            <Play className="w-4 h-4 mr-2" />
            Estudar
          </Button>
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="flex-1"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Ver Cards
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default FlashcardsPage;
