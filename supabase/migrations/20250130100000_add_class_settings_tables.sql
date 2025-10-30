-- =============================================
-- TABELAS PARA CONFIGURAÇÕES AVANÇADAS DE TURMAS
-- Criado em: 2025-01-30
-- =============================================

-- Tabela: class_settings (configurações avançadas de turmas)
CREATE TABLE IF NOT EXISTS class_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL UNIQUE REFERENCES classes(id) ON DELETE CASCADE,
  
  -- Código de Convite
  join_code VARCHAR(8) UNIQUE,
  join_code_max_uses INTEGER,
  join_code_expiration TIMESTAMP WITH TIME ZONE,
  join_code_uses_count INTEGER DEFAULT 0,
  is_join_code_active BOOLEAN DEFAULT true,
  
  -- Horários de Aula
  schedule JSONB DEFAULT '[]'::jsonb,
  
  -- Modalidade
  modality TEXT CHECK (modality IN ('online', 'presential')) DEFAULT 'online',
  meeting_link TEXT,
  address TEXT,
  
  -- Chatbot
  chatbot_enabled BOOLEAN DEFAULT false,
  
  -- Configurações Extras
  max_students INTEGER,
  banner_color TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_class_settings_class_id ON class_settings(class_id);
CREATE INDEX IF NOT EXISTS idx_class_settings_join_code ON class_settings(join_code);

-- Tabela: invite_code_history (histórico de códigos de convite)
CREATE TABLE IF NOT EXISTS invite_code_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  code VARCHAR(8) NOT NULL,
  uses_count INTEGER DEFAULT 0,
  deactivated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invite_code_history_class_id ON invite_code_history(class_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS
ALTER TABLE class_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_code_history ENABLE ROW LEVEL SECURITY;

-- Policies para class_settings
CREATE POLICY "Professores veem configurações de suas turmas"
  ON class_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_settings.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem criar configurações de suas turmas"
  ON class_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_settings.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem atualizar configurações de suas turmas"
  ON class_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_settings.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem deletar configurações de suas turmas"
  ON class_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_settings.class_id
      AND classes.created_by = auth.uid()
    )
  );

-- Policies para invite_code_history
CREATE POLICY "Professores veem histórico de suas turmas"
  ON invite_code_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = invite_code_history.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem inserir histórico de suas turmas"
  ON invite_code_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = invite_code_history.class_id
      AND classes.created_by = auth.uid()
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_class_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_settings_timestamp
  BEFORE UPDATE ON class_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_class_settings_updated_at();

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON TABLE class_settings IS 'Configurações avançadas de turmas (código, horários, modalidade, chatbot)';
COMMENT ON TABLE invite_code_history IS 'Histórico de códigos de convite desativados';

COMMENT ON COLUMN class_settings.join_code IS 'Código de convite único de 8 caracteres';
COMMENT ON COLUMN class_settings.join_code_max_uses IS 'Número máximo de usos do código (null = ilimitado)';
COMMENT ON COLUMN class_settings.join_code_expiration IS 'Data de expiração do código (null = nunca expira)';
COMMENT ON COLUMN class_settings.join_code_uses_count IS 'Contador de quantas vezes o código foi usado';
COMMENT ON COLUMN class_settings.schedule IS 'Array JSON com horários de aula: [{day, start_time, end_time}]';
COMMENT ON COLUMN class_settings.modality IS 'Modalidade das aulas: online ou presencial';
COMMENT ON COLUMN class_settings.chatbot_enabled IS 'Se o chatbot está ativo para esta turma';
