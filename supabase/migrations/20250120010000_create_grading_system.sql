-- Migration: Sistema de Correções e Avaliação
-- Data: 2025-01-20
-- Descrição: Cria tabelas para rubricas, templates de feedback e histórico de notas

-- =====================================================
-- 1. TABELA DE RUBRICAS DE AVALIAÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.grading_rubrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Exemplo de criteria: [{"name": "Ortografia", "weight": 30, "levels": [{"score": 100, "description": "Sem erros"}]}]
  total_weight INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rubricas
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_activity ON public.grading_rubrics(activity_id);
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_teacher ON public.grading_rubrics(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_active ON public.grading_rubrics(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 2. TABELA DE TEMPLATES DE FEEDBACK
-- =====================================================
CREATE TABLE IF NOT EXISTS public.feedback_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- 'positive', 'improvement', 'general'
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para templates
CREATE INDEX IF NOT EXISTS idx_feedback_templates_teacher ON public.feedback_templates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_feedback_templates_category ON public.feedback_templates(category);

-- =====================================================
-- 3. TABELA DE HISTÓRICO DE NOTAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.grade_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  previous_grade NUMERIC(5,2),
  new_grade NUMERIC(5,2) NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para histórico
CREATE INDEX IF NOT EXISTS idx_grade_history_submission ON public.grade_history(submission_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_changed_by ON public.grade_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_grade_history_date ON public.grade_history(changed_at DESC);

-- =====================================================
-- 4. MELHORIAS NA TABELA SUBMISSIONS
-- =====================================================
-- Adicionar colunas se não existirem
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS feedback TEXT,
ADD COLUMN IF NOT EXISTS rubric_scores JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS late_penalty NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_graded BOOLEAN DEFAULT FALSE;

-- Índices para submissions
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_graded_at ON public.submissions(graded_at) WHERE graded_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_pending ON public.submissions(activity_id) WHERE status IN ('submitted', 'pending');

-- =====================================================
-- 5. TRIGGER PARA HISTÓRICO DE NOTAS
-- =====================================================
CREATE OR REPLACE FUNCTION log_grade_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Só registra se a nota mudou
  IF (OLD.grade IS DISTINCT FROM NEW.grade) THEN
    INSERT INTO public.grade_history (
      submission_id,
      previous_grade,
      new_grade,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.grade,
      NEW.grade,
      auth.uid(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_log_grade_change ON public.submissions;

-- Criar trigger
CREATE TRIGGER trigger_log_grade_change
AFTER UPDATE OF grade ON public.submissions
FOR EACH ROW
WHEN (OLD.grade IS DISTINCT FROM NEW.grade)
EXECUTE FUNCTION log_grade_change();

-- =====================================================
-- 6. FUNÇÃO PARA INCREMENTAR USO DE TEMPLATE
-- =====================================================
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.feedback_templates
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRIGGER PARA UPDATED_AT
-- =====================================================
CREATE TRIGGER trigger_grading_rubrics_updated_at
BEFORE UPDATE ON public.grading_rubrics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_feedback_templates_updated_at
BEFORE UPDATE ON public.feedback_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.grading_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;

-- Policies para grading_rubrics
CREATE POLICY "Professores veem próprias rubricas"
ON public.grading_rubrics FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY "Professores criam próprias rubricas"
ON public.grading_rubrics FOR INSERT
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Professores editam próprias rubricas"
ON public.grading_rubrics FOR UPDATE
USING (teacher_id = auth.uid());

CREATE POLICY "Professores deletam próprias rubricas"
ON public.grading_rubrics FOR DELETE
USING (teacher_id = auth.uid());

-- Policies para feedback_templates
CREATE POLICY "Professores veem próprios templates"
ON public.feedback_templates FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY "Professores criam próprios templates"
ON public.feedback_templates FOR INSERT
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Professores editam próprios templates"
ON public.feedback_templates FOR UPDATE
USING (teacher_id = auth.uid());

CREATE POLICY "Professores deletam próprios templates"
ON public.feedback_templates FOR DELETE
USING (teacher_id = auth.uid());

-- Policies para grade_history
CREATE POLICY "Professores veem histórico de suas correções"
ON public.grade_history FOR SELECT
USING (
  changed_by = auth.uid() OR
  submission_id IN (
    SELECT s.id FROM public.submissions s
    JOIN public.activities a ON s.activity_id = a.id
    WHERE a.created_by = auth.uid()
  )
);

CREATE POLICY "Sistema insere no histórico"
ON public.grade_history FOR INSERT
WITH CHECK (changed_by = auth.uid());

-- =====================================================
-- 9. VIEWS ÚTEIS
-- =====================================================

-- View para fila de correções
CREATE OR REPLACE VIEW public.grading_queue AS
SELECT 
  s.id AS submission_id,
  s.activity_id,
  s.student_id AS student_id,
  s.status,
  s.submitted_at,
  s.grade,
  s.graded_at,
  a.title AS activity_title,
  a.due_date,
  a.max_score AS total_points,
  a.created_by AS teacher_id,
  p.full_name AS student_name,
  CASE 
    WHEN s.submitted_at > a.due_date THEN TRUE
    ELSE FALSE
  END AS is_late,
  CASE
    WHEN a.due_date < NOW() THEN 'urgent'
    WHEN a.due_date < NOW() + INTERVAL '2 days' THEN 'soon'
    ELSE 'normal'
  END AS priority
FROM public.submissions s
JOIN public.activities a ON s.activity_id = a.id
JOIN public.profiles p ON s.student_id = p.id
WHERE s.status IN ('submitted', 'pending')
ORDER BY 
  CASE 
    WHEN a.due_date < NOW() THEN 1
    WHEN a.due_date < NOW() + INTERVAL '2 days' THEN 2
    ELSE 3
  END,
  s.submitted_at ASC;

-- =====================================================
-- 10. COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE public.grading_rubrics IS 'Rubricas de avaliação com critérios e pesos';
COMMENT ON TABLE public.feedback_templates IS 'Templates reutilizáveis de feedback';
COMMENT ON TABLE public.grade_history IS 'Histórico de alterações de notas';
COMMENT ON VIEW public.grading_queue IS 'Fila de correções priorizadas';
