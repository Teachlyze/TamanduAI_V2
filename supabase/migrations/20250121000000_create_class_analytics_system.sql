-- =====================================================
-- SISTEMA DE ANALYTICS DA TURMA
-- Criado em: 21 de Janeiro de 2025
-- Descrição: Views e functions para analytics completo
-- =====================================================

-- =====================================================
-- 1. VIEW DE PERFORMANCE GERAL DA TURMA
-- =====================================================
CREATE OR REPLACE VIEW public.class_performance_overview AS
SELECT 
  c.id AS class_id,
  c.name AS class_name,
  c.created_by AS teacher_id,
  
  -- Contadores de membros
  COUNT(DISTINCT CASE WHEN cm.role = 'student' THEN cm.user_id END) AS total_students,
  COUNT(DISTINCT CASE WHEN cm.role = 'teacher' THEN cm.user_id END) AS total_teachers,
  
  -- Estatísticas de atividades
  COUNT(DISTINCT aca.activity_id) AS total_activities,
  COUNT(DISTINCT CASE WHEN a.due_date < NOW() THEN aca.activity_id END) AS expired_activities,
  COUNT(DISTINCT CASE WHEN a.due_date >= NOW() THEN aca.activity_id END) AS active_activities,
  
  -- Estatísticas de submissões
  COUNT(DISTINCT s.id) AS total_submissions,
  COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END) AS graded_submissions,
  COUNT(DISTINCT CASE WHEN s.status = 'submitted' THEN s.id END) AS pending_submissions,
  
  -- Médias
  ROUND(AVG(CASE WHEN s.status = 'graded' THEN s.grade END), 2) AS average_grade,
  ROUND(AVG(CASE WHEN s.status = 'graded' THEN (s.grade / a.max_score) * 100 END), 2) AS average_percentage,
  
  -- Taxa de entrega
  ROUND(
    COUNT(DISTINCT s.id)::DECIMAL / 
    NULLIF(COUNT(DISTINCT cm.user_id) * COUNT(DISTINCT aca.activity_id), 0) * 100,
    2
  ) AS submission_rate,
  
  -- Taxa de correção
  ROUND(
    COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END)::DECIMAL / 
    NULLIF(COUNT(DISTINCT s.id), 0) * 100,
    2
  ) AS grading_rate,
  
  -- Engajamento (removido temporariamente até migration do feed)
  0 AS total_posts,
  0 AS total_comments,
  
  -- Materiais
  COUNT(DISTINCT cm_mat.id) AS total_materials,
  
  -- Timestamps
  c.created_at,
  MAX(s.submitted_at) AS last_submission_date,
  NULL::timestamptz AS last_post_date

FROM public.classes c
LEFT JOIN public.class_members cm ON cm.class_id = c.id
LEFT JOIN public.activity_class_assignments aca ON aca.class_id = c.id
LEFT JOIN public.activities a ON a.id = aca.activity_id
LEFT JOIN public.submissions s ON s.activity_id = a.id
LEFT JOIN public.class_materials cm_mat ON cm_mat.class_id = c.id

GROUP BY c.id, c.name, c.created_by, c.created_at;

-- =====================================================
-- 2. VIEW DE EVOLUÇÃO TEMPORAL (ÚLTIMOS 30 DIAS)
-- =====================================================
CREATE OR REPLACE VIEW public.class_daily_activity AS
SELECT
  c.id AS class_id,
  date_series.date AS activity_date,
  
  -- Submissões do dia
  COUNT(DISTINCT s.id) AS submissions_count,
  COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END) AS graded_count,
  
  -- Média do dia
  ROUND(AVG(CASE WHEN s.status = 'graded' THEN s.grade END), 2) AS daily_average_grade,
  
  -- Engajamento do dia (removido temporariamente até migration do feed)
  0 AS posts_count,
  0 AS comments_count,
  
  -- Materiais enviados
  COUNT(DISTINCT cm.id) AS materials_count

FROM public.classes c
CROSS JOIN (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    INTERVAL '1 day'
  )::date AS date
) AS date_series

LEFT JOIN public.activity_class_assignments aca ON aca.class_id = c.id
LEFT JOIN public.submissions s ON s.activity_id = aca.activity_id 
  AND s.submitted_at::date = date_series.date
LEFT JOIN public.class_materials cm ON cm.class_id = c.id 
  AND cm.created_at::date = date_series.date

GROUP BY c.id, date_series.date
ORDER BY c.id, date_series.date;

