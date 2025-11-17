/**
 * Deck Detail Page
 * View and manage cards in a deck
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Download,
  Upload,
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
import { supabase } from '@/shared/services/supabaseClient';
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
  const [importing, setImporting] = useState(false);
  const [importingApkg, setImportingApkg] = useState(false);
  const importInputRef = useRef(null);
  const apkgInputRef = useRef(null);

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
        title: 'Estudo livre',
        description: 'Nenhum card está pendente hoje, mas você pode estudar o deck mesmo assim.',
      });
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

      const { data, error } = await flashcardService.createCard(newCard);
      if (error) throw error;

      toast({
        title: 'Card duplicado',
        description: 'O card foi duplicado com sucesso.',
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

  const handleImportClick = () => {
    if (importInputRef.current) {
      importInputRef.current.click();
    }
  };

  const handleImportCards = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    
    logger.debug('Import to deck: File selected', { fileName: file?.name, size: file?.size });

    if (!file) {
      logger.debug('Import to deck: No file selected');
      return;
    }
    if (!user?.id) {
      logger.debug('Import to deck: User not authenticated');
      toast({
        title: 'Usuário não autenticado',
        description: 'Faça login para importar cards.',
        variant: 'destructive',
      });
      return;
    }

    try {
      logger.debug('Import to deck: Starting import process');
      setImporting(true);
      const text = await file.text();
      logger.debug('Import to deck: File read successfully', { textLength: text.length });
      
      const json = JSON.parse(text);
      const hasKanji = Array.isArray(json?.kanji);
      const hasHiragana = Array.isArray(json?.hiragana);
      const hasKatakana = Array.isArray(json?.katakana);

      logger.debug('Import to deck: JSON parsed successfully', { 
        isArray: Array.isArray(json),
        hasCards: Array.isArray(json?.cards),
        cardsCount: json?.cards?.length,
        hasKanji,
        hasHiragana,
        hasKatakana,
      });

      // Suportar: array direto, { cards: [...] } ou formato japonês (kanji/hiragana/katakana)
      let cardsArray = [];
      if (Array.isArray(json)) {
        cardsArray = json;
      } else if (json && Array.isArray(json.cards)) {
        cardsArray = json.cards;
      } else if (hasKanji || hasHiragana || hasKatakana) {
        logger.debug('Import to deck: Detected structured Japanese JSON for deck import', { hasKanji, hasHiragana, hasKatakana });

        const kanjiCards = (json.kanji || []).map((item) => {
          const front = String(item.kanji ?? '').trim();

          const parts = [];
          if (item.significado) {
            parts.push(`Significado: ${item.significado}`);
          }
          if (Array.isArray(item.onyomi) && item.onyomi.length > 0) {
            parts.push(`Onyomi: ${item.onyomi.join(', ')}`);
          }
          if (Array.isArray(item.kunyomi) && item.kunyomi.length > 0) {
            parts.push(`Kunyomi: ${item.kunyomi.join(', ')}`);
          }

          const palavra = Array.isArray(item.palavras_comuns) ? item.palavras_comuns[0] : null;
          if (palavra) {
            const linhaPalavra = [
              'Palavra comum:',
              palavra.jap || palavra.jp,
              palavra.romaji ? `(${palavra.romaji})` : null,
              palavra.pt ? `- ${palavra.pt}` : null,
            ]
              .filter(Boolean)
              .join(' ');
            parts.push(linhaPalavra);
          }

          const exemplo = Array.isArray(item.exemplos) ? item.exemplos[0] : null;
          if (exemplo) {
            const linhaExemplo = [
              'Exemplo:',
              exemplo.jp,
              exemplo.romaji ? `(${exemplo.romaji})` : null,
              exemplo.pt ? `- ${exemplo.pt}` : null,
            ]
              .filter(Boolean)
              .join(' ');
            parts.push(linhaExemplo);
          }

          const back = parts.join('\n').trim();

          return {
            front,
            back,
            card_type: 'basic',
            tags: ['kanji'],
          };
        }).filter((c) => c.front && c.back);

        const hiraganaCards = (json.hiragana || []).map((item) => {
          const front = String(item.char ?? '').trim();
          const ex = item.exemplo || {};

          const parts = [];
          if (item.romaji) {
            parts.push(`Romaji: ${item.romaji}`);
          }
          if (ex.jap || ex.romaji || ex.pt) {
            const linhaExemplo = [
              'Exemplo:',
              ex.jap,
              ex.romaji ? `(${ex.romaji})` : null,
              ex.pt ? `- ${ex.pt}` : null,
            ]
              .filter(Boolean)
              .join(' ');
            parts.push(linhaExemplo);
          }

          const back = parts.join('\n').trim();

          return {
            front,
            back,
            card_type: 'basic',
            tags: ['hiragana'],
          };
        }).filter((c) => c.front && c.back);

        const katakanaCards = (json.katakana || []).map((item) => {
          const front = String(item.char ?? '').trim();
          const ex = item.exemplo || {};

          const parts = [];
          if (item.romaji) {
            parts.push(`Romaji: ${item.romaji}`);
          }
          if (ex.jap || ex.romaji || ex.pt) {
            const linhaExemplo = [
              'Exemplo:',
              ex.jap,
              ex.romaji ? `(${ex.romaji})` : null,
              ex.pt ? `- ${ex.pt}` : null,
            ]
              .filter(Boolean)
              .join(' ');
            parts.push(linhaExemplo);
          }

          const back = parts.join('\n').trim();

          return {
            front,
            back,
            card_type: 'basic',
            tags: ['katakana'],
          };
        }).filter((c) => c.front && c.back);

        cardsArray = [...kanjiCards, ...hiraganaCards, ...katakanaCards];

        logger.debug('Import to deck: Japanese JSON converted to cards array', {
          totalKanji: kanjiCards.length,
          totalHiragana: hiraganaCards.length,
          totalKatakana: katakanaCards.length,
          totalCards: cardsArray.length,
        });
      } else {
        throw new Error('JSON deve conter uma lista de cards, { cards: [...] } ou um formato suportado de estudo (kanji/hiragana/katakana).');
      }

      // Validate and process cards
      const validCards = cardsArray
        .map((card) => ({
          deck_id: deckId,
          user_id: user.id,
          front: String(card.front ?? '').trim(),
          back: String(card.back ?? '').trim(),
          card_type: card.card_type || 'basic',
          tags: Array.isArray(card.tags) ? card.tags : [],
        }))
        .filter((c) => c.front && c.back);

      logger.debug('Import to deck: Processed cards', { 
        totalCards: cardsArray.length,
        validCards: validCards.length 
      });

      if (validCards.length === 0) {
        throw new Error('Nenhum card válido encontrado. Cada card deve ter "front" e "back".');
      }

      // Create cards in batches of 50 to avoid overwhelming the database
      const batchSize = 50;
      let createdCount = 0;
      
      for (let i = 0; i < validCards.length; i += batchSize) {
        const batch = validCards.slice(i, i + batchSize);
        logger.debug(`Import to deck: Creating batch ${Math.floor(i/batchSize) + 1}`, { batchSize: batch.length });
        
        const response = await flashcardService.createCards(batch);
        logger.debug('Import to deck: Service response', { response });
        
        if (response.error) {
          logger.error('Import to deck: Batch creation failed', response.error);
          throw new Error(`Failed to create cards: ${response.error.message || response.error}`);
        }
        
        // Note: Supabase bulk insert may return empty data even on success
        // We count success by the absence of error, not by returned data
        createdCount += batch.length;
        
        logger.debug(`Import to deck: Batch ${Math.floor(i/batchSize) + 1} completed`, { 
          batchSize: batch.length, 
          returnedData: response.data 
        });
        
        // Update progress
        toast({
          title: 'Importando cards...',
          description: `${createdCount} de ${validCards.length} cards adicionados.`,
        });
      }

      toast({
        title: 'Cards importados!',
        description: `${createdCount} cards foram adicionados ao deck "${deck.name}".`,
      });

      logger.debug('Import to deck: Import completed', { createdCount, deckId });
      
      // Reload the deck to show new cards
      loadDeck();
    } catch (error) {
      // Some environments may throw a plain response object like { data: {}, error: null }
      // which actually represents a successful operation. Detect this case and treat
      // it as success instead of showing an error to the user.
      if (error && typeof error === 'object' && 'data' in error && 'error' in error && error.error === null) {
        logger.warn('Import to deck: Caught success-like object in catch, treating as success', error);
        toast({
          title: 'Cards importados!',
          description: 'Os cards foram adicionados ao deck.',
        });
        loadDeck();
        return;
      }

      logger.error('Error importing cards to deck:', error);
      toast({
        title: 'Erro ao importar',
        description: error.message || 'Verifique o arquivo JSON e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      logger.debug('Import to deck: Finally block, resetting importing state');
      setImporting(false);
    }
  };

  const handleApkgImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    
    logger.debug('Import APKG to deck: File selected', { fileName: file?.name, size: file?.size });

    if (!file) {
      logger.debug('Import APKG to deck: No file selected');
      return;
    }

    if (!user?.id) {
      logger.debug('Import APKG to deck: User not authenticated');
      toast({
        title: 'Usuário não autenticado',
        description: 'Faça login para importar cards.',
        variant: 'destructive',
      });
      return;
    }

    try {
      logger.debug('Import APKG to deck: Starting import process');
      setImportingApkg(true);

      // Validar tamanho (max 100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O arquivo deve ter no máximo 100MB.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Enviando arquivo...',
        description: 'Aguarde enquanto o deck Anki é processado.',
      });

      // Upload para Storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('flashcards-imports')
        .upload(filePath, file);

      if (uploadError) {
        logger.error('Import APKG to deck: Upload error', uploadError);
        throw new Error('Falha ao enviar arquivo');
      }

      logger.debug('Import APKG to deck: File uploaded', { path: filePath });

      // Obter token da sessão
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Chamar Edge Function para adicionar ao deck existente via fetch
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-anki`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bucket: 'flashcards-imports',
            file_path: filePath,
            deck_id: deckId,
            create_new_deck: false,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        logger.error('Import APKG to deck: Function error', { status: response.status, data });
        throw new Error(data?.error || 'Erro ao processar deck Anki');
      }

      logger.debug('Import APKG to deck: Import successful', data);

      toast({
        title: 'Cards importados com sucesso!',
        description: `${data.import_stats?.total_cards_created || 0} cards foram adicionados ao deck "${deck.name}".`,
      });

      // Recarregar deck
      loadDeck();

    } catch (error) {
      logger.error('Import APKG to deck: Error', error);
      toast({
        title: 'Erro ao importar deck Anki',
        description: error.message || 'Verifique o arquivo e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      logger.debug('Import APKG to deck: Finally block');
      setImportingApkg(false);
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
                  disabled={cards.length === 0}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {cards.length === 0
                    ? 'Deck vazio'
                    : dueCount === 0
                      ? 'Estudar mesmo assim'
                      : `Estudar (${dueCount})`}
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
          <div className="flex flex-wrap gap-2">
          <Button onClick={handleAddCard} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Novo Card
          </Button>
          <label className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
            <input
              type="file"
              accept="application/json"
              onChange={handleImportCards}
              className="hidden"
              disabled={importing}
            />
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Importando...' : 'Importar Cards JSON'}
          </label>
          <label className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer">
            <input
              type="file"
              accept=".apkg"
              onChange={handleApkgImport}
              className="hidden"
              disabled={importingApkg}
              ref={apkgInputRef}
            />
            <Upload className="w-4 h-4 mr-2" />
            {importingApkg ? 'Importando...' : 'Importar Anki (.apkg)'}
          </label>
        </div>
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
        
        {/* Hidden file input for importing cards */}
        <input
          type="file"
          accept="application/json"
          ref={importInputRef}
          className="hidden"
          onChange={handleImportCards}
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
