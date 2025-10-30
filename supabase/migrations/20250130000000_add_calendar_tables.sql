-- =============================================
-- TABELAS PARA SISTEMA DE CALENDÁRIO DO PROFESSOR
-- Criado em: 2025-01-30
-- =============================================

-- Tabela: event_classes (relacionamento evento-turma)
-- Permite que um evento esteja associado a múltiplas turmas
CREATE TABLE IF NOT EXISTS event_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, class_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_event_classes_event_id ON event_classes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_classes_class_id ON event_classes(class_id);

-- Tabela: event_participants (participantes de eventos)
-- Armazena alunos ou professores participantes de um evento
CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('student', 'teacher')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);

-- Adicionar campos ao calendar_events se não existirem
DO $$
BEGIN
  -- Adicionar campo modality
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'modality'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN modality TEXT CHECK (modality IN ('online', 'presential'));
  END IF;

  -- Adicionar campo meeting_link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'meeting_link'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN meeting_link TEXT;
  END IF;

  -- Adicionar campo color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'color'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN color TEXT DEFAULT '#3B82F6';
  END IF;

  -- Adicionar campo summary (resumo da aula após acontecer)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'summary'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN summary TEXT;
  END IF;

  -- Adicionar campo notes (observações)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'notes'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN notes TEXT;
  END IF;

  -- Adicionar campo is_registered (se já foi feito registro de presença)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'is_registered'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN is_registered BOOLEAN DEFAULT false;
  END IF;

  -- Adicionar campo is_cancelled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calendar_events' AND column_name = 'is_cancelled'
  ) THEN
    ALTER TABLE calendar_events 
    ADD COLUMN is_cancelled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Tabela: class_attendance (registro de presença)
-- Armazena presenças/ausências dos alunos em cada aula
CREATE TABLE IF NOT EXISTS class_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(class_id, student_id, event_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_class_attendance_class_id ON class_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_student_id ON class_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_event_id ON class_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_date ON class_attendance(date);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS
ALTER TABLE event_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;

-- Policies para event_classes
CREATE POLICY "Professores podem ver event_classes de seus eventos"
  ON event_classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_classes.event_id
      AND calendar_events.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem inserir event_classes em seus eventos"
  ON event_classes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_classes.event_id
      AND calendar_events.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem deletar event_classes de seus eventos"
  ON event_classes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_classes.event_id
      AND calendar_events.created_by = auth.uid()
    )
  );

-- Policies para event_participants
CREATE POLICY "Usuários podem ver seus próprios participantes"
  ON event_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_participants.event_id
      AND calendar_events.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem inserir participantes em seus eventos"
  ON event_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_participants.event_id
      AND calendar_events.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem deletar participantes de seus eventos"
  ON event_participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = event_participants.event_id
      AND calendar_events.created_by = auth.uid()
    )
  );

-- Policies para class_attendance
CREATE POLICY "Professores podem ver presença de suas turmas"
  ON class_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_attendance.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Alunos podem ver sua própria presença"
  ON class_attendance FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Professores podem inserir presença em suas turmas"
  ON class_attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_attendance.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem atualizar presença em suas turmas"
  ON class_attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_attendance.class_id
      AND classes.created_by = auth.uid()
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_attendance_updated_at
  BEFORE UPDATE ON class_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON TABLE event_classes IS 'Relacionamento entre eventos e turmas';
COMMENT ON TABLE event_participants IS 'Participantes (alunos/professores) de eventos';
COMMENT ON TABLE class_attendance IS 'Registro de presença dos alunos em aulas';

COMMENT ON COLUMN calendar_events.modality IS 'Modalidade do evento: online ou presencial';
COMMENT ON COLUMN calendar_events.meeting_link IS 'Link da reunião online (Google Meet, Zoom, etc)';
COMMENT ON COLUMN calendar_events.summary IS 'Resumo do conteúdo ministrado na aula (preenchido após o evento)';
COMMENT ON COLUMN calendar_events.is_registered IS 'Indica se já foi feito o registro de presença desta aula';
COMMENT ON COLUMN calendar_events.is_cancelled IS 'Indica se o evento foi cancelado';
