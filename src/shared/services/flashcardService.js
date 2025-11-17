/**
 * Flashcard Service
 * Handles all flashcard-related database operations
 */

import { supabase } from './supabaseClient';
import { logger } from '@/shared/utils/logger';
import { calculateNextReview, getDueCards } from './spacedRepetition';

// ============================================================================
// DECKS
// ============================================================================

export async function getDecks(userId) {
  try {
    const { data, error } = await supabase
      .from('decks')
      .select(`
        *,
        deck_stats(*)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error fetching decks:', error);
    return { data: null, error };
  }
}

export async function getDeckById(deckId) {
  try {
    const { data, error } = await supabase
      .from('decks')
      .select(`
        *,
        deck_stats(*)
      `)
      .eq('id', deckId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error fetching deck:', error);
    return { data: null, error };
  }
}

export async function createDeck(deckData) {
  try {
    const { data, error } = await supabase
      .from('decks')
      .insert([deckData])
      .select()
      .single();

    if (error) throw error;

    // Create deck_stats entry
    await supabase.from('deck_stats').insert([{
      deck_id: data.id,
      user_id: deckData.user_id,
    }]);

    return { data, error: null };
  } catch (error) {
    logger.error('Error creating deck:', error);
    return { data: null, error };
  }
}

export async function updateDeck(deckId, updates) {
  try {
    const { data, error } = await supabase
      .from('decks')
      .update(updates)
      .eq('id', deckId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error updating deck:', error);
    return { data: null, error };
  }
}

export async function deleteDeck(deckId) {
  try {
    const { error } = await supabase
      .from('decks')
      .delete()
      .eq('id', deckId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    logger.error('Error deleting deck:', error);
    return { error };
  }
}

// ============================================================================
// CARDS
// ============================================================================

export async function getCardsInDeck(deckId) {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        card_stats(*)
      `)
      .eq('deck_id', deckId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error fetching cards:', error);
    return { data: null, error };
  }
}

export async function searchCards(userId, query, filters = {}) {
  try {
    let queryBuilder = supabase
      .from('cards')
      .select(`
        *,
        card_stats(*),
        deck:decks(name, color)
      `)
      .eq('user_id', userId);

    // Full-text search
    if (query) {
      queryBuilder = queryBuilder.textSearch('fts', query, {
        type: 'websearch',
        config: 'portuguese',
      });
    }

    // Apply filters
    if (filters.deck_id) {
      queryBuilder = queryBuilder.eq('deck_id', filters.deck_id);
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder = queryBuilder.contains('tags', filters.tags);
    }

    if (filters.card_type) {
      queryBuilder = queryBuilder.eq('card_type', filters.card_type);
    }

    if (filters.is_suspended !== undefined) {
      queryBuilder = queryBuilder.eq('is_suspended', filters.is_suspended);
    }

    const { data, error } = await queryBuilder.limit(100);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error searching cards:', error);
    return { data: null, error };
  }
}

export async function createCard(cardData) {
  try {
    const { data, error } = await supabase
      .from('cards')
      .insert([cardData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error creating card:', error);
    return { data: null, error };
  }
}

export async function createCards(cardsArray) {
  try {
    // Bulk insert sem .select() para reduzir o custo e evitar timeouts em lotes grandes
    const { error } = await supabase
      .from('cards')
      .insert(cardsArray);

    if (error) throw error;
    // Chamadores só precisam saber se deu certo ou não; não usamos as linhas retornadas
    return { data: null, error: null };
  } catch (error) {
    logger.error('Error creating cards:', error);
    return { data: null, error };
  }
}

export async function updateCard(cardId, updates) {
  try {
    const { data, error } = await supabase
      .from('cards')
      .update(updates)
      .eq('id', cardId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error updating card:', error);
    return { data: null, error };
  }
}

export async function deleteCard(cardId) {
  try {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    logger.error('Error deleting card:', error);
    return { error };
  }
}

export async function suspendCard(cardId, suspended = true) {
  return updateCard(cardId, { is_suspended: suspended });
}

// ============================================================================
// REVIEWS & STUDY SESSION
// ============================================================================

export async function getDueCardsForReview(deckId, userId, settings = {}) {
  try {
    // Get all cards with their stats
    const { data: cards, error } = await supabase
      .from('cards')
      .select(`
        *,
        card_stats(*)
      `)
      .eq('deck_id', deckId)
      .eq('user_id', userId)
      .eq('is_suspended', false);
    
    if (error) throw error;

    // Flatten card_stats (pode vir como array ou objeto)
    const cardsWithStats = cards.map(card => {
      // card_stats pode vir como array [stats] ou objeto {stats}
      const stats = Array.isArray(card.card_stats) 
        ? card.card_stats[0]  // Se for array, pega primeiro elemento
        : card.card_stats;     // Se for objeto, usa direto
      
      // IMPORTANTE: Preservar o card.id original antes do spread
      const cardId = card.id;
      
      const flatCard = {
        ...card,
        ...stats,
        id: cardId,  // ← Restaurar ID do card (não do stats)
        card_stats: undefined,
      };
      return flatCard;
    });

    // Use spaced repetition algorithm to filter and sort
    const dueCards = getDueCards(cardsWithStats, settings);

    return { data: dueCards, error: null };
  } catch (error) {
    logger.error('Error getting due cards:', error);
    return { data: null, error };
  }
}

export async function submitReview(cardId, userId, quality, timeMs, settings = {}) {
  try {
    // 1. Get current card stats
    const { data: cardStats, error: statsError } = await supabase
      .from('card_stats')
      .select('*')
      .eq('card_id', cardId)
      .eq('user_id', userId)
      .single();

    if (statsError) throw statsError;

    // 2. Calculate next review using SM-2
    const nextReviewData = calculateNextReview(cardStats, quality, settings);

    // 3. Insert review record
    const { error: reviewError } = await supabase
      .from('card_reviews')
      .insert([{
        card_id: cardId,
        user_id: userId,
        quality,
        easiness_factor: nextReviewData.easiness_factor,
        interval_days: nextReviewData.interval_days,
        repetitions: nextReviewData.repetitions,
        time_taken_ms: timeMs,
      }]);

    if (reviewError) throw reviewError;

    // 4. Update card stats
    const correct = quality >= 2 ? 1 : 0;
    const { data: updatedStats, error: updateError } = await supabase
      .from('card_stats')
      .update({
        ...nextReviewData,
        last_reviewed_at: new Date().toISOString(),
        total_reviews: cardStats.total_reviews + 1,
        correct_reviews: cardStats.correct_reviews + correct,
        incorrect_reviews: cardStats.incorrect_reviews + (1 - correct),
        retention_rate: ((cardStats.correct_reviews + correct) / (cardStats.total_reviews + 1)) * 100,
      })
      .eq('card_id', cardId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    return { data: updatedStats, error: null };
  } catch (error) {
    logger.error('Error submitting review:', error);
    return { data: null, error };
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

export async function getDeckStats(deckId, userId) {
  try {
    const { data, error } = await supabase
      .from('deck_stats')
      .select('*')
      .eq('deck_id', deckId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error fetching deck stats:', error);
    return { data: null, error };
  }
}

export async function getReviewHistory(userId, filters = {}) {
  try {
    let query = supabase
      .from('card_reviews')
      .select(`
        *,
        card:cards(front, back, deck_id)
      `)
      .eq('user_id', userId)
      .order('reviewed_at', { ascending: false });

    if (filters.card_id) {
      query = query.eq('card_id', filters.card_id);
    }

    if (filters.from_date) {
      query = query.gte('reviewed_at', filters.from_date);
    }

    if (filters.to_date) {
      query = query.lte('reviewed_at', filters.to_date);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error fetching review history:', error);
    return { data: null, error };
  }
}

export async function getUserStats(userId) {
  try {
    // Get all decks with stats
    const { data: decks } = await getDecks(userId);

    // Count cards for each deck
    if (decks && decks.length > 0) {
      const deckIds = decks.map(d => d.id);
      
      const { data: cardCounts } = await supabase
        .from('cards')
        .select('deck_id')
        .in('deck_id', deckIds)
        .eq('user_id', userId);

      // Group counts by deck_id
      const countsByDeck = {};
      if (cardCounts) {
        cardCounts.forEach(card => {
          countsByDeck[card.deck_id] = (countsByDeck[card.deck_id] || 0) + 1;
        });
      }

      // Add total_cards to each deck
      decks.forEach(deck => {
        deck.total_cards = countsByDeck[deck.id] || 0;
      });
    }

    // Get today's reviews
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayReviews } = await supabase
      .from('card_reviews')
      .select('*')
      .eq('user_id', userId)
      .gte('reviewed_at', today.toISOString());

    // Calculate aggregated stats
    const totalDecks = decks?.length || 0;
    const totalCards = decks?.reduce((sum, d) => sum + (d.total_cards || 0), 0) || 0;
    const dueToday = decks?.reduce((sum, d) => sum + (d.deck_stats?.[0]?.cards_due_today || 0), 0) || 0;
    const reviewsToday = todayReviews?.length || 0;

    const stats = {
      total_decks: totalDecks,
      total_cards: totalCards,
      cards_due_today: dueToday,
      reviews_today: reviewsToday,
      decks,
    };

    return { data: stats, error: null };
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    return { data: null, error };
  }
}

// ============================================================================
// USER SETTINGS
// ============================================================================

export async function getUserSettings(userId) {
  try {
    let { data, error } = await supabase
      .from('flashcard_user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If no settings exist, create default
    if (error && error.code === 'PGRST116') {
      const { data: newSettings, error: createError } = await supabase
        .from('flashcard_user_settings')
        .insert([{ user_id: userId }])
        .select()
        .single();

      if (createError) throw createError;
      return { data: newSettings, error: null };
    }

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error fetching user settings:', error);
    return { data: null, error };
  }
}

export async function updateUserSettings(userId, settings) {
  try {
    const { data, error } = await supabase
      .from('flashcard_user_settings')
      .update(settings)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error updating user settings:', error);
    return { data: null, error };
  }
}

export default {
  // Decks
  getDecks,
  getDeckById,
  createDeck,
  updateDeck,
  deleteDeck,
  
  // Cards
  getCardsInDeck,
  searchCards,
  createCard,
  createCards,
  updateCard,
  deleteCard,
  suspendCard,
  
  // Reviews
  getDueCardsForReview,
  submitReview,
  
  // Statistics
  getDeckStats,
  getReviewHistory,
  getUserStats,
  
  // Settings
  getUserSettings,
  updateUserSettings,
};
