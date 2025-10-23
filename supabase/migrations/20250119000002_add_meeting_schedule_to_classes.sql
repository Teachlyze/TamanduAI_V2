-- Migration: Add meeting schedule fields to classes table
-- Date: 2025-01-19
-- Purpose: Add fields for recurring online class schedules

-- Days of the week when class occurs (array format)
-- Example: ['monday', 'wednesday', 'friday']
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS meeting_days TEXT[];

COMMENT ON COLUMN public.classes.meeting_days IS 
  'Dias da semana em que a aula ocorre (ex: ["monday", "wednesday"])';

-- Start time for the class
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS meeting_start_time TIME;

COMMENT ON COLUMN public.classes.meeting_start_time IS 
  'Horário de início da aula (ex: 14:00)';

-- End time for the class
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS meeting_end_time TIME;

COMMENT ON COLUMN public.classes.meeting_end_time IS 
  'Horário de fim da aula (ex: 15:30)';

-- Create index for filtering classes by day
CREATE INDEX IF NOT EXISTS idx_classes_meeting_days 
ON public.classes USING GIN (meeting_days);

-- Example query to find classes on specific day:
-- SELECT * FROM classes WHERE 'monday' = ANY(meeting_days);
