/**
 * Flashcards Dashboard - Main page
 * Shows user's decks, stats, and due cards
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Upload,
  ChevronDown,
  FileJson,
  Package,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/components/ui/use-toast';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { DashboardHeader, StatsCard, EmptyState, gradients } from '@/shared/design';
import flashcardService from '@/shared/services/flashcardService';
import { logger } from '@/shared/utils/logger';
import { supabase } from '@/shared/services/supabaseClient';

const FlashcardsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [decks, setDecks] = useState([]);
  const [stats, setStats] = useState({
    total_decks: 0,
    total_cards: 0,
    cards_due_today: 0,
    reviews_today: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [deckDueCounts, setDeckDueCounts] = useState({});
  const [importing, setImporting] = useState(false);
  const [importingApkg, setImportingApkg] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [importModal, setImportModal] = useState({
    open: false,
    title: '',
    description: '',
    isError: false,
  });
  const fileInputRef = useRef(null);
  const apkgInputRef = useRef(null);
  const importMenuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      loadDashboard();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (importMenuRef.current && !importMenuRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowImportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImportMenuToggle = () => {
    if (!showImportMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
    setShowImportMenu(!showImportMenu);
  };

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
      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  };

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

  const handleImportClick = () => {
    console.log('Import button clicked');
    console.log('fileInputRef.current:', fileInputRef.current);
    if (fileInputRef.current) {
      console.log('Triggering file input click');
      fileInputRef.current.click();
    } else {
      console.error('fileInputRef.current is null');
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    
    logger.debug('Import: File selected', { fileName: file?.name, size: file?.size });

    if (!file) {
      logger.debug('Import: No file selected');
      return;
    }
    if (!user?.id) {
      logger.debug('Import: User not authenticated');
      toast({
        title: 'Usuário não autenticado',
        description: 'Faça login para importar decks.',
        variant: 'destructive',
      });
      return;
    }

    setImportModal({
      open: true,
      title: 'Importando deck JSON...',
      description: `Estamos processando o arquivo "${file.name}". Isso pode levar alguns segundos.`,
      isError: false,
    });

    try {
      logger.debug('Import: Starting import process');
      setImporting(true);
      const text = await file.text();
      logger.debug('Import: File read successfully', { textLength: text.length });
      
      const json = JSON.parse(text);
      const baseName = (file.name || 'Deck importado').replace(/\.[^/.]+$/, '');

      let rawCards = [];
      let deckName = '';
      let deckDescription = null;
      let deckColor = '#3B82F6';

      if (Array.isArray(json)) {
        // Plain array de cards: [{ front, back, ... }]
        rawCards = json;
        deckName = baseName;
        logger.debug('Import: Detected plain cards array JSON', { cardsCount: rawCards.length, deckName });
      } else {
        const hasKanji = Array.isArray(json.kanji);
        const hasHiragana = Array.isArray(json.hiragana);
        const hasKatakana = Array.isArray(json.katakana);

        logger.debug('Import: JSON parsed successfully', { 
          hasName: !!json.name, 
          cardsCount: json.cards?.length,
          hasCards: Array.isArray(json.cards),
          hasKanji,
          hasHiragana,
          hasKatakana,
        });

        if (Array.isArray(json.cards)) {
          // Formato tradicional { name, description?, color?, cards: [...] }
          rawCards = json.cards;
          deckName = String(json.name || baseName).trim();
          deckDescription = json.description ? String(json.description).trim() : null;
          deckColor = json.color || '#3B82F6';
        } else if (hasKanji || hasHiragana || hasKatakana) {
          // Formato especial para estudos de japonês: { metadata, kanji: [...], hiragana: [...], katakana: [...] }
          logger.debug('Import: Detected structured Japanese JSON', { hasKanji, hasHiragana, hasKatakana });

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

          rawCards = [...kanjiCards, ...hiraganaCards, ...katakanaCards];
          deckName = String(json.name || baseName).trim();
          deckDescription = json.metadata?.descricao
            ? String(json.metadata.descricao).trim()
            : deckDescription;

          logger.debug('Import: Japanese JSON converted to raw cards', {
            totalKanji: kanjiCards.length,
            totalHiragana: hiraganaCards.length,
            totalKatakana: katakanaCards.length,
            totalCards: rawCards.length,
          });
        } else {
          logger.debug('Import: Validation failed (no cards array found)', { jsonKeys: Object.keys(json || {}) });
          toast({
            title: 'Arquivo inválido',
            description: 'O JSON deve ser um array de cards, conter { cards: [...] } ou um formato suportado de estudo (kanji/hiragana/katakana).',
            variant: 'destructive',
          });
          setImportModal({
            open: true,
            title: 'Arquivo inválido',
            description: 'O JSON deve ser um array de cards, conter { cards: [...] } ou um formato suportado de estudo (kanji/hiragana/katakana).',
            isError: true,
          });
          return;
        }
      }

      if (!rawCards || rawCards.length === 0) {
        logger.debug('Import: No cards found after parsing');
        toast({
          title: 'Arquivo inválido',
          description: 'Nenhum card encontrado no JSON.',
          variant: 'destructive',
        });
        setImportModal({
          open: true,
          title: 'Arquivo inválido',
          description: 'Nenhum card encontrado no JSON.',
          isError: true,
        });
        return;
      }

      const deckData = {
        user_id: user.id,
        name: deckName,
        description: deckDescription,
        color: deckColor,
        icon: 'BookOpen',
      };
      
      logger.debug('Import: Creating deck', { deckName: deckData.name });
      const { data: deck, error: deckError } = await flashcardService.createDeck(deckData);
      
      if (deckError) {
        logger.error('Import: Deck creation failed', deckError);
        throw deckError;
      }
      
      logger.debug('Import: Deck created successfully', { deckId: deck.id, deckName: deck.name });

      const cardsArray = (rawCards || [])
        .map((card) => ({
          deck_id: deck.id,
          user_id: user.id,
          front: String(card.front ?? '').trim(),
          back: String(card.back ?? '').trim(),
          card_type: card.card_type || 'basic',
          tags: Array.isArray(card.tags) ? card.tags : [],
        }))
        .filter((c) => c.front && c.back);

      logger.debug('Import: Processed cards', { 
        totalCards: rawCards.length,
        validCards: cardsArray.length 
      });

      if (cardsArray.length > 0) {
        logger.debug('Import: Creating cards');
        const { error: cardsError } = await flashcardService.createCards(cardsArray);
        if (cardsError) {
          logger.error('Import: Cards creation failed', cardsError);
          throw cardsError;
        }
        logger.debug('Import: Cards created successfully');
      }

      toast({
        title: 'Deck importado!',
        description: `Deck "${deck.name}" criado com ${cardsArray.length} cards.`,
      });

      setImportModal({
        open: true,
        title: 'Deck importado!',
        description: `Deck "${deck.name}" criado com ${cardsArray.length} cards.`,
        isError: false,
      });

      logger.debug('Import: Navigation scheduled');
      // Small delay to ensure DevTools stays connected
      setTimeout(() => {
        logger.debug('Import: Navigating to deck');
        navigate(`/students/flashcards/decks/${deck.id}`);
      }, 100);
    } catch (error) {
      logger.error('Error importing deck JSON:', error);
      toast({
        title: 'Erro ao importar deck',
        description: 'Verifique o arquivo JSON e tente novamente.',
        variant: 'destructive',
      });
      setImportModal({
        open: true,
        title: 'Erro ao importar deck',
        description: 'Verifique o arquivo JSON e tente novamente.',
        isError: true,
      });
    } finally {
      logger.debug('Import: Finally block, resetting importing state');
      setImporting(false);
    }
  };

  const handleApkgImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    
    logger.debug('Import APKG: File selected', { fileName: file?.name, size: file?.size });

    if (!file) {
      logger.debug('Import APKG: No file selected');
      return;
    }

    if (!user?.id) {
      logger.debug('Import APKG: User not authenticated');
      toast({
        title: 'Usuário não autenticado',
        description: 'Faça login para importar decks.',
        variant: 'destructive',
      });
      return;
    }

    try {
      logger.debug('Import APKG: Starting import process');
      setImportingApkg(true);

      // Validar tamanho (max 100MB)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O arquivo deve ter no máximo 100MB.',
          variant: 'destructive',
        });
        setImportModal({
          open: true,
          title: 'Arquivo muito grande',
          description: 'O arquivo deve ter no máximo 100MB.',
          isError: true,
        });
        return;
      }

      toast({
        title: 'Enviando arquivo...',
        description: 'Aguarde enquanto o deck Anki é processado.',
      });

      setImportModal({
        open: true,
        title: 'Importando deck Anki (.apkg)...',
        description: `Estamos enviando e processando o arquivo "${file.name}". Isso pode levar alguns minutos para decks grandes.`,
        isError: false,
      });

      // Upload para Storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('flashcards-imports')
        .upload(filePath, file);

      if (uploadError) {
        logger.error('Import APKG: Upload error', uploadError);
        throw new Error('Falha ao enviar arquivo');
      }

      logger.debug('Import APKG: File uploaded', { path: filePath });

      // Inferir nome do deck do arquivo
      const deckName = file.name.replace(/\.apkg$/i, '');

      // Obter token de sessão para chamar a Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Chamar Edge Function via fetch (mesmo padrão do generate-flashcards)
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
            create_new_deck: true,
            deck_name: deckName,
            deck_description: 'Deck importado do Anki',
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        logger.error('Import APKG: Function error', { status: response.status, data });
        throw new Error(data?.error || 'Erro ao processar deck Anki');
      }

      logger.debug('Import APKG: Import successful', data);

      toast({
        title: 'Deck importado com sucesso!',
        description: `${data.import_stats?.total_cards_created || 0} cards foram adicionados ao deck "${deckName}".`,
      });

      setImportModal({
        open: true,
        title: 'Deck importado com sucesso!',
        description: `${data.import_stats?.total_cards_created || 0} cards foram adicionados ao deck "${deckName}".`,
        isError: false,
      });

      // Navegar para o deck
      setTimeout(() => {
        navigate(`/students/flashcards/decks/${data.deck_id}`);
      }, 100);

    } catch (error) {
      logger.error('Import APKG: Error', error);
      toast({
        title: 'Erro ao importar deck Anki',
        description: error.message || 'Verifique o arquivo e tente novamente.',
        variant: 'destructive',
      });
       setImportModal({
        open: true,
        title: 'Erro ao importar deck Anki',
        description: error.message || 'Verifique o arquivo e tente novamente.',
        isError: true,
      });
    } finally {
      logger.debug('Import APKG: Finally block');
      setImportingApkg(false);
    }
  };

  const filteredDecks = decks.filter(deck =>
    deck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deck.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const aggregatedDueFromDecks = Object.keys(deckDueCounts).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header */}
      <DashboardHeader
        title="Flashcards"
        subtitle={`Sistema de repetição espaçada para memorização eficiente • Hoje: ${aggregatedDueFromDecks} cards para revisar`}
        actions={
          <div className="flex gap-2 relative z-10">
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
            {/* Botão de Importação com Menu Dropdown */}
            <div ref={buttonRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportMenuToggle}
                disabled={importing || importingApkg}
                className="bg-white text-slate-900 border-white/20 hover:bg-white/90 hover:text-slate-900"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing || importingApkg ? 'Importando...' : 'Importar Deck'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </div>
            {/* Menu Dropdown via Portal */}
            {showImportMenu && !importing && !importingApkg && createPortal(
              <div 
                ref={importMenuRef}
                className="fixed w-64 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border-2 border-slate-300 dark:border-slate-600" 
                style={{ 
                  zIndex: 9999,
                  top: `${menuPosition.top}px`,
                  right: `${menuPosition.right}px`
                }}
              >
                <div className="py-2">
                  <button
                    type="button"
                    className="flex w-full items-center px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-colors border-b-2 border-slate-200 dark:border-slate-600 text-left"
                    onClick={() => {
                      setShowImportMenu(false);
                      if (!importing && fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    <FileJson className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">Importar JSON</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Formato customizado</div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    className="flex w-full items-center px-4 py-3 hover:bg-purple-50 dark:hover:bg-slate-700 cursor-pointer transition-colors text-left"
                    onClick={() => {
                      setShowImportMenu(false);
                      if (!importingApkg && apkgInputRef.current) {
                        apkgInputRef.current.click();
                      }
                    }}
                  >
                    <Package className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">Importar Anki (.apkg)</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Deck do Anki com mídia</div>
                    </div>
                  </button>
                </div>
              </div>,
              document.body
            )}
            
            {/* Hidden file inputs (mantidos para compatibilidade) */}
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              type="file"
              accept=".apkg"
              ref={apkgInputRef}
              className="hidden"
              onChange={handleApkgImport}
            />
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

      <Dialog
        open={importModal.open}
        onOpenChange={(open) => {
          if (importing || importingApkg) return;
          setImportModal((prev) => ({ ...prev, open }));
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={importModal.isError ? 'text-red-600 dark:text-red-400' : ''}>
              {importModal.title || 'Importação de deck'}
            </DialogTitle>
            {importModal.description && (
              <DialogDescription>
                {importModal.description}
              </DialogDescription>
            )}
          </DialogHeader>
          {(importing || importingApkg) && (
            <div className="mt-4">
              <LoadingSpinner
                size="sm"
                text="Processando, aguarde..."
                center
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
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
              if (totalCards === 0) return;
              onStudy();
            }}
            disabled={totalCards === 0}
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
