/**
 * Spaced Repetition Algorithm (SM-2)
 * Based on SuperMemo SM-2 algorithm
 * 
 * Quality ratings:
 * 0 - Complete blackout
 * 1 - Incorrect response, but correct one remembered
 * 2 - Correct response, but with difficulty
 * 3 - Correct response with some hesitation
 * 4 - Perfect response
 */

import { logger } from '@/shared/utils/logger';

/**
 * Calculate next review interval using SM-2 algorithm
 * @param {Object} card_stat - Current card statistics
 * @param {number} quality - Quality of recall (0-4)
 * @param {Object} settings - User settings for multipliers
 * @returns {Object} Updated card statistics
 */
export function calculateNextReview(card_stat, quality, settings = {}) {
  const {
    easy_multiplier = 2.5,
    good_multiplier = 1.0,
    hard_multiplier = 0.5,
    max_interval_days = 365,
    graduating_interval = 1,
    easy_interval = 4,
  } = settings;

  let {
    easiness_factor = 2.5,
    interval_days = 0,
    repetitions = 0,
  } = card_stat;

  // Clone to avoid mutation
  let newEF = easiness_factor;
  let newInterval = interval_days;
  let newReps = repetitions;
  let newStatus = card_stat.card_status || 'new';

  // ========================================
  // STEP 1: Update Easiness Factor (EF)
  // ========================================
  // Formula: EF' = EF + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02))
  
  if (quality >= 0 && quality <= 4) {
    const qualityBonus = 0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02);
    newEF = easiness_factor + qualityBonus;
    
    // EF should not fall below 1.3
    newEF = Math.max(1.3, newEF);
    
    // Cap EF at reasonable value
    newEF = Math.min(3.0, newEF);
    
    // Round to 2 decimal places
    newEF = Math.round(newEF * 100) / 100;
  }

  // ========================================
  // STEP 2: Determine next interval
  // ========================================
  
  if (quality < 2) {
    // ❌ FAILED - Reset progress
    newReps = 0;
    newInterval = 0;
    newStatus = newStatus === 'new' ? 'learning' : 'relearning';
    
  } else {
    // ✅ PASSED
    
    if (newStatus === 'new') {
      // First time seeing this card
      if (quality === 4) {
        // Perfect - skip learning
        newInterval = easy_interval;
        newReps = 1;
        newStatus = 'young';
      } else {
        // Start learning
        newInterval = graduating_interval;
        newReps = 1;
        newStatus = 'learning';
      }
      
    } else if (newStatus === 'learning' || newStatus === 'relearning') {
      // In learning phase
      if (quality === 4) {
        // Easy - graduate faster
        newInterval = easy_interval;
        newReps = 2;
        newStatus = 'young';
      } else {
        // Graduate normally
        newInterval = graduating_interval;
        newReps = 1;
        newStatus = 'young';
      }
      
    } else {
      // Already graduated (young or mature)
      newReps += 1;
      
      // Calculate interval based on quality
      switch(quality) {
        case 4: // Easy
          if (newReps === 1) {
            newInterval = 1;
          } else if (newReps === 2) {
            newInterval = 6;
          } else {
            newInterval = Math.round(interval_days * newEF * easy_multiplier);
          }
          break;
          
        case 3: // Good
          if (newReps === 1) {
            newInterval = 1;
          } else if (newReps === 2) {
            newInterval = 6;
          } else {
            newInterval = Math.round(interval_days * newEF * good_multiplier);
          }
          break;
          
        case 2: // Hard
          if (newReps === 1) {
            newInterval = 1;
          } else {
            newInterval = Math.max(1, Math.round(interval_days * hard_multiplier));
          }
          break;
          
        default:
          newInterval = 1;
      }
      
      // Cap interval at maximum
      newInterval = Math.min(newInterval, max_interval_days);
      
      // Update status based on interval
      if (newInterval >= 21) {
        newStatus = 'mature';
      } else {
        newStatus = 'young';
      }
    }
  }

  // ========================================
  // STEP 3: Calculate next review date
  // ========================================
  const now = new Date();
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    easiness_factor: newEF,
    interval_days: newInterval,
    repetitions: newReps,
    card_status: newStatus,
    next_review_at: nextReviewDate.toISOString(),
  };
}

/**
 * Preview what would happen for each quality option
 * @param {Object} card_stat - Current card statistics
 * @param {Object} settings - User settings
 * @returns {Object} Preview for each quality (0-4)
 */
export function previewIntervals(card_stat, settings = {}) {
  const qualities = [
    { value: 0, label: 'Repetir', color: 'red' },
    { value: 1, label: 'Difícil', color: 'orange' },
    { value: 2, label: 'Bom', color: 'blue' },
    { value: 3, label: 'Fácil', color: 'green' },
    { value: 4, label: 'Perfeito', color: 'emerald' },
  ];

  return qualities.map(q => {
    const result = calculateNextReview(card_stat, q.value, settings);
    return {
      ...q,
      interval_days: result.interval_days,
      next_review_at: result.next_review_at,
      formatted_interval: formatInterval(result.interval_days),
    };
  });
}

/**
 * Format interval in human-readable way
 * @param {number} days - Number of days
 * @returns {string} Formatted string
 */
export function formatInterval(days) {
  if (days === 0) return 'Agora';
  if (days === 1) return '1 dia';
  if (days < 7) return `${days} dias`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 semana' : `${weeks} semanas`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? '1 mês' : `${months} meses`;
  }
  const years = Math.round(days / 365);
  return years === 1 ? '1 ano' : `${years} anos`;
}

/**
 * Get quality label and description
 * @param {number} quality - Quality rating (0-4)
 * @returns {Object} Label, description, and color
 */
