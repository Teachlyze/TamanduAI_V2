-- Migration: Add vacation and cancellation fields to classes
-- Date: 2025-01-19
-- Purpose: Allow professors to set vacation periods and cancel specific classes

-- Vacation period start date
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS vacation_start DATE;

COMMENT ON COLUMN public.classes.vacation_start IS 
  'Data de início das férias da turma';

-- Vacation period end date
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS vacation_end DATE;

COMMENT ON COLUMN public.classes.vacation_end IS 
  'Data de fim das férias da turma';

-- Array of cancelled dates (specific days when class won't happen)
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS cancelled_dates DATE[];

COMMENT ON COLUMN public.classes.cancelled_dates IS 
  'Array de datas específicas em que a aula foi cancelada';

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_classes_vacation_start 
ON public.classes(vacation_start) WHERE vacation_start IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_classes_vacation_end 
ON public.classes(vacation_end) WHERE vacation_end IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_classes_cancelled_dates 
ON public.classes USING GIN (cancelled_dates) WHERE cancelled_dates IS NOT NULL;

-- Function to check if a class is active on a specific date
CREATE OR REPLACE FUNCTION is_class_active_on_date(
  p_class_id UUID,
  p_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
  v_vacation_start DATE;
  v_vacation_end DATE;
  v_cancelled_dates DATE[];
  v_meeting_days TEXT[];
  v_day_of_week TEXT;
BEGIN
  -- Get class data
  SELECT vacation_start, vacation_end, cancelled_dates, meeting_days
  INTO v_vacation_start, v_vacation_end, v_cancelled_dates, v_meeting_days
  FROM classes
  WHERE id = p_class_id;

  -- Check if date is in vacation period
  IF v_vacation_start IS NOT NULL AND v_vacation_end IS NOT NULL THEN
    IF p_date >= v_vacation_start AND p_date <= v_vacation_end THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check if date is in cancelled dates
  IF v_cancelled_dates IS NOT NULL AND p_date = ANY(v_cancelled_dates) THEN
    RETURN FALSE;
  END IF;

  -- Check if day of week matches meeting_days
  v_day_of_week := LOWER(TO_CHAR(p_date, 'Day'));
  v_day_of_week := TRIM(v_day_of_week);
  
  -- Convert day names to english
  v_day_of_week := CASE v_day_of_week
    WHEN 'domingo' THEN 'sunday'
    WHEN 'segunda-feira' THEN 'monday'
    WHEN 'terça-feira' THEN 'tuesday'
    WHEN 'quarta-feira' THEN 'wednesday'
    WHEN 'quinta-feira' THEN 'thursday'
    WHEN 'sexta-feira' THEN 'friday'
    WHEN 'sábado' THEN 'saturday'
    ELSE TO_CHAR(p_date, 'Day')
  END;
  
  v_day_of_week := LOWER(TRIM(v_day_of_week));

  IF v_meeting_days IS NULL OR NOT (v_day_of_week = ANY(v_meeting_days)) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_class_active_on_date IS 
  'Verifica se uma aula está ativa em uma data específica (considera férias, cancelamentos e dias da semana)';

-- Example queries:
-- Check if class is active today:
-- SELECT is_class_active_on_date('class-uuid', CURRENT_DATE);

-- Get all active classes for a specific date:
-- SELECT * FROM classes 
-- WHERE is_online = true 
-- AND is_class_active_on_date(id, '2025-01-20');
