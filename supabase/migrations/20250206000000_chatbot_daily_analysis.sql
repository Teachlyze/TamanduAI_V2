-- Migration: Análise diária do chatbot processada por IA
-- Data: 06/02/2025

-- Tabela para armazenar análises processadas pela IA
CREATE TABLE IF NOT EXISTS chatbot_daily_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  
  -- Perguntas mais frequentes (agrupadas por IA)
  frequent_questions JSONB DEFAULT '[]'::jsonb,
  -- Formato: [{ "theme": "Como fazer X", "count": 15, "examples": [...], "activity": "..." }]
  
  -- Tópicos mais difíceis (identificados por IA)
  difficult_topics JSONB DEFAULT '[]'::jsonb,
  -- Formato: [{ "topic": "Listas Ligadas", "difficulty_score": 85, "reason": "...", "questions_count": 20 }]
  
  -- Metadados do processamento
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_messages_analyzed INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: uma análise por turma por dia
  CONSTRAINT unique_class_analysis_per_day UNIQUE(class_id, analysis_date)
);

-- Índices para performance
CREATE INDEX idx_chatbot_daily_analysis_class_date 
  ON chatbot_daily_analysis(class_id, analysis_date DESC);

CREATE INDEX idx_chatbot_daily_analysis_date 
  ON chatbot_daily_analysis(analysis_date DESC);

-- RLS Policies
ALTER TABLE chatbot_daily_analysis ENABLE ROW LEVEL SECURITY;

-- Professores podem ver análises de suas turmas
CREATE POLICY "Teachers can view class analysis"
  ON chatbot_daily_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = chatbot_daily_analysis.class_id
      AND classes.created_by = auth.uid()
    )
  );

-- Service role pode tudo (para edge function de processamento)
CREATE POLICY "Service role has full access to analysis"
  ON chatbot_daily_analysis FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Função para limpar análises antigas (manter últimos 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_chatbot_analysis()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM chatbot_daily_analysis
  WHERE analysis_date < CURRENT_DATE - INTERVAL '90 days';
END;
$$;

-- Comentários
COMMENT ON TABLE chatbot_daily_analysis IS 'Análises diárias do chatbot processadas por IA';
COMMENT ON COLUMN chatbot_daily_analysis.frequent_questions IS 'Perguntas frequentes agrupadas por tema pela IA';
COMMENT ON COLUMN chatbot_daily_analysis.difficult_topics IS 'Tópicos mais difíceis identificados pela IA';
