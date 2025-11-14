-- Migration: Flashcards System with Spaced Repetition
-- Created: 2024-11-12
-- Description: Complete flashcard system with SM-2 algorithm support

-- ============================================================================
-- 1. DECKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
  icon VARCHAR(50) DEFAULT 'BookOpen',
  is_public BOOLEAN DEFAULT FALSE,
  is_smart_deck BOOLEAN DEFAULT FALSE, -- For dynamic/filtered decks
  filter_config JSONB, -- Stores filter criteria for smart decks
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  total_cards INTEGER DEFAULT 0,
  cards_due_today INTEGER DEFAULT 0,
  
  CONSTRAINT deck_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_decks_is_public ON decks(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_decks_updated_at ON decks(updated_at DESC);

-- ============================================================================
-- 2. CARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Card content
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  
  -- Card type: 'basic', 'reversed', 'cloze', 'multiple_choice', 'match', 'order', 'image_occlusion'
  card_type VARCHAR(50) DEFAULT 'basic' NOT NULL,
  
  -- Additional data based on type
  type_data JSONB, -- Stores choices for multiple_choice, cloze deletions, image coords, etc.
  
  -- Organization
  tags TEXT[] DEFAULT '{}',
  
  -- Media
  images TEXT[] DEFAULT '{}', -- Array of image URLs
  audio_url TEXT,
  
  -- Status
  is_suspended BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT card_front_not_empty CHECK (LENGTH(TRIM(front)) > 0),
  CONSTRAINT card_back_not_empty CHECK (LENGTH(TRIM(back)) > 0),
  CONSTRAINT valid_card_type CHECK (card_type IN ('basic', 'reversed', 'cloze', 'multiple_choice', 'match', 'order', 'image_occlusion'))
);

CREATE INDEX idx_cards_deck_id ON cards(deck_id);
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_tags ON cards USING GIN(tags);
CREATE INDEX idx_cards_created_at ON cards(created_at DESC);
CREATE INDEX idx_cards_is_suspended ON cards(is_suspended) WHERE is_suspended = FALSE;

-- Full-text search index
CREATE INDEX idx_cards_search ON cards USING GIN(
  to_tsvector('portuguese', COALESCE(front, '') || ' ' || COALESCE(back, ''))
);

-- ============================================================================
-- 3. CARD_REVIEWS TABLE (History of all reviews)
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Review data
  quality INTEGER NOT NULL CHECK (quality BETWEEN 0 AND 4), -- 0=Again, 1=Hard, 2=Good, 3=Easy, 4=Perfect
  
  -- SM-2 Algorithm data
  easiness_factor DECIMAL(4,2) NOT NULL DEFAULT 2.5, -- EF value (1.3 - 2.5+)
  interval_days INTEGER NOT NULL DEFAULT 0, -- Days until next review
  repetitions INTEGER NOT NULL DEFAULT 0, -- Consecutive correct answers
  
  -- Timing
  time_taken_ms INTEGER, -- Milliseconds to answer
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Context
  review_mode VARCHAR(50) DEFAULT 'normal', -- 'normal', 'cram', 'preview'
  
  CONSTRAINT valid_easiness CHECK (easiness_factor >= 1.3),
  CONSTRAINT valid_interval CHECK (interval_days >= 0)
);

CREATE INDEX idx_card_reviews_card_id ON card_reviews(card_id);
CREATE INDEX idx_card_reviews_user_id ON card_reviews(user_id);
CREATE INDEX idx_card_reviews_reviewed_at ON card_reviews(reviewed_at DESC);

-- ============================================================================
-- 4. CARD_STATS TABLE (Current state for SM-2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL UNIQUE REFERENCES cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- SM-2 Current state
  easiness_factor DECIMAL(4,2) NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  
  -- Review status: 'new', 'learning', 'young', 'mature', 'relearning'
  card_status VARCHAR(50) DEFAULT 'new' NOT NULL,
  
  -- Scheduling
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  next_review_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Cards start as "due now"
  
  -- Statistics
  total_reviews INTEGER DEFAULT 0,
  correct_reviews INTEGER DEFAULT 0,
  incorrect_reviews INTEGER DEFAULT 0,
  average_time_ms INTEGER,
  
  -- Derived metrics
  retention_rate DECIMAL(5,2), -- Percentage (0-100)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_ef CHECK (easiness_factor >= 1.3),
  CONSTRAINT valid_status CHECK (card_status IN ('new', 'learning', 'young', 'mature', 'relearning'))
);

CREATE INDEX idx_card_stats_card_id ON card_stats(card_id);
CREATE INDEX idx_card_stats_user_id ON card_stats(user_id);
CREATE INDEX idx_card_stats_next_review ON card_stats(next_review_at);
CREATE INDEX idx_card_stats_status ON card_stats(card_status);

-- Index for "due cards" queries
CREATE INDEX idx_card_stats_due ON card_stats(user_id, next_review_at, card_status);

