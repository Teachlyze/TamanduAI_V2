-- Migration: Add optional fields to classes table
-- Date: 2025-01-19
-- Purpose: Add optional fields collected in form but currently not persisted
-- Status: OPCIONAL - Aplicar apenas se desejar persistir esses dados

-- ⚠️ ATENÇÃO: Esta migration é OPCIONAL
-- Os campos abaixo são coletados no form mas atualmente NÃO são salvos no BD
-- Execute esta migration APENAS se quiser começar a armazenar esses dados

-- 1. Course (ex: STEM, Linguagens, etc.)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS course TEXT;

COMMENT ON COLUMN public.classes.course IS 
  'Curso ou área de conhecimento da turma (ex: STEM, Linguagens)';

-- 2. Period (ex: morning, afternoon, night)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS period TEXT;

COMMENT ON COLUMN public.classes.period IS 
  'Período da turma (ex: morning, afternoon, night)';

-- 3. Grade Level (ex: 1ano, 2medio, superior)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS grade_level TEXT;

COMMENT ON COLUMN public.classes.grade_level IS 
  'Nível/série da turma (ex: 1ano, 2medio, superior, livre)';

-- 4. Room Number (ex: Sala 12, Lab A)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS room_number TEXT;

COMMENT ON COLUMN public.classes.room_number IS 
  'Número ou nome da sala física';

-- 5. Is Online (boolean flag)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.classes.is_online IS 
  'Indica se a turma é online ou presencial';

-- 6. Meeting Link (ex: https://meet.google.com/...)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS meeting_link TEXT;

COMMENT ON COLUMN public.classes.meeting_link IS 
  'Link para reuniões online (Google Meet, Zoom, etc.)';

-- 7. Chatbot Enabled (boolean flag)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS chatbot_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.classes.chatbot_enabled IS 
  'Indica se o chatbot está habilitado para esta turma';

-- Create indexes for common filters
CREATE INDEX IF NOT EXISTS idx_classes_grade_level ON public.classes(grade_level);
CREATE INDEX IF NOT EXISTS idx_classes_period ON public.classes(period);
CREATE INDEX IF NOT EXISTS idx_classes_is_online ON public.classes(is_online);
CREATE INDEX IF NOT EXISTS idx_classes_chatbot_enabled ON public.classes(chatbot_enabled);

-- ⚠️ APÓS APLICAR ESTA MIGRATION:
-- 1. Descomente os campos em CreateClassForm.jsx (linha ~192-195)
-- 2. Eles automaticamente começarão a ser salvos no BD
