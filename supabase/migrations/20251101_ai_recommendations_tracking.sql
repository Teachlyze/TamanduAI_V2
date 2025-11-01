-- Tabela para rastrear uso de recomendações IA
CREATE TABLE IF NOT EXISTS public.ai_recommendations_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recommendations JSONB,
  performance_snapshot JSONB,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para buscar rapidamente por aluno e data
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_student_date 
ON public.ai_recommendations_usage(student_id, generated_at DESC);

-- RLS policies
ALTER TABLE public.ai_recommendations_usage ENABLE ROW LEVEL SECURITY;

-- Alunos podem ver apenas suas próprias recomendações
CREATE POLICY "Users can view own recommendations"
ON public.ai_recommendations_usage
FOR SELECT
USING (auth.uid() = student_id);

-- Permitir insert (edge function usa service role, mas policy para segurança)
CREATE POLICY "Users can insert own recommendations"
ON public.ai_recommendations_usage
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Comentários
COMMENT ON TABLE public.ai_recommendations_usage IS 'Rastreia uso de recomendações IA para controle de limites e analytics';
COMMENT ON COLUMN public.ai_recommendations_usage.student_id IS 'ID do aluno que gerou as recomendações';
COMMENT ON COLUMN public.ai_recommendations_usage.generated_at IS 'Timestamp de quando foi gerada';
COMMENT ON COLUMN public.ai_recommendations_usage.recommendations IS 'JSON com as recomendações geradas';
COMMENT ON COLUMN public.ai_recommendations_usage.performance_snapshot IS 'Snapshot dos dados de performance usados';
COMMENT ON COLUMN public.ai_recommendations_usage.tokens_used IS 'Número de tokens usados na API OpenAI';
