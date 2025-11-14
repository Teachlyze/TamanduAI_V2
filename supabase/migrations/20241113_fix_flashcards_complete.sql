-- ============================================================================
-- CORREÇÃO COMPLETA: Flashcards - Deck Stats e Contadores
-- Data: 2024-11-13
-- Problema: Botão "Estudar" bloqueado porque deck_stats está vazio
-- ============================================================================

-- 1. Verificar e criar deck_stats para todos os decks existentes
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
  d.id AS deck_id,
  d.user_id,
  -- Contar cards por status
  COALESCE(SUM(CASE WHEN cs.card_status = 'new' THEN 1 ELSE 0 END), 0) AS new_cards,
  COALESCE(SUM(CASE WHEN cs.card_status = 'learning' THEN 1 ELSE 0 END), 0) AS learning_cards,
  COALESCE(SUM(CASE WHEN cs.card_status = 'young' THEN 1 ELSE 0 END), 0) AS young_cards,
  COALESCE(SUM(CASE WHEN cs.card_status = 'mature' THEN 1 ELSE 0 END), 0) AS mature_cards,
  COALESCE(SUM(CASE WHEN c.is_suspended = true THEN 1 ELSE 0 END), 0) AS suspended_cards,
  -- Contar cards devidos hoje
  COALESCE(SUM(
    CASE 
      WHEN cs.card_status = 'new' THEN 1
      WHEN cs.next_review_at IS NULL THEN 1
      WHEN cs.next_review_at::date <= CURRENT_DATE THEN 1
      ELSE 0
    END
  ), 0) AS cards_due_today,
  -- Contar cards devidos esta semana
  COALESCE(SUM(
    CASE 
      WHEN cs.next_review_at IS NULL THEN 1
      WHEN cs.next_review_at::date <= (CURRENT_DATE + INTERVAL '7 days') THEN 1
      ELSE 0
    END
  ), 0) AS cards_due_week,
  -- Calcular retenção média
  CASE 
    WHEN COUNT(cs.id) > 0 THEN 
      ROUND(AVG(COALESCE(cs.retention_rate, 0))::numeric, 2)
    ELSE 0
  END AS average_retention,
  -- Stats de hoje (serão calculados por trigger)
  0 AS total_reviews_today,
  0 AS total_time_today_ms,
  0 AS current_streak_days,
  0 AS longest_streak_days
FROM decks d
LEFT JOIN cards c ON c.deck_id = d.id AND c.user_id = d.user_id
LEFT JOIN card_stats cs ON cs.card_id = c.id AND cs.user_id = d.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM deck_stats ds 
  WHERE ds.deck_id = d.id AND ds.user_id = d.user_id
)
GROUP BY d.id, d.user_id;

-- 2. Atualizar deck_stats existentes com contagens corretas
UPDATE deck_stats ds
SET
  new_cards = subq.new_cards,
  learning_cards = subq.learning_cards,
  young_cards = subq.young_cards,
  mature_cards = subq.mature_cards,
  suspended_cards = subq.suspended_cards,
  cards_due_today = subq.cards_due_today,
  cards_due_week = subq.cards_due_week,
  average_retention = subq.average_retention,
  updated_at = NOW()
FROM (
  SELECT 
    d.id AS deck_id,
    d.user_id,
    COALESCE(SUM(CASE WHEN cs.card_status = 'new' THEN 1 ELSE 0 END), 0) AS new_cards,
    COALESCE(SUM(CASE WHEN cs.card_status = 'learning' THEN 1 ELSE 0 END), 0) AS learning_cards,
    COALESCE(SUM(CASE WHEN cs.card_status = 'young' THEN 1 ELSE 0 END), 0) AS young_cards,
    COALESCE(SUM(CASE WHEN cs.card_status = 'mature' THEN 1 ELSE 0 END), 0) AS mature_cards,
    COALESCE(SUM(CASE WHEN c.is_suspended = true THEN 1 ELSE 0 END), 0) AS suspended_cards,
    COALESCE(SUM(
      CASE 
        WHEN cs.card_status = 'new' THEN 1
        WHEN cs.next_review_at IS NULL THEN 1
        WHEN cs.next_review_at::date <= CURRENT_DATE THEN 1
        ELSE 0
      END
    ), 0) AS cards_due_today,
    COALESCE(SUM(
      CASE 
        WHEN cs.next_review_at IS NULL THEN 1
        WHEN cs.next_review_at::date <= (CURRENT_DATE + INTERVAL '7 days') THEN 1
        ELSE 0
      END
    ), 0) AS cards_due_week,
    CASE 
      WHEN COUNT(cs.id) > 0 THEN 
        ROUND(AVG(COALESCE(cs.retention_rate, 0))::numeric, 2)
      ELSE 0
    END AS average_retention
  FROM decks d
  LEFT JOIN cards c ON c.deck_id = d.id AND c.user_id = d.user_id
  LEFT JOIN card_stats cs ON cs.card_id = c.id AND cs.user_id = d.user_id
  GROUP BY d.id, d.user_id
) subq
WHERE ds.deck_id = subq.deck_id 
  AND ds.user_id = subq.user_id;

-- 3. Criar/Recriar função para atualizar deck_stats quando card_stats muda
CREATE OR REPLACE FUNCTION update_deck_stats_on_card_change()
RETURNS TRIGGER AS $$
DECLARE
  v_deck_id UUID;
  v_user_id UUID;
