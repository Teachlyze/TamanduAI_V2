-- Add is_pinned column to announcements table (if it exists)
DO $$ BEGIN
  -- Check if announcements table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements') THEN
    -- Add is_pinned column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'announcements' AND column_name = 'is_pinned'
    ) THEN
      ALTER TABLE announcements ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
      
      -- Create index for better performance
      CREATE INDEX IF NOT EXISTS idx_announcements_is_pinned 
      ON announcements(class_id, is_pinned, created_at DESC);
    END IF;
  END IF;
END $$;
