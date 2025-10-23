-- Migration: Add grading_system column to classes table
-- Date: 2025-01-19
-- Purpose: Store the grading system for each class (0-10, 0-100, A-F, etc.)

-- Add grading_system column
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS grading_system TEXT DEFAULT '0-10' NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.classes.grading_system IS 'Grading system used for the class: 0-10, 0-100, A-F, pass-fail, excellent-poor';

-- Create index for faster filtering by grading system
CREATE INDEX IF NOT EXISTS idx_classes_grading_system ON public.classes(grading_system);

-- Add check constraint to ensure valid grading systems
ALTER TABLE public.classes 
ADD CONSTRAINT check_grading_system 
CHECK (grading_system IN ('0-10', '0-100', 'A-F', 'pass-fail', 'excellent-poor'));