-- =====================================================
-- 3. VIEW DE RANKING DE ALUNOS
-- =====================================================
CREATE OR REPLACE VIEW public.class_student_ranking AS
SELECT
  cm.class_id,
  cm.user_id AS student_id,
  p.full_name AS student_name,
  p.email AS student_email,
  p.avatar_url,
  
  -- Estatísticas de submissões
  COUNT(DISTINCT s.id) AS total_submissions,
  COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END) AS graded_submissions,
  
  -- Notas
  ROUND(AVG(CASE WHEN s.status = 'graded' THEN s.grade END), 2) AS average_grade,
  MAX(CASE WHEN s.status = 'graded' THEN s.grade END) AS highest_grade,
  MIN(CASE WHEN s.status = 'graded' THEN s.grade END) AS lowest_grade,
  
  -- Percentual médio
  ROUND(AVG(CASE WHEN s.status = 'graded' THEN (s.grade / a.max_score) * 100 END), 2) AS average_percentage,
  
  -- Pontualidade
  COUNT(CASE WHEN s.submitted_at <= a.due_date THEN 1 END) AS on_time_submissions,
  COUNT(CASE WHEN s.submitted_at > a.due_date THEN 1 END) AS late_submissions,
  
  -- Engajamento (removido temporariamente até migration do feed)
  0 AS posts_created,
  0 AS comments_made,
  
  -- Ranking position (será calculado na query)
  ROW_NUMBER() OVER (
    PARTITION BY cm.class_id 
    ORDER BY AVG(CASE WHEN s.status = 'graded' THEN (s.grade / a.max_score) * 100 END) DESC NULLS LAST
  ) AS rank_position

FROM public.class_members cm
JOIN public.profiles p ON p.id = cm.user_id
LEFT JOIN public.activity_class_assignments aca ON aca.class_id = cm.class_id
LEFT JOIN public.activities a ON a.id = aca.activity_id
LEFT JOIN public.submissions s ON s.activity_id = a.id AND s.student_id = cm.user_id
WHERE cm.role = 'student'

GROUP BY cm.class_id, cm.user_id, p.full_name, p.email, p.avatar_url;

-- =====================================================
-- 4. VIEW DE PERFORMANCE POR ATIVIDADE
-- =====================================================
CREATE OR REPLACE VIEW public.class_activity_performance AS
SELECT
  aca.class_id,
  a.id AS activity_id,
  a.title AS activity_title,
  a.type AS activity_type,
  a.max_score AS total_points,
  a.due_date,
  a.created_by AS teacher_id,
  
  -- Estatísticas de submissão
  COUNT(DISTINCT cm.user_id) AS total_students,
  COUNT(DISTINCT s.id) AS total_submissions,
  COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END) AS graded_count,
  COUNT(DISTINCT CASE WHEN s.status = 'submitted' THEN s.id END) AS pending_count,
  
  -- Taxa de entrega
  ROUND(
    COUNT(DISTINCT s.id)::DECIMAL / 
    NULLIF(COUNT(DISTINCT cm.user_id), 0) * 100,
    2
  ) AS submission_rate,
  
  -- Notas
  ROUND(AVG(CASE WHEN s.status = 'graded' THEN s.grade END), 2) AS average_grade,
  MAX(CASE WHEN s.status = 'graded' THEN s.grade END) AS highest_grade,
  MIN(CASE WHEN s.status = 'graded' THEN s.grade END) AS lowest_grade,
  
  -- Distribuição de notas
  COUNT(CASE WHEN s.grade >= a.max_score * 0.9 THEN 1 END) AS excellent_count,
  COUNT(CASE WHEN s.grade >= a.max_score * 0.7 AND s.grade < a.max_score * 0.9 THEN 1 END) AS good_count,
  COUNT(CASE WHEN s.grade >= a.max_score * 0.5 AND s.grade < a.max_score * 0.7 THEN 1 END) AS average_count,
  COUNT(CASE WHEN s.grade < a.max_score * 0.5 THEN 1 END) AS below_average_count,
  
  -- Pontualidade
  COUNT(CASE WHEN s.submitted_at <= a.due_date THEN 1 END) AS on_time_count,
  COUNT(CASE WHEN s.submitted_at > a.due_date THEN 1 END) AS late_count,
  
  -- Tempo médio de submissão
  ROUND(AVG(EXTRACT(EPOCH FROM (s.submitted_at - a.created_at)) / 3600), 2) AS avg_hours_to_submit

FROM public.activity_class_assignments aca
JOIN public.activities a ON a.id = aca.activity_id
LEFT JOIN public.class_members cm ON cm.class_id = aca.class_id AND cm.role = 'student'
LEFT JOIN public.submissions s ON s.activity_id = a.id AND s.student_id = cm.user_id

GROUP BY aca.class_id, a.id, a.title, a.type, a.max_score, a.due_date, a.created_by;

-- =====================================================
-- 5. FUNCTION PARA INSIGHTS AUTOMÁTICOS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_class_insights(p_class_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_insights JSONB;
  v_avg_grade DECIMAL;
  v_submission_rate DECIMAL;
  v_grading_rate DECIMAL;
  v_engagement_score DECIMAL;
BEGIN
  -- Buscar métricas base
  SELECT 
    average_grade,
    submission_rate,
    grading_rate,
    (total_posts + total_comments)::DECIMAL / NULLIF(total_students, 0) AS engagement
  INTO v_avg_grade, v_submission_rate, v_grading_rate, v_engagement_score
  FROM public.class_performance_overview
  WHERE class_id = p_class_id;
  
  -- Gerar insights
  v_insights := jsonb_build_object(
    'performance_level', 
      CASE 
        WHEN v_avg_grade >= 80 THEN 'excellent'
        WHEN v_avg_grade >= 60 THEN 'good'
        WHEN v_avg_grade >= 40 THEN 'average'
        ELSE 'needs_attention'
      END,
    
    'submission_status',
      CASE
        WHEN v_submission_rate >= 90 THEN 'excellent'
        WHEN v_submission_rate >= 70 THEN 'good'
        WHEN v_submission_rate >= 50 THEN 'average'
        ELSE 'low'
      END,
    
    'grading_status',
      CASE
        WHEN v_grading_rate >= 90 THEN 'up_to_date'
        WHEN v_grading_rate >= 70 THEN 'good'
        WHEN v_grading_rate >= 50 THEN 'delayed'
        ELSE 'very_delayed'
      END,
    
    'engagement_level',
      CASE
        WHEN v_engagement_score >= 5 THEN 'very_high'
        WHEN v_engagement_score >= 3 THEN 'high'
        WHEN v_engagement_score >= 1 THEN 'medium'
        ELSE 'low'
      END,
    
    'recommendations', (
      SELECT jsonb_agg(rec)
      FROM (
        SELECT 'Média da turma está excelente!' AS rec WHERE v_avg_grade >= 80
        UNION ALL
        SELECT 'Considere atividades de reforço' WHERE v_avg_grade < 60
        UNION ALL
        SELECT 'Taxa de entrega baixa - envie lembretes' WHERE v_submission_rate < 70
        UNION ALL
        SELECT 'Correções atrasadas - priorize o painel de correções' WHERE v_grading_rate < 70
        UNION ALL
        SELECT 'Baixo engajamento - incentive participação no mural' WHERE v_engagement_score < 2
      ) AS recommendations
    )
  );
  
  RETURN v_insights;
END;
$$;

-- =====================================================
-- 6. FUNCTION PARA COMPARATIVO ENTRE TURMAS
-- =====================================================
CREATE OR REPLACE FUNCTION public.compare_classes(p_teacher_id UUID)
RETURNS TABLE (
  class_id UUID,
  class_name TEXT,
  total_students BIGINT,
  average_grade DECIMAL,
  submission_rate DECIMAL,
  engagement_score DECIMAL,
  performance_rank INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH class_metrics AS (
    SELECT
      cpo.class_id,
      cpo.class_name,
      cpo.total_students,
      cpo.average_grade,
      cpo.submission_rate,
      (cpo.total_posts + cpo.total_comments)::DECIMAL / NULLIF(cpo.total_students, 0) AS engagement
    FROM public.class_performance_overview cpo
    WHERE cpo.teacher_id = p_teacher_id
  )
  SELECT
    cm.class_id,
    cm.class_name,
    cm.total_students,
    cm.average_grade,
    cm.submission_rate,
    cm.engagement,
    ROW_NUMBER() OVER (ORDER BY cm.average_grade DESC NULLS LAST)::INTEGER AS rank
  FROM class_metrics cm
  ORDER BY cm.average_grade DESC NULLS LAST;
END;
$$;

-- =====================================================
-- 7. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_submissions_analytics 
ON public.submissions(activity_id, status, submitted_at) 
INCLUDE (grade, student_id);

-- Índices para class_posts e post_comments serão criados na migration do feed

CREATE INDEX IF NOT EXISTS idx_class_materials_analytics 
ON public.class_materials(class_id, created_at);

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- Views herdam policies das tabelas base
-- Garantir que functions sejam SECURITY DEFINER

-- =====================================================
-- 9. COMENTÁRIOS
-- =====================================================
COMMENT ON VIEW public.class_performance_overview IS 
'Visão geral de performance da turma com todas métricas principais';

COMMENT ON VIEW public.class_daily_activity IS 
'Evolução diária de atividades nos últimos 30 dias';

COMMENT ON VIEW public.class_student_ranking IS 
'Ranking de alunos por performance na turma';

COMMENT ON VIEW public.class_activity_performance IS 
'Performance detalhada por atividade';

COMMENT ON FUNCTION public.get_class_insights(UUID) IS 
'Gera insights automáticos sobre a performance da turma';

COMMENT ON FUNCTION public.compare_classes(UUID) IS 
'Compara performance entre turmas de um professor';
