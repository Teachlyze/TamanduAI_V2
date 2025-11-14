/**
 * Deck Detail Page
 * View and manage cards in a deck
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Settings,
  BarChart3,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader, EmptyState } from '@/shared/design';
import flashcardService from '@/shared/services/flashcardService';
import { getDueCards, calculateStudyStats } from '@/shared/services/spacedRepetition';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { logger } from '@/shared/utils/logger';
import ConfirmDialog from '@/shared/components/ui/ConfirmDialog';
import { useMemo } from 'react';

const DeckDetailPage = () => {
  const { deckId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, new, learning, review
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [deckReviewStats, setDeckReviewStats] = useState(null);

  useEffect(() => {
    if (user?.id && deckId) {
      loadDeck();
    }
  }, [user, deckId]);

  const loadDeck = async () => {
    try {
      setLoading(true);

      // Load deck
      const { data: deckData, error: deckError } = await flashcardService.getDeckById(deckId);
      if (deckError) throw deckError;
      setDeck(deckData);

      // Load cards
      const { data: cardsData, error: cardsError } = await flashcardService.getCardsInDeck(deckId);
      if (cardsError) throw cardsError;
      setCards(cardsData || []);

      // Load review statistics for this deck (from global review history)
      const { data: reviewData } = await flashcardService.getReviewHistory(user.id, { limit: 1000 });
      if (reviewData) {
        const deckReviews = reviewData.filter((r) => r.card?.deck_id === deckId);
        const statsForDeck = calculateStudyStats(deckReviews, 'all');
        setDeckReviewStats(statsForDeck);
      } else {
        setDeckReviewStats(null);
      }
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

  const handleStudy = () => {
    if (cards.length === 0) {
      toast({
        title: 'Deck vazio',
        description: 'Adicione cards ao deck primeiro.',
        variant: 'destructive',
      });
      return;
    }

    // Se não há cards devidos pelo algoritmo de repetição espaçada,
    // não faz sentido abrir a tela de revisão
    if (dueCount === 0) {
      toast({
        title: 'Nenhum card para revisar',
        description: 'Você está em dia com este deck! 🎉',
      });
      return;
    }

    navigate(`/students/flashcards/decks/${deckId}/review`);
  };

  const handleAddCard = () => {
    navigate(`/students/flashcards/decks/${deckId}/cards/new`);
  };

  const handleEditCard = (cardId) => {
    navigate(`/students/flashcards/decks/${deckId}/cards/${cardId}/edit`);
  };

  const handleDeleteCard = (cardId) => {
    setCardToDelete(cardId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await flashcardService.deleteCard(cardToDelete);
      if (error) throw error;

      toast({
        title: 'Card excluído',
        description: 'O card foi removido do deck.',
      });

      // Reload cards
      loadDeck();
    } catch (error) {
      logger.error('Error deleting card:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o card.',
        variant: 'destructive',
      });
    }
  };

  const handleSuspendCard = async (cardId, suspended) => {
    try {
      const { error } = await flashcardService.suspendCard(cardId, suspended);
      if (error) throw error;

      toast({
        title: suspended ? 'Card suspenso' : 'Card reativado',
        description: suspended
          ? 'O card não aparecerá nas revisões.'
          : 'O card voltará a aparecer nas revisões.',
      });

      loadDeck();
    } catch (error) {
      logger.error('Error suspending card:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o card.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateCard = async (card) => {
    try {
      const newCard = {
        deck_id: deckId,
        user_id: user.id,
        front: card.front + ' (cópia)',
        back: card.back,
        card_type: card.card_type,
        tags: card.tags,
      };

      const { error } = await flashcardService.createCard(newCard);
      if (error) throw error;

      toast({
        title: 'Card duplicado',
        description: 'Uma cópia do card foi criada.',
      });

      loadDeck();
    } catch (error) {
      logger.error('Error duplicating card:', error);
      toast({
        title: 'Erro ao duplicar',
        description: 'Não foi possível duplicar o card.',
        variant: 'destructive',
      });
    }
  };

  // Use useMemo to prevent re-rendering the entire component when filtering
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.back.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus =
        filterStatus === 'all' ||
        card.card_stats?.[0]?.card_status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [cards, searchQuery, filterStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Carregando deck..." />
      </div>
    );
  }

  // Calcular quantitativo de cards devidos com o mesmo algoritmo da tela de revisão
  const computeDueCount = () => {
    if (!cards || cards.length === 0) return 0;

    const cardsWithStats = cards.map((card) => {
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

    const dueCards = getDueCards(cardsWithStats, {
      include_new: true,
      include_learning: true,
      include_review: true,
    });

    return dueCards.length;
  };

  const dueCount = computeDueCount();
  const newCards = cards.filter(c => c.card_stats?.[0]?.card_status === 'new').length;
  const learningCards = cards.filter(c => c.card_stats?.[0]?.card_status === 'learning').length;

  const deckStatusText = (() => {
    if (cards.length === 0) {
      return 'Este deck ainda não tem cards. Adicione cards para começar a estudar.';
    }
    if (dueCount === 0) {
      return 'Tudo revisado hoje. Nenhum card pendente de revisão.';
    }
    if (dueCount === 1) {
      return 'Você tem 1 card pendente de revisão.';
    }
    return `Você tem ${dueCount} cards pendentes de revisão.`;
  })();

  const baseSubtitle = deck?.description || 'Gerenciar cards do deck';
  const fullSubtitle = `${baseSubtitle} • ${deckStatusText}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header com botão voltar no topo esquerdo */}
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
            title={deck?.name}
            subtitle={fullSubtitle}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/students/flashcards/decks/${deckId}/settings`)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </Button>
                <Button
                  onClick={handleStudy}
                  disabled={dueCount === 0}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {dueCount === 0 ? 'Nada para revisar' : `Estudar (${dueCount})`}
                </Button>
              </div>
            }
          />
        </div>

        {/* Color Bar */}
        <div className="h-2 rounded-full mb-6" style={{ backgroundColor: deck?.color }} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            label="Total"
            value={cards.length}
            color={deck?.color}
          />
          <StatsCard
            label="Novos"
            value={newCards}
            color="#3B82F6"
          />
          <StatsCard
            label="Aprendendo"
            value={learningCards}
            color="#F59E0B"
          />
          <StatsCard
            label="Para Revisar"
            value={dueCount}
            color="#10B981"
          />
        </div>

        {deckReviewStats && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Este deck já teve {deckReviewStats.total_reviews || 0} revisões, com taxa de retenção média de {deckReviewStats.retention_rate || 0}%.
          </p>
        )}

        {deckReviewStats?.chart_data?.length > 0 && (
          <Card className="mb-6 p-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Evolução de revisões deste deck
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={deckReviewStats.chart_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="reviews"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  name="Revisões"
                />
                <Line
                  type="monotone"
                  dataKey="correct"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Corretas"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              Todos
            </Button>
            <Button
              variant={filterStatus === 'new' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('new')}
            >
              Novos
            </Button>
            <Button
              variant={filterStatus === 'learning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('learning')}
            >
              Aprendendo
            </Button>
            <Button
              variant={filterStatus === 'review' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('young')}
            >
              Revisão
            </Button>
          </div>
          <Button onClick={handleAddCard} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Novo Card
          </Button>
        </div>

        {/* Cards List */}
        {filteredCards.length > 0 ? (
          <div className="space-y-3">
            {filteredCards.map((card, index) => (
              <CardListItem
                key={card.id}
                card={card}
                index={index}
                onEdit={() => handleEditCard(card.id)}
                onDelete={() => handleDeleteCard(card.id)}
                onSuspend={() => handleSuspendCard(card.id, !card.is_suspended)}
                onDuplicate={() => handleDuplicateCard(card)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={searchQuery ? Search : Plus}
            title={searchQuery ? 'Nenhum card encontrado' : 'Nenhum card neste deck'}
            description={
              searchQuery
                ? 'Tente buscar com outros termos'
                : 'Adicione seu primeiro card para começar a estudar!'
            }
            actionLabel="Adicionar Card"
            actionIcon={Plus}
            action={handleAddCard}
          />
        )}

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          title="Excluir card?"
          message="Esta ação não pode ser desfeita. O card será permanentemente removido do deck."
          confirmText="Sim, excluir"
          cancelText="Cancelar"
          variant="danger"
        />
      </div>
    </div>
  );
};

// ============================================================================
// STATS CARD COMPONENT
// ============================================================================

const StatsCard = ({ label, value, color }) => (
  <Card className="p-4">
    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{label}</p>
    <p className="text-3xl font-bold" style={{ color }}>
      {value}
    </p>
  </Card>
);

// ============================================================================
// CARD LIST ITEM COMPONENT
// ============================================================================

const CardListItem = ({ card, index, onEdit, onDelete, onSuspend, onDuplicate }) => {
  const cardStat = card.card_stats?.[0];
  const status = cardStat?.card_status || 'new';
  const easinessFactor = cardStat?.easiness_factor || 2.5;

  const statusConfig = {
    new: { label: 'Novo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    learning: { label: 'Aprendendo', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    young: { label: 'Jovem', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    mature: { label: 'Maduro', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    relearning: { label: 'Reaprendendo', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  };

  // Indicador de dificuldade baseado em SM-2 easiness_factor
  const getDifficultyBadge = () => {
    // Não mostrar para cards novos (sem histórico)
    if (status === 'new' || !cardStat?.total_reviews) return null;

    if (easinessFactor >= 2.5) {
      return {
        label: 'Fácil',
        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200',
        icon: '✨'
      };
    } else if (easinessFactor >= 2.0) {
      return {
        label: 'Médio',
        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200',
        icon: '📚'
      };
    } else {
      return {
        label: 'Difícil',
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200',
        icon: '🔥'
      };
    }
  };

  const statusInfo = statusConfig[status] || statusConfig.new;
  const difficultyBadge = getDifficultyBadge();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <Card className={`p-4 hover:shadow-lg transition-all ${card.is_suspended ? 'opacity-50' : ''}`}>
        <div className="flex items-start gap-4">
          {/* Number */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-400">
            {index + 1}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <p className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                  {card.front}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {card.back}
                </p>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSuspend}>
                    {card.is_suspended ? (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Reativar
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Suspender
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-red-600 dark:text-red-400">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              {difficultyBadge && (
                <Badge variant="outline" className={difficultyBadge.color}>
                  {difficultyBadge.icon} {difficultyBadge.label}
                </Badge>
              )}
              {card.is_suspended && (
                <Badge variant="outline" className="text-slate-500">
                  Suspenso
                </Badge>
              )}
              {card.tags?.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {cardStat && (
                <span className="text-xs text-slate-500">
                  {cardStat.total_reviews} revisões • {cardStat.retention_rate?.toFixed(0)}% retenção
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default DeckDetailPage;
