-- Migration: Sistema de Painel de Notas
-- Data: 2025-01-20
-- Descrição: Views e funções para painel de notas interativo

-- =====================================================
-- 1. VIEW DE NOTAS POR ALUNO
-- =====================================================
CREATE OR REPLACE VIEW public.student_grades AS
SELECT 
  cm.class_id,
  cm.user_id AS student_id,
  p.full_name AS student_name,
  p.email AS student_email,
  p.avatar_url AS student_avatar,
  COUNT(DISTINCT s.id) AS total_submissions,
  COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END) AS graded_submissions,
  ROUND(AVG(CASE WHEN s.status = 'graded' THEN s.grade END), 2) AS average_grade,
  ROUND(
    SUM(CASE WHEN s.status = 'graded' THEN s.grade ELSE 0 END) / 
    NULLIF(SUM(CASE WHEN s.status = 'graded' THEN a.max_score ELSE 0 END), 0) * 100, 
    2
  ) AS overall_percentage,
  COUNT(CASE WHEN s.status = 'submitted' THEN 1 END) AS pending_count,
  MAX(s.submitted_at) AS last_submission_date
FROM public.class_members cm
JOIN public.profiles p ON cm.user_id = p.id
LEFT JOIN public.activities a ON EXISTS (
  SELECT 1 FROM public.activity_class_assignments aca 
  WHERE aca.activity_id = a.id AND aca.class_id = cm.class_id
)
LEFT JOIN public.submissions s ON s.activity_id = a.id AND s.student_id = cm.user_id
WHERE cm.role = 'student'
GROUP BY cm.class_id, cm.user_id, p.full_name, p.email, p.avatar_url;

-- =====================================================
-- 2. VIEW DE NOTAS POR ATIVIDADE
-- =====================================================
CREATE OR REPLACE VIEW public.activity_grades AS
SELECT 
  a.id AS activity_id,
  a.title AS activity_title,
  a.type AS activity_type,
  a.max_score AS total_points,
  a.due_date,
  a.created_by AS teacher_id,
  aca.class_id,
  COUNT(DISTINCT s.id) AS total_submissions,
  COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END) AS graded_count,
  ROUND(AVG(CASE WHEN s.status = 'graded' THEN s.grade END), 2) AS average_grade,
  MAX(CASE WHEN s.status = 'graded' THEN s.grade END) AS highest_grade,
  MIN(CASE WHEN s.status = 'graded' THEN s.grade END) AS lowest_grade,
  ROUND(
    COUNT(DISTINCT s.id)::DECIMAL / 
    NULLIF(COUNT(DISTINCT cm.user_id), 0) * 100, 
    2
  ) AS submission_rate
FROM public.activities a
JOIN public.activity_class_assignments aca ON aca.activity_id = a.id
LEFT JOIN public.submissions s ON s.activity_id = a.id
LEFT JOIN public.class_members cm ON cm.class_id = aca.class_id AND cm.role = 'student'
GROUP BY a.id, a.title, a.type, a.max_score, a.due_date, a.created_by, aca.class_id;

-- =====================================================
-- 3. VIEW DETALHADA DE GRADE (MATRIZ)
-- =====================================================
CREATE OR REPLACE VIEW public.class_grade_matrix AS
SELECT 
  cm.class_id,
  cm.user_id AS student_id,
  p.full_name AS student_name,
  a.id AS activity_id,
  a.title AS activity_title,
  a.max_score AS total_points,
  a.due_date,
  s.id AS submission_id,
  s.grade,
  s.status,
  s.submitted_at,
  s.graded_at,
  s.feedback,
  CASE 
    WHEN s.submitted_at > a.due_date THEN TRUE
    ELSE FALSE
  END AS is_late,
  CASE
    WHEN s.status = 'graded' THEN ROUND((s.grade / a.max_score) * 100, 2)
    ELSE NULL
  END AS percentage
FROM public.class_members cm
JOIN public.profiles p ON cm.user_id = p.id
CROSS JOIN public.activities a
LEFT JOIN public.submissions s ON s.activity_id = a.id AND s.student_id = cm.user_id
WHERE cm.role = 'student'
  AND EXISTS (
    SELECT 1 FROM public.activity_class_assignments aca 
    WHERE aca.activity_id = a.id AND aca.class_id = cm.class_id
  );

