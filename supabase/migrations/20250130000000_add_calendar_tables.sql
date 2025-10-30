-- =============================================
-- TABELAS PARA SISTEMA DE CALENDÁRIO DO PROFESSOR
-- Criado em: 2025-01-30
-- CORRIGIDO: Baseado no schema real do banco
-- =============================================

-- NOTA: A tabela calendar_events JÁ EXISTE no banco com a seguinte estrutura:
-- id, title, description, start_time, end_time, event_type, class_id, activity_id,
-- created_by, attendees, location, is_recurring, recurrence_pattern, created_at,
-- updated_at, type, teacher_id, participants

-- Adicionar campos NOVOS ao calendar_events se não existirem
DO $$
BEGIN
  -- Adicionar campo modality
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'modality'
  ) THEN
    ALTER TABLE public.calendar_events 
    ADD COLUMN modality TEXT CHECK (modality IN ('online', 'presential'));
  END IF;

  -- Adicionar campo meeting_link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'meeting_link'
  ) THEN
    ALTER TABLE public.calendar_events 
    ADD COLUMN meeting_link TEXT;
  END IF;

  -- Adicionar campo color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'color'
  ) THEN
    ALTER TABLE public.calendar_events 
    ADD COLUMN color TEXT DEFAULT '#3B82F6';
  END IF;

  -- Adicionar campo summary (resumo da aula após acontecer)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'summary'
  ) THEN
    ALTER TABLE public.calendar_events 
    ADD COLUMN summary TEXT;
  END IF;

  -- Adicionar campo notes (observações)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.calendar_events 
    ADD COLUMN notes TEXT;
  END IF;

  -- Adicionar campo is_registered (se já foi feito registro de presença)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'is_registered'
  ) THEN
    ALTER TABLE public.calendar_events 
    ADD COLUMN is_registered BOOLEAN DEFAULT false;
  END IF;

  -- Adicionar campo is_cancelled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'is_cancelled'
  ) THEN
    ALTER TABLE public.calendar_events 
    ADD COLUMN is_cancelled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Tabela: class_attendance (registro de presença)
-- NOTA: A coluna calendar_event_id referencia calendar_events.id (não event_id)
-- Dropar se existir para garantir estrutura correta
DROP TABLE IF EXISTS public.class_attendance CASCADE;

CREATE TABLE public.class_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para class_attendance
CREATE INDEX IF NOT EXISTS idx_class_attendance_class_id ON public.class_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_user_id ON public.class_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_calendar_event_id ON public.class_attendance(calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_date ON public.class_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_class_attendance_status ON public.class_attendance(status);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS para class_attendance
ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;

-- Policies para class_attendance
CREATE POLICY "Professores podem ver presença de suas turmas"
  ON public.class_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_attendance.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Alunos podem ver sua própria presença"
  ON public.class_attendance FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Professores podem inserir presença em suas turmas"
  ON public.class_attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_attendance.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem atualizar presença em suas turmas"
  ON public.class_attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_attendance.class_id
      AND classes.created_by = auth.uid()
    )
  );

CREATE POLICY "Professores podem deletar presença de suas turmas"
  ON public.class_attendance FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = class_attendance.class_id
      AND classes.created_by = auth.uid()
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================

-- Usar função set_updated_at que já existe no banco
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE TRIGGER trg_class_attendance_updated
      BEFORE UPDATE ON public.class_attendance
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  ELSE
    -- Criar função se não existir
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    
    CREATE TRIGGER update_class_attendance_updated_at
      BEFORE UPDATE ON public.class_attendance
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================
-- COMENTÁRIOS
-- =============================================

COMMENT ON TABLE public.class_attendance IS 'Registro de presença dos alunos em aulas';
COMMENT ON COLUMN public.class_attendance.calendar_event_id IS 'Referência ao evento de calendário (aula) associado';
COMMENT ON COLUMN public.class_attendance.attendance_date IS 'Data da presença registrada';
COMMENT ON COLUMN public.class_attendance.status IS 'Status da presença: present, absent, late, excused';

COMMENT ON COLUMN public.calendar_events.modality IS 'Modalidade do evento: online ou presencial';
COMMENT ON COLUMN public.calendar_events.meeting_link IS 'Link da reunião online (Google Meet, Zoom, etc)';
COMMENT ON COLUMN public.calendar_events.summary IS 'Resumo do conteúdo ministrado na aula (preenchido após o evento)';
COMMENT ON COLUMN public.calendar_events.is_registered IS 'Indica se já foi feito o registro de presença desta aula';
COMMENT ON COLUMN public.calendar_events.is_cancelled IS 'Indica se o evento foi cancelado';
