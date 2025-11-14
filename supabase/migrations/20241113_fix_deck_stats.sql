-- ============================================================================
-- FIX: Deck Stats não sendo criado automaticamente
-- Data: 2024-11-13
-- Problema: deck_stats existe mas não é populado ao criar deck
-- ============================================================================

-- 1. Criar função para popular deck_stats quando deck é criado
CREATE OR REPLACE FUNCTION create_deck_stats_for_new_deck()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deck_stats (
    deck_id,
    user_id,
    new_cards,
    learning_cards,
    young_cards,
    mature_cards,
    suspended_cards,
    cards_due_today,
    cards_due_week,
    average_retention,
    total_reviews_today,
    total_time_today_ms,
    current_streak_days,
    longest_streak_days
  )
  VALUES (
    NEW.id,
    NEW.user_id,
    0, -- new_cards
    0, -- learning_cards
    0, -- young_cards
    0, -- mature_cards
    0, -- suspended_cards
    0, -- cards_due_today
    0, -- cards_due_week
    0, -- average_retention
    0, -- total_reviews_today
    0, -- total_time_today_ms
    0, -- current_streak_days
    0  -- longest_streak_days
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger para executar a função
DROP TRIGGER IF EXISTS create_deck_stats_trigger ON decks;
CREATE TRIGGER create_deck_stats_trigger
AFTER INSERT ON decks
FOR EACH ROW EXECUTE FUNCTION create_deck_stats_for_new_deck();

-- 3. Popular deck_stats para decks existentes que não têm stats
INSERT INTO deck_stats (
  deck_id,
  user_id,
  new_cards,
  learning_cards,
  young_cards,
  mature_cards,
  suspended_cards,
  cards_due_today,
  cards_due_week,
  average_retention,
  total_reviews_today,
  total_time_today_ms,
  current_streak_days,
  longest_streak_days
)
SELECT 
  d.id as deck_id,
  d.user_id,
  COALESCE(COUNT(c.id) FILTER (WHERE cs.card_status = 'new'), 0) as new_cards,
  COALESCE(COUNT(c.id) FILTER (WHERE cs.card_status = 'learning'), 0) as learning_cards,
  COALESCE(COUNT(c.id) FILTER (WHERE cs.card_status = 'young'), 0) as young_cards,
  COALESCE(COUNT(c.id) FILTER (WHERE cs.card_status = 'mature'), 0) as mature_cards,
  COALESCE(COUNT(c.id) FILTER (WHERE c.is_suspended = TRUE), 0) as suspended_cards,
  COALESCE(COUNT(c.id) FILTER (WHERE cs.next_review_at <= NOW()), 0) as cards_due_today,
  COALESCE(COUNT(c.id) FILTER (WHERE cs.next_review_at <= NOW() + INTERVAL '7 days'), 0) as cards_due_week,
  0 as average_retention,
  0 as total_reviews_today,
  0 as total_time_today_ms,
  0 as current_streak_days,
  0 as longest_streak_days
FROM decks d
LEFT JOIN cards c ON c.deck_id = d.id
LEFT JOIN card_stats cs ON cs.card_id = c.id
WHERE NOT EXISTS (
  SELECT 1 FROM deck_stats ds WHERE ds.deck_id = d.id
)
GROUP BY d.id, d.user_id;

-- 4. Criar função para atualizar deck_stats quando card é adicionado/removido/atualizado
CREATE OR REPLACE FUNCTION update_deck_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_deck_id UUID;
BEGIN
  -- Determinar deck_id baseado na operação
  IF TG_OP = 'DELETE' THEN
    v_deck_id := OLD.deck_id;
  ELSE
    v_deck_id := NEW.deck_id;
  END IF;

  -- Atualizar estatísticas do deck
  UPDATE deck_stats ds
  SET
    new_cards = COALESCE((
      SELECT COUNT(*) 
      FROM cards c 
      JOIN card_stats cs ON cs.card_id = c.id 
      WHERE c.deck_id = v_deck_id AND cs.card_status = 'new'
    ), 0),
    learning_cards = COALESCE((
      SELECT COUNT(*) 
      FROM cards c 
      JOIN card_stats cs ON cs.card_id = c.id 
      WHERE c.deck_id = v_deck_id AND cs.card_status = 'learning'
    ), 0),
    young_cards = COALESCE((
      SELECT COUNT(*) 
      FROM cards c 
      JOIN card_stats cs ON cs.card_id = c.id 
      WHERE c.deck_id = v_deck_id AND cs.card_status = 'young'
    ), 0),
    mature_cards = COALESCE((
      SELECT COUNT(*) 
      FROM cards c 
      JOIN card_stats cs ON cs.card_id = c.id 
      WHERE c.deck_id = v_deck_id AND cs.card_status = 'mature'
    ), 0),
    suspended_cards = COALESCE((
      SELECT COUNT(*) 
      FROM cards c 
      WHERE c.deck_id = v_deck_id AND c.is_suspended = TRUE
    ), 0),
    cards_due_today = COALESCE((
      SELECT COUNT(*) 
      FROM cards c 
      JOIN card_stats cs ON cs.card_id = c.id 
      WHERE c.deck_id = v_deck_id AND cs.next_review_at <= NOW()
    ), 0),
    cards_due_week = COALESCE((
      SELECT COUNT(*) 
      FROM cards c 
      JOIN card_stats cs ON cs.card_id = c.id 
      WHERE c.deck_id = v_deck_id AND cs.next_review_at <= NOW() + INTERVAL '7 days'
    ), 0),
    updated_at = NOW()
  WHERE ds.deck_id = v_deck_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar triggers para atualizar deck_stats
DROP TRIGGER IF EXISTS update_deck_stats_on_card_change ON cards;
CREATE TRIGGER update_deck_stats_on_card_change
AFTER INSERT OR UPDATE OR DELETE ON cards
FOR EACH ROW EXECUTE FUNCTION update_deck_stats();

DROP TRIGGER IF EXISTS update_deck_stats_on_card_stats_change ON card_stats;
CREATE TRIGGER update_deck_stats_on_card_stats_change
AFTER UPDATE ON card_stats
FOR EACH ROW EXECUTE FUNCTION update_deck_stats();

-- 6. Comentários
COMMENT ON FUNCTION create_deck_stats_for_new_deck() IS 'Cria deck_stats automaticamente ao criar um deck';
COMMENT ON FUNCTION update_deck_stats() IS 'Atualiza deck_stats quando cards são modificados';
COMMENT ON TRIGGER create_deck_stats_trigger ON decks IS 'Trigger para criar deck_stats ao criar deck';
COMMENT ON TRIGGER update_deck_stats_on_card_change ON cards IS 'Trigger para atualizar deck_stats ao modificar cards';
COMMENT ON TRIGGER update_deck_stats_on_card_stats_change ON card_stats IS 'Trigger para atualizar deck_stats ao atualizar card_stats';