export function getQualityInfo(quality) {
  const qualityMap = {
    0: {
      label: 'Repetir',
      description: 'Não lembrei',
      color: 'red',
      icon: 'X',
      shortcut: '1',
    },
    1: {
      label: 'Difícil',
      description: 'Lembrei com muita dificuldade',
      color: 'orange',
      icon: 'AlertCircle',
      shortcut: '2',
    },
    2: {
      label: 'Bom',
      description: 'Lembrei com algum esforço',
      color: 'blue',
      icon: 'Check',
      shortcut: '3',
    },
    3: {
      label: 'Fácil',
      description: 'Lembrei facilmente',
      color: 'green',
      icon: 'CheckCircle',
      shortcut: '4',
    },
    4: {
      label: 'Perfeito',
      description: 'Resposta perfeita e imediata',
      color: 'emerald',
      icon: 'Sparkles',
      shortcut: '5',
    },
  };

  return qualityMap[quality] || qualityMap[2];
}

/**
 * Calculate retention rate
 * @param {number} correct - Number of correct reviews
 * @param {number} total - Total number of reviews
 * @returns {number} Percentage (0-100)
 */
export function calculateRetention(correct, total) {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Predict future workload
 * @param {Array} cards - Array of card_stats
 * @param {number} days - Number of days to predict
 * @returns {Array} Predicted reviews per day
 */
export function predictWorkload(cards, days = 7) {
  const predictions = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + i);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const dueCards = cards.filter(card => {
      const reviewDate = new Date(card.next_review_at);
      return reviewDate >= targetDate && reviewDate < nextDate;
    });

    predictions.push({
      date: targetDate.toISOString().split('T')[0],
      count: dueCards.length,
      new_cards: dueCards.filter(c => c.card_status === 'new').length,
      review_cards: dueCards.filter(c => c.card_status !== 'new').length,
    });
  }

  return predictions;
}

/**
 * Get cards due for review
 * @param {Array} cards - Array of card_stats with card data
 * @param {Object} options - Filter options
 * @returns {Array} Filtered and sorted cards
 */
export function getDueCards(cards, options = {}) {
  const {
    include_new = true,
    include_learning = true,
    include_review = true,
    max_new = 20,
    max_reviews = 200,
    order = 'random', // 'random', 'difficulty', 'chronological'
  } = options;

  const now = new Date();
  
  let dueCards = cards.filter(card => {
    if (card.is_suspended) {
      return false;
    }

    // Cards novos são SEMPRE devidos (não verificar next_review_at)
    if (card.card_status === 'new') {
      return include_new;
    }

    // Para outros status, verificar se está devida
    // Validar next_review_at primeiro
    if (!card.next_review_at) {
      return include_review;
    }
    
    const reviewDate = new Date(card.next_review_at);
    if (isNaN(reviewDate.getTime())) {
      return include_review;
    }
    
    const isDue = reviewDate <= now;

    if (card.card_status === 'learning' || card.card_status === 'relearning') {
      return include_learning && isDue;
    }
    
    return include_review && isDue;
  });

  // Separate new cards and review cards
  const newCards = dueCards.filter(c => c.card_status === 'new').slice(0, max_new);
  const reviewCards = dueCards.filter(c => c.card_status !== 'new').slice(0, max_reviews);

  // Combine
  dueCards = [...newCards, ...reviewCards];

  // Sort based on order preference
  switch (order) {
    case 'difficulty':
      // Sort by easiness factor (lower = harder)
      dueCards.sort((a, b) => a.easiness_factor - b.easiness_factor);
      break;
      
    case 'chronological':
      // Sort by next_review_at (oldest first)
      dueCards.sort((a, b) => 
        new Date(a.next_review_at) - new Date(b.next_review_at)
      );
      break;
      
    case 'random':
    default:
      // Shuffle array
      for (let i = dueCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dueCards[i], dueCards[j]] = [dueCards[j], dueCards[i]];
      }
      break;
  }

  return dueCards;
}

/**
 * Calculate study statistics
 * @param {Array} reviews - Array of card_reviews
 * @param {string} period - 'today', 'week', 'month', 'all'
 * @returns {Object} Statistics
 */
export function calculateStudyStats(reviews, period = 'today') {
  const now = new Date();
  let startDate = new Date(now);

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case 'all':
      startDate = new Date(0);
      break;
  }

  const filteredReviews = reviews.filter(r => 
    new Date(r.reviewed_at) >= startDate
  );

  const total = filteredReviews.length;
  const correct = filteredReviews.filter(r => r.quality >= 2).length;
  const totalTime = filteredReviews.reduce((sum, r) => sum + (r.time_taken_ms || 0), 0);
  const avgTime = total > 0 ? Math.round(totalTime / total) : 0;

  // Group by day for chart data
  const byDay = {};
  filteredReviews.forEach(r => {
    const date = new Date(r.reviewed_at).toISOString().split('T')[0];
    if (!byDay[date]) {
      byDay[date] = { date, reviews: 0, correct: 0 };
    }
    byDay[date].reviews++;
    if (r.quality >= 2) byDay[date].correct++;
  });

  const chartData = Object.values(byDay).sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  return {
    total_reviews: total,
    correct_reviews: correct,
    incorrect_reviews: total - correct,
    retention_rate: calculateRetention(correct, total),
    average_time_ms: avgTime,
    total_time_ms: totalTime,
    chart_data: chartData,
  };
}

export default {
  calculateNextReview,
  previewIntervals,
  formatInterval,
  getQualityInfo,
  calculateRetention,
  predictWorkload,
  getDueCards,
  calculateStudyStats,
};