-- =====================================================
-- 4. FUNÇÃO PARA ESTATÍSTICAS DA TURMA
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_class_grade_stats(p_class_id UUID)
RETURNS TABLE (
  total_students BIGINT,
  total_activities BIGINT,
  total_submissions BIGINT,
  graded_submissions BIGINT,
  pending_submissions BIGINT,
  average_class_grade NUMERIC,
  highest_student_avg NUMERIC,
  lowest_student_avg NUMERIC,
  submission_rate NUMERIC,
  grading_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT cm.user_id) AS total_students,
    COUNT(DISTINCT a.id) AS total_activities,
    COUNT(DISTINCT s.id) AS total_submissions,
    COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END) AS graded_submissions,
    COUNT(DISTINCT CASE WHEN s.status IN ('submitted', 'pending') THEN s.id END) AS pending_submissions,
    ROUND(AVG(CASE WHEN s.status = 'graded' THEN s.grade END), 2) AS average_class_grade,
    (SELECT MAX(avg_grade) FROM (
      SELECT AVG(grade) AS avg_grade 
      FROM public.submissions s2
      JOIN public.activities a2 ON s2.activity_id = a2.id
      JOIN public.activity_class_assignments aca2 ON aca2.activity_id = a2.id
      WHERE aca2.class_id = p_class_id AND s2.status = 'graded'
      GROUP BY s2.student_id
    ) sub) AS highest_student_avg,
    (SELECT MIN(avg_grade) FROM (
      SELECT AVG(grade) AS avg_grade 
      FROM public.submissions s2
      JOIN public.activities a2 ON s2.activity_id = a2.id
      JOIN public.activity_class_assignments aca2 ON aca2.activity_id = a2.id
      WHERE aca2.class_id = p_class_id AND s2.status = 'graded'
      GROUP BY s2.student_id
    ) sub) AS lowest_student_avg,
    ROUND(
      COUNT(DISTINCT s.id)::DECIMAL / 
      NULLIF(COUNT(DISTINCT cm.user_id) * COUNT(DISTINCT a.id), 0) * 100, 
      2
    ) AS submission_rate,
    ROUND(
      COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END)::DECIMAL / 
      NULLIF(COUNT(DISTINCT s.id), 0) * 100, 
      2
    ) AS grading_rate
  FROM public.class_members cm
  LEFT JOIN public.activities a ON EXISTS (
    SELECT 1 FROM public.activity_class_assignments aca 
    WHERE aca.activity_id = a.id AND aca.class_id = p_class_id
  )
  LEFT JOIN public.submissions s ON s.activity_id = a.id AND s.student_id = cm.user_id
  WHERE cm.class_id = p_class_id AND cm.role = 'student';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNÇÃO PARA EXPORTAÇÃO DE NOTAS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_class_grades_export(p_class_id UUID)
RETURNS TABLE (
  student_name TEXT,
  student_email TEXT,
  activity_title TEXT,
  activity_type TEXT,
  grade NUMERIC,
  total_points INTEGER,
  percentage NUMERIC,
  status TEXT,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  is_late BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.full_name AS student_name,
    p.email AS student_email,
    a.title AS activity_title,
    a.type AS activity_type,
    s.grade,
    a.max_score AS total_points,
    CASE 
      WHEN s.status = 'graded' THEN ROUND((s.grade / a.max_score) * 100, 2)
      ELSE NULL
    END AS percentage,
    s.status,
    s.submitted_at,
    s.graded_at,
    CASE 
      WHEN s.submitted_at > a.due_date THEN TRUE
      ELSE FALSE
    END AS is_late
  FROM public.class_members cm
  JOIN public.profiles p ON cm.user_id = p.id
  LEFT JOIN public.activities a ON EXISTS (
    SELECT 1 FROM public.activity_class_assignments aca 
    WHERE aca.activity_id = a.id AND aca.class_id = p_class_id
  )
  LEFT JOIN public.submissions s ON s.activity_id = a.id AND s.student_id = cm.user_id
  WHERE cm.class_id = p_class_id AND cm.role = 'student'
  ORDER BY p.full_name, a.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_submissions_class_lookup 
ON public.submissions(activity_id, student_id, status) 
INCLUDE (grade, submitted_at, graded_at);

CREATE INDEX IF NOT EXISTS idx_activity_class_assignments_lookup 
ON public.activity_class_assignments(class_id, activity_id);

-- =====================================================
-- 7. RLS POLICIES PARA VIEWS
-- =====================================================

-- Policies são herdadas das tabelas base
-- Views não precisam de RLS próprias

-- =====================================================
-- 8. COMENTÁRIOS
-- =====================================================
COMMENT ON VIEW public.student_grades IS 'Resumo de notas por aluno em cada turma';
COMMENT ON VIEW public.activity_grades IS 'Estatísticas de notas por atividade';
COMMENT ON VIEW public.class_grade_matrix IS 'Matriz completa aluno x atividade para tabela de notas';
COMMENT ON FUNCTION public.get_class_grade_stats IS 'Retorna estatísticas gerais da turma';
COMMENT ON FUNCTION public.get_class_grades_export IS 'Prepara dados para exportação Excel/PDF';
