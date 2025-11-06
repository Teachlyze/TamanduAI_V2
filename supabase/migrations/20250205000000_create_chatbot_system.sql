-- ============================================================================
-- CHATBOT SYSTEM COMPLETE
-- Tabelas para sistema de chatbot educacional com analytics
-- ============================================================================

-- Tabela de conversas (sessões de chat)
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  message_count INT NOT NULL DEFAULT 0,
  satisfaction_rating INT CHECK (satisfaction_rating BETWEEN 1 AND 5),
  resolved BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS chatbot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  sources_used JSONB DEFAULT '[]'::jsonb,
  context_retrieved INT DEFAULT 0,
  was_helpful BOOLEAN,
  is_out_of_scope BOOLEAN DEFAULT false,
  topics_detected JSONB DEFAULT '[]'::jsonb,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  response_time_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela de analytics diários agregados
CREATE TABLE IF NOT EXISTS chatbot_daily_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_conversations INT NOT NULL DEFAULT 0,
  total_messages INT NOT NULL DEFAULT 0,
  unique_students INT NOT NULL DEFAULT 0,
  avg_satisfaction DECIMAL(3,2),
  avg_response_time_ms DECIMAL(10,2),
  helpful_count INT DEFAULT 0,
  unhelpful_count INT DEFAULT 0,
  out_of_scope_count INT DEFAULT 0,
  topics_summary JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_class_activity ON chatbot_conversations(class_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started ON chatbot_conversations(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_class_activity ON chatbot_messages(class_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON chatbot_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON chatbot_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_class_date ON chatbot_daily_analytics(class_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_activity_date ON chatbot_daily_analytics(activity_id, date DESC) WHERE activity_id IS NOT NULL;

-- Índices únicos para evitar duplicatas (tratando NULL corretamente)
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_unique_with_activity 
  ON chatbot_daily_analytics(class_id, activity_id, date) 
  WHERE activity_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_unique_without_activity 
  ON chatbot_daily_analytics(class_id, date) 
  WHERE activity_id IS NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_chatbot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_updated_at();

CREATE TRIGGER update_analytics_updated_at
  BEFORE UPDATE ON chatbot_daily_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_updated_at();

-- ============================================================================
-- FUNÇÕES DE AGREGAÇÃO
-- ============================================================================

-- Incrementar analytics diários
CREATE OR REPLACE FUNCTION increment_chatbot_analytics(
  p_class_id UUID,
  p_activity_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID AS $$
BEGIN
  -- Se activity_id é NULL
  IF p_activity_id IS NULL THEN
    INSERT INTO chatbot_daily_analytics (
      class_id, 
      activity_id, 
      date, 
      total_messages
    )
    VALUES (
      p_class_id, 
      NULL, 
      p_date, 
      1
    )
    ON CONFLICT (class_id, date) WHERE activity_id IS NULL
    DO UPDATE SET 
      total_messages = chatbot_daily_analytics.total_messages + 1,
      updated_at = NOW();
  ELSE
    -- Se activity_id não é NULL
    INSERT INTO chatbot_daily_analytics (
      class_id, 
      activity_id, 
      date, 
      total_messages
    )
    VALUES (
      p_class_id, 
      p_activity_id, 
      p_date, 
      1
    )
    ON CONFLICT (class_id, activity_id, date) WHERE activity_id IS NOT NULL
    DO UPDATE SET 
      total_messages = chatbot_daily_analytics.total_messages + 1,
      updated_at = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Atualizar contagem de alunos únicos
CREATE OR REPLACE FUNCTION update_unique_students(
  p_class_id UUID,
  p_activity_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID AS $$
BEGIN
  IF p_activity_id IS NULL THEN
    UPDATE chatbot_daily_analytics
    SET 
      unique_students = (
        SELECT COUNT(DISTINCT user_id)
        FROM chatbot_messages
        WHERE class_id = p_class_id
          AND activity_id IS NULL
          AND DATE(created_at) = p_date
      ),
      updated_at = NOW()
    WHERE class_id = p_class_id
      AND activity_id IS NULL
      AND date = p_date;
  ELSE
    UPDATE chatbot_daily_analytics
    SET 
      unique_students = (
        SELECT COUNT(DISTINCT user_id)
        FROM chatbot_messages
        WHERE class_id = p_class_id
          AND activity_id = p_activity_id
          AND DATE(created_at) = p_date
      ),
      updated_at = NOW()
    WHERE class_id = p_class_id
      AND activity_id = p_activity_id
      AND date = p_date;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Atualizar métricas após feedback
CREATE OR REPLACE FUNCTION update_feedback_metrics(
  p_message_id UUID,
  p_was_helpful BOOLEAN
) RETURNS VOID AS $$
DECLARE
  v_class_id UUID;
  v_activity_id UUID;
  v_date DATE;
BEGIN
  -- Buscar informações da mensagem
  SELECT class_id, activity_id, DATE(created_at)
  INTO v_class_id, v_activity_id, v_date
  FROM chatbot_messages
  WHERE id = p_message_id;

  -- Atualizar contadores
  IF p_was_helpful THEN
    IF v_activity_id IS NULL THEN
      UPDATE chatbot_daily_analytics
      SET 
        helpful_count = helpful_count + 1,
        updated_at = NOW()
      WHERE class_id = v_class_id
        AND activity_id IS NULL
        AND date = v_date;
    ELSE
      UPDATE chatbot_daily_analytics
      SET 
        helpful_count = helpful_count + 1,
        updated_at = NOW()
      WHERE class_id = v_class_id
        AND activity_id = v_activity_id
        AND date = v_date;
    END IF;
  ELSE
    IF v_activity_id IS NULL THEN
      UPDATE chatbot_daily_analytics
      SET 
        unhelpful_count = unhelpful_count + 1,
        updated_at = NOW()
      WHERE class_id = v_class_id
        AND activity_id IS NULL
        AND date = v_date;
    ELSE
      UPDATE chatbot_daily_analytics
      SET 
        unhelpful_count = unhelpful_count + 1,
        updated_at = NOW()
      WHERE class_id = v_class_id
        AND activity_id = v_activity_id
        AND date = v_date;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_daily_analytics ENABLE ROW LEVEL SECURITY;

-- Policies para conversations
CREATE POLICY "Users can view their own conversations"
  ON chatbot_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own conversations"
  ON chatbot_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can view class conversations"
  ON chatbot_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = chatbot_conversations.class_id
      AND classes.created_by = auth.uid()
    )
  );

-- Policies para messages
CREATE POLICY "Users can view their own messages"
  ON chatbot_messages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own messages"
  ON chatbot_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own message feedback"
  ON chatbot_messages FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can view class messages"
  ON chatbot_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = chatbot_messages.class_id
      AND classes.created_by = auth.uid()
    )
  );

-- Policies para analytics
CREATE POLICY "Teachers can view class analytics"
  ON chatbot_daily_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = chatbot_daily_analytics.class_id
      AND classes.created_by = auth.uid()
    )
  );

-- Service role pode tudo (para edge functions)
CREATE POLICY "Service role has full access to conversations"
  ON chatbot_conversations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to messages"
  ON chatbot_messages FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to analytics"
  ON chatbot_daily_analytics FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE chatbot_conversations IS 'Sessões de conversa do chatbot por atividade';
COMMENT ON TABLE chatbot_messages IS 'Mensagens individuais do chatbot com métricas';
COMMENT ON TABLE chatbot_daily_analytics IS 'Métricas agregadas diárias do chatbot';

COMMENT ON FUNCTION increment_chatbot_analytics IS 'Incrementa contadores de mensagens nos analytics diários';
COMMENT ON FUNCTION update_unique_students IS 'Atualiza contagem de alunos únicos que usaram o chatbot';
COMMENT ON FUNCTION update_feedback_metrics IS 'Atualiza métricas de feedback (helpful/unhelpful)';
