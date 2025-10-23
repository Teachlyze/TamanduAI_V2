-- Migration: Add is_school_managed column to classes table
-- Date: 2025-01-19
-- Purpose: Track if a class is managed by a school or is independent (professor-only)

-- Add is_school_managed column
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS is_school_managed BOOLEAN DEFAULT false NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.classes.is_school_managed IS 'Indicates if the class is managed by a school (true) or is an independent teacher class (false)';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_classes_is_school_managed ON public.classes(is_school_managed);

-- Create index for school_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes(school_id) WHERE school_id IS NOT NULL;

-- Add constraint: if is_school_managed is true, school_id must be set
ALTER TABLE public.classes 
ADD CONSTRAINT check_school_managed_requires_school_id 
CHECK (
  (is_school_managed = false) OR 
  (is_school_managed = true AND school_id IS NOT NULL)
);

-- Update existing classes that have school_id to be school_managed
UPDATE public.classes
SET is_school_managed = true
WHERE school_id IS NOT NULL AND is_school_managed = false;
