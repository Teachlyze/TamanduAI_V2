-- Add is_pinned column to class_materials table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_materials' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE class_materials ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
    
    -- Create index for better performance when ordering by pinned status
    CREATE INDEX IF NOT EXISTS idx_class_materials_is_pinned 
    ON class_materials(class_id, is_pinned, created_at DESC);
  END IF;
END $$;
