-- Add publish_at column to school_announcements (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'school_announcements'
  ) THEN
    -- Add column
    ALTER TABLE public.school_announcements 
    ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;
    
    -- Add index
    CREATE INDEX IF NOT EXISTS idx_school_announcements_publish_at 
    ON public.school_announcements(publish_at) 
    WHERE publish_at IS NOT NULL;
    
    -- Add comment
    EXECUTE 'COMMENT ON COLUMN public.school_announcements.publish_at IS ''Data e hora programada para publicação do comunicado''';
  END IF;
END $$;