BEGIN
  -- Determinar deck_id e user_id baseado na operação
  IF TG_OP = 'DELETE' THEN
    SELECT c.deck_id, c.user_id INTO v_deck_id, v_user_id
    FROM cards c WHERE c.id = OLD.card_id;
  ELSE
    SELECT c.deck_id, c.user_id INTO v_deck_id, v_user_id
    FROM cards c WHERE c.id = NEW.card_id;
  END IF;

  -- Atualizar deck_stats
  UPDATE deck_stats ds
  SET
    new_cards = (
      SELECT COUNT(*) FROM card_stats cs
      JOIN cards c ON c.id = cs.card_id
      WHERE c.deck_id = v_deck_id 
        AND cs.user_id = v_user_id
        AND cs.card_status = 'new'
    ),
    learning_cards = (
      SELECT COUNT(*) FROM card_stats cs
      JOIN cards c ON c.id = cs.card_id
      WHERE c.deck_id = v_deck_id 
        AND cs.user_id = v_user_id
        AND cs.card_status = 'learning'
    ),
    young_cards = (
      SELECT COUNT(*) FROM card_stats cs
      JOIN cards c ON c.id = cs.card_id
      WHERE c.deck_id = v_deck_id 
        AND cs.user_id = v_user_id
        AND cs.card_status = 'young'
    ),
    mature_cards = (
      SELECT COUNT(*) FROM card_stats cs
      JOIN cards c ON c.id = cs.card_id
      WHERE c.deck_id = v_deck_id 
        AND cs.user_id = v_user_id
        AND cs.card_status = 'mature'
    ),
    suspended_cards = (
      SELECT COUNT(*) FROM cards c
      WHERE c.deck_id = v_deck_id 
        AND c.user_id = v_user_id
        AND c.is_suspended = true
    ),
    cards_due_today = (
      SELECT COUNT(*) FROM card_stats cs
      JOIN cards c ON c.id = cs.card_id
      WHERE c.deck_id = v_deck_id 
        AND cs.user_id = v_user_id
        AND (
          cs.card_status = 'new' OR
          cs.next_review_at IS NULL OR
          cs.next_review_at::date <= CURRENT_DATE
        )
    ),
    cards_due_week = (
      SELECT COUNT(*) FROM card_stats cs
      JOIN cards c ON c.id = cs.card_id
      WHERE c.deck_id = v_deck_id 
        AND cs.user_id = v_user_id
        AND (
          cs.next_review_at IS NULL OR
          cs.next_review_at::date <= (CURRENT_DATE + INTERVAL '7 days')
        )
    ),
    average_retention = (
      SELECT ROUND(AVG(COALESCE(cs.retention_rate, 0))::numeric, 2)
      FROM card_stats cs
      JOIN cards c ON c.id = cs.card_id
      WHERE c.deck_id = v_deck_id 
        AND cs.user_id = v_user_id
    ),
    updated_at = NOW()
  WHERE ds.deck_id = v_deck_id 
    AND ds.user_id = v_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar triggers para manter deck_stats atualizado
DROP TRIGGER IF EXISTS update_deck_stats_on_card_stats_change ON card_stats;
CREATE TRIGGER update_deck_stats_on_card_stats_change
  AFTER INSERT OR UPDATE OR DELETE ON card_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_deck_stats_on_card_change();

-- 5. Trigger para quando um card é criado (cria card_stats automaticamente)
CREATE OR REPLACE FUNCTION create_card_stats_for_new_card()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se já existe card_stats antes de inserir
  IF NOT EXISTS (
    SELECT 1 FROM card_stats 
    WHERE card_id = NEW.id AND user_id = NEW.user_id
  ) THEN
    INSERT INTO card_stats (
      card_id,
      user_id,
      card_status,
      easiness_factor,
      interval_days,
      repetitions,
      next_review_at
    )
    VALUES (
      NEW.id,
      NEW.user_id,
      'new',
      2.5,
      0,
      0,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_card_stats_on_card_insert ON cards;
CREATE TRIGGER create_card_stats_on_card_insert
  AFTER INSERT ON cards
  FOR EACH ROW
  EXECUTE FUNCTION create_card_stats_for_new_card();

-- 6. Verificar resultados
DO $$
DECLARE
  deck_count INTEGER;
  stats_count INTEGER;
  cards_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO deck_count FROM decks;
  SELECT COUNT(*) INTO stats_count FROM deck_stats;
  SELECT COUNT(*) INTO cards_count FROM cards;
  
  RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
  RAISE NOTICE 'Total de decks: %', deck_count;
  RAISE NOTICE 'Total de deck_stats: %', stats_count;
  RAISE NOTICE 'Total de cards: %', cards_count;
  
  IF deck_count > stats_count THEN
    RAISE WARNING 'ATENÇÃO: Existem % decks sem deck_stats!', (deck_count - stats_count);
  ELSE
    RAISE NOTICE '✅ Todos os decks têm deck_stats';
  END IF;
END $$;

-- 7. Mostrar resumo de cada deck
SELECT 
  d.name AS deck_name,
  COUNT(c.id) AS total_cards,
  COALESCE(ds.new_cards, 0) AS new_cards,
  COALESCE(ds.learning_cards, 0) AS learning_cards,
  COALESCE(ds.cards_due_today, 0) AS cards_due_today,
  COALESCE(ds.average_retention, 0) AS avg_retention
FROM decks d
LEFT JOIN cards c ON c.deck_id = d.id
LEFT JOIN deck_stats ds ON ds.deck_id = d.id AND ds.user_id = d.user_id
GROUP BY d.id, d.name, ds.new_cards, ds.learning_cards, ds.cards_due_today, ds.average_retention
ORDER BY d.name;
