-- Create chatbot_config_versions table for rollback functionality
CREATE TABLE IF NOT EXISTS public.chatbot_config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  config_snapshot JSONB NOT NULL,
  version_number INTEGER NOT NULL,
  change_description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure version numbers are unique per class
  CONSTRAINT unique_class_version UNIQUE (class_id, version_number)
);

-- Enable RLS
ALTER TABLE public.chatbot_config_versions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_chatbot_versions_class ON public.chatbot_config_versions(class_id);
CREATE INDEX idx_chatbot_versions_created ON public.chatbot_config_versions(created_at DESC);

-- RLS Policies
-- Teachers can view versions of their classes
CREATE POLICY "Teachers can view their class chatbot versions"
  ON public.chatbot_config_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = chatbot_config_versions.class_id
      AND classes.created_by = auth.uid()
    )
  );

-- Teachers can create versions for their classes
CREATE POLICY "Teachers can create chatbot versions"
  ON public.chatbot_config_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = chatbot_config_versions.class_id
      AND classes.created_by = auth.uid()
    )
  );

-- Teachers can delete versions of their classes
CREATE POLICY "Teachers can delete their class chatbot versions"
  ON public.chatbot_config_versions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = chatbot_config_versions.class_id
      AND classes.created_by = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE public.chatbot_config_versions IS 'Stores version history of chatbot configurations for rollback functionality';
