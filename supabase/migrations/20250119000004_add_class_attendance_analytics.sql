-- Migration: Add attendance analytics for online classes
-- Date: 2025-01-19
-- Purpose: Track student attendance and participation in online classes

-- Table to log class attendance
CREATE TABLE IF NOT EXISTS public.class_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  attended_date DATE NOT NULL,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  was_on_time BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id, attended_date)
);

COMMENT ON TABLE public.class_attendance IS 
  'Registra a presença dos alunos nas aulas online';

-- Table to store class recordings
CREATE TABLE IF NOT EXISTS public.class_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  recorded_date DATE NOT NULL,
  recording_url TEXT,
  storage_path TEXT,
  duration_minutes INTEGER,
  file_size_mb NUMERIC(10,2),
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  google_drive_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.class_recordings IS 
  'Armazena gravações das aulas online';

-- Table for Google Calendar sync
CREATE TABLE IF NOT EXISTS public.calendar_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  google_calendar_id TEXT,
  google_event_id TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

COMMENT ON TABLE public.calendar_sync IS 
  'Sincronização com Google Calendar por usuário/turma';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_class_date 
ON public.class_attendance(class_id, attended_date);

CREATE INDEX IF NOT EXISTS idx_attendance_user_date 
ON public.class_attendance(user_id, attended_date);

CREATE INDEX IF NOT EXISTS idx_recordings_class_date 
ON public.class_recordings(class_id, recorded_date);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_class_user 
ON public.calendar_sync(class_id, user_id);

-- RLS Policies for class_attendance
ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;

-- Remove e recria em um único bloco
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "attendance_read_own" ON public.class_attendance;
  
  CREATE POLICY "attendance_read_own" ON public.class_attendance
  FOR SELECT USING (
    user_id = auth.uid() OR
    class_id IN (SELECT id FROM public.classes WHERE created_by = auth.uid())
  );
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "attendance_insert_own" ON public.class_attendance;
  
  CREATE POLICY "attendance_insert_own" ON public.class_attendance
  FOR INSERT WITH CHECK (user_id = auth.uid());
END $$;

-- RLS Policies for class_recordings
ALTER TABLE public.class_recordings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "recordings_read" ON public.class_recordings;
  
  CREATE POLICY "recordings_read" ON public.class_recordings
  FOR SELECT USING (
    class_id IN (
      SELECT class_id FROM public.class_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.classes WHERE created_by = auth.uid()
    )
  );
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "recordings_manage_teacher" ON public.class_recordings;
  
  CREATE POLICY "recordings_manage_teacher" ON public.class_recordings
  FOR ALL USING (
    class_id IN (SELECT id FROM public.classes WHERE created_by = auth.uid())
  );
END $$;

-- RLS Policies for calendar_sync
ALTER TABLE public.calendar_sync ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "calendar_sync_own" ON public.calendar_sync;
  
  CREATE POLICY "calendar_sync_own" ON public.calendar_sync
  FOR ALL USING (user_id = auth.uid());
END $$;

-- Function to calculate attendance rate
CREATE OR REPLACE FUNCTION get_class_attendance_rate(
  p_class_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS TABLE (
  total_students INTEGER,
  total_classes INTEGER,
  total_attendances INTEGER,
  attendance_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH student_count AS (
    SELECT COUNT(*) as students
    FROM class_members
    WHERE class_id = p_class_id
  ),
  class_dates AS (
    SELECT COUNT(DISTINCT attended_date) as classes
    FROM class_attendance
    WHERE class_id = p_class_id
      AND (p_start_date IS NULL OR attended_date >= p_start_date)
      AND (p_end_date IS NULL OR attended_date <= p_end_date)
  ),
  attendance_count AS (
    SELECT COUNT(*) as attendances
    FROM class_attendance
    WHERE class_id = p_class_id
      AND (p_start_date IS NULL OR attended_date >= p_start_date)
      AND (p_end_date IS NULL OR attended_date <= p_end_date)
  )
  SELECT 
    sc.students::INTEGER,
    cd.classes::INTEGER,
    ac.attendances::INTEGER,
    CASE 
      WHEN sc.students > 0 AND cd.classes > 0 
      THEN ROUND((ac.attendances::NUMERIC / (sc.students * cd.classes) * 100), 2)
      ELSE 0
    END as rate
  FROM student_count sc, class_dates cd, attendance_count ac;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_class_attendance_rate IS 
  'Calcula a taxa de presença de uma turma em um período';

-- Function to log attendance automatically
CREATE OR REPLACE FUNCTION log_class_attendance(
  p_class_id UUID,
  p_user_id UUID,
  p_joined_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS UUID AS $$
DECLARE
  v_attendance_id UUID;
  v_meeting_start TIME;
  v_tolerance_minutes INTEGER := 10;
BEGIN
  -- Get class start time
  SELECT meeting_start_time INTO v_meeting_start
  FROM classes
  WHERE id = p_class_id;

  -- Insert or update attendance
  INSERT INTO class_attendance (
    class_id,
    user_id,
    attended_date,
    joined_at,
    was_on_time
  ) VALUES (
    p_class_id,
    p_user_id,
    p_joined_at::DATE,
    p_joined_at,
    CASE 
      WHEN v_meeting_start IS NOT NULL THEN
        p_joined_at::TIME <= (v_meeting_start + (v_tolerance_minutes || ' minutes')::INTERVAL)
      ELSE true
    END
  )
  ON CONFLICT (class_id, user_id, attended_date)
  DO UPDATE SET
    joined_at = LEAST(class_attendance.joined_at, EXCLUDED.joined_at),
    was_on_time = class_attendance.was_on_time OR EXCLUDED.was_on_time
  RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_class_attendance IS 
  'Registra presença do aluno quando entra na aula (tolerância de 10 min)';

-- Example queries:
-- Get attendance rate:
-- SELECT * FROM get_class_attendance_rate('class-uuid');

-- Log attendance:
-- SELECT log_class_attendance('class-uuid', 'user-uuid');