-- ============================================================================
-- 5. DECK_STATS TABLE (Aggregated deck statistics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deck_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL UNIQUE REFERENCES decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Card counts by status
  new_cards INTEGER DEFAULT 0,
  learning_cards INTEGER DEFAULT 0,
  young_cards INTEGER DEFAULT 0,
  mature_cards INTEGER DEFAULT 0,
  suspended_cards INTEGER DEFAULT 0,
  
  -- Due cards
  cards_due_today INTEGER DEFAULT 0,
  cards_due_week INTEGER DEFAULT 0,
  
  -- Performance metrics
  average_retention DECIMAL(5,2),
  total_reviews_today INTEGER DEFAULT 0,
  total_time_today_ms INTEGER DEFAULT 0,
  
  -- Streaks
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_review_date DATE,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deck_stats_deck_id ON deck_stats(deck_id);
CREATE INDEX idx_deck_stats_user_id ON deck_stats(user_id);

-- ============================================================================
-- 6. USER_SETTINGS TABLE (Personalization)
-- ============================================================================
CREATE TABLE IF NOT EXISTS flashcard_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Daily limits
  new_cards_per_day INTEGER DEFAULT 20,
  max_reviews_per_day INTEGER DEFAULT 200,
  
  -- Algorithm customization
  easy_multiplier DECIMAL(3,2) DEFAULT 2.5,
  good_multiplier DECIMAL(3,2) DEFAULT 1.0,
  hard_multiplier DECIMAL(3,2) DEFAULT 0.5,
  
  -- Learning steps (in minutes)
  learning_steps INTEGER[] DEFAULT '{1, 10}',
  
  -- Graduating intervals (days)
  graduating_interval INTEGER DEFAULT 1,
  easy_interval INTEGER DEFAULT 4,
  
  -- Maximum interval (days)
  max_interval_days INTEGER DEFAULT 365,
  
  -- Review order: 'random', 'difficulty', 'chronological'
  review_order VARCHAR(50) DEFAULT 'random',
  
  -- UI preferences
  show_remaining_count BOOLEAN DEFAULT TRUE,
  show_next_intervals BOOLEAN DEFAULT TRUE,
  auto_play_audio BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flashcard_user_settings_user_id ON flashcard_user_settings(user_id);

-- ============================================================================
-- 7. SHARED_DECKS TABLE (Public deck marketplace)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shared_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  
  -- Stats
  clone_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  
  -- Status
  is_featured BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shared_decks_creator ON shared_decks(creator_id);
CREATE INDEX idx_shared_decks_category ON shared_decks(category);
CREATE INDEX idx_shared_decks_rating ON shared_decks(rating_average DESC);
CREATE INDEX idx_shared_decks_clones ON shared_decks(clone_count DESC);

-- ============================================================================
-- 8. DECK_RATINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS deck_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_deck_id UUID NOT NULL REFERENCES shared_decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(shared_deck_id, user_id)
);

CREATE INDEX idx_deck_ratings_shared_deck ON deck_ratings(shared_deck_id);
CREATE INDEX idx_deck_ratings_user ON deck_ratings(user_id);

-- ============================================================================
-- 9. TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_decks_updated_at BEFORE UPDATE ON decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_stats_updated_at BEFORE UPDATE ON card_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create card_stats when card is created
CREATE OR REPLACE FUNCTION create_card_stats_for_new_card()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO card_stats (card_id, user_id, easiness_factor, interval_days, repetitions, card_status, next_review_at)
  VALUES (NEW.id, NEW.user_id, 2.5, 0, 0, 'new', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_card_stats_trigger
AFTER INSERT ON cards
FOR EACH ROW EXECUTE FUNCTION create_card_stats_for_new_card();

-- Function to update deck card count
CREATE OR REPLACE FUNCTION update_deck_card_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE decks SET total_cards = total_cards + 1 WHERE id = NEW.deck_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE decks SET total_cards = GREATEST(total_cards - 1, 0) WHERE id = OLD.deck_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deck_card_count_trigger
AFTER INSERT OR DELETE ON cards
FOR EACH ROW EXECUTE FUNCTION update_deck_card_count();

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_ratings ENABLE ROW LEVEL SECURITY;

-- DECKS policies
CREATE POLICY "Users can view their own decks" ON decks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public decks" ON decks
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can create their own decks" ON decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks" ON decks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks" ON decks
  FOR DELETE USING (auth.uid() = user_id);

-- CARDS policies
CREATE POLICY "Users can view cards from their decks" ON cards
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM decks WHERE decks.id = cards.deck_id AND decks.is_public = TRUE)
  );

CREATE POLICY "Users can create cards in their decks" ON cards
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM decks WHERE decks.id = deck_id AND decks.user_id = auth.uid())
  );

CREATE POLICY "Users can update their own cards" ON cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards" ON cards
  FOR DELETE USING (auth.uid() = user_id);

-- CARD_REVIEWS policies
CREATE POLICY "Users can view their own reviews" ON card_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reviews" ON card_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CARD_STATS policies
CREATE POLICY "Users can view their own card stats" ON card_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own card stats" ON card_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- DECK_STATS policies
CREATE POLICY "Users can view their own deck stats" ON deck_stats
  FOR SELECT USING (auth.uid() = user_id);

-- USER_SETTINGS policies
CREATE POLICY "Users can view their own settings" ON flashcard_user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" ON flashcard_user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON flashcard_user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- SHARED_DECKS policies
CREATE POLICY "Everyone can view shared decks" ON shared_decks
  FOR SELECT USING (TRUE);

CREATE POLICY "Creators can manage their shared decks" ON shared_decks
  FOR ALL USING (auth.uid() = creator_id);

-- DECK_RATINGS policies
CREATE POLICY "Users can view all ratings" ON deck_ratings
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can create their own ratings" ON deck_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" ON deck_ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" ON deck_ratings
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 11. COMMENTS
-- ============================================================================

COMMENT ON TABLE decks IS 'Flashcard decks - collections of cards';
COMMENT ON TABLE cards IS 'Individual flashcards with content and metadata';
COMMENT ON TABLE card_reviews IS 'Historical record of all card reviews';
COMMENT ON TABLE card_stats IS 'Current SM-2 state and statistics for each card';
COMMENT ON TABLE deck_stats IS 'Aggregated statistics for decks';
COMMENT ON TABLE flashcard_user_settings IS 'User preferences for flashcard algorithm and UI';
COMMENT ON TABLE shared_decks IS 'Publicly shared decks in marketplace';
COMMENT ON TABLE deck_ratings IS 'User ratings and reviews of shared decks';