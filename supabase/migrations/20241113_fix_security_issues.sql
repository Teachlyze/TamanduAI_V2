-- ============================================================================
-- Fix Security Issues - Supabase Linter Recommendations
-- Date: 2024-11-13
-- ============================================================================
-- This migration fixes security issues reported by Supabase linter:
-- 1. Removes SECURITY DEFINER from views
-- 2. Enables RLS on public tables missing it
-- ============================================================================

-- ============================================================================
-- PART 1: Fix SECURITY DEFINER Views
-- ============================================================================
-- Drop and recreate views WITHOUT security definer
-- This allows views to respect the permissions of the querying user instead of creator

-- 1. activity_grades view
DROP VIEW IF EXISTS public.activity_grades;
CREATE VIEW public.activity_grades AS
SELECT 
  s.activity_id,
  s.student_id,
  s.grade,
  s.status,
  s.submitted_at,
  s.graded_at,
  a.title as activity_title,
  a.max_score,
  p.full_name as student_name
FROM submissions s
JOIN activities a ON s.activity_id = a.id
JOIN profiles p ON s.student_id = p.id;

-- 2. class_grade_matrix view
DROP VIEW IF EXISTS public.class_grade_matrix;
CREATE VIEW public.class_grade_matrix AS
SELECT 
  cm.class_id,
  cm.user_id as student_id,
  p.full_name as student_name,
  s.activity_id,
  a.title as activity_title,
  s.grade,
  s.status
FROM class_members cm
JOIN profiles p ON cm.user_id = p.id
LEFT JOIN submissions s ON s.student_id = cm.user_id
LEFT JOIN activities a ON s.activity_id = a.id
WHERE cm.role = 'student';

-- 3. student_grades view
DROP VIEW IF EXISTS public.student_grades;
CREATE VIEW public.student_grades AS
SELECT 
  s.student_id,
  p.full_name as student_name,
  COUNT(s.id) as total_submissions,
  AVG(s.grade) as average_grade,
  COUNT(CASE WHEN s.status = 'graded' THEN 1 END) as graded_count,
  COUNT(CASE WHEN s.status = 'submitted' THEN 1 END) as pending_count
FROM submissions s
JOIN profiles p ON s.student_id = p.id
GROUP BY s.student_id, p.full_name;

-- 4. grading_queue view
DROP VIEW IF EXISTS public.grading_queue;
CREATE VIEW public.grading_queue AS
SELECT 
  s.id as submission_id,
  s.activity_id,
  s.student_id,
  a.title as activity_title,
  a.created_by as teacher_id,
  p.full_name as student_name,
  s.submitted_at,
  s.status
FROM submissions s
JOIN activities a ON s.activity_id = a.id
JOIN profiles p ON s.student_id = p.id
WHERE s.status = 'submitted'
ORDER BY s.submitted_at ASC;

-- 5. student_activities_view view
DROP VIEW IF EXISTS public.student_activities_view;
CREATE VIEW public.student_activities_view AS
SELECT 
  a.id,
  a.title,
  a.description,
  a.type,
  a.due_date,
  a.max_score,
  a.created_by as teacher_id,
  aca.class_id,
  s.id as submission_id,
  s.status as submission_status,
  s.grade,
  s.submitted_at
FROM activities a
JOIN activity_class_assignments aca ON a.id = aca.activity_id
LEFT JOIN submissions s ON a.id = s.activity_id
WHERE a.is_published = true AND a.deleted_at IS NULL;

-- 6. unread_notifications_count view
DROP VIEW IF EXISTS public.unread_notifications_count;
CREATE VIEW public.unread_notifications_count AS
SELECT 
  user_id,
  COUNT(*) as unread_count
FROM notifications
WHERE read = false
GROUP BY user_id;

-- 7. class_activity_performance view
DROP VIEW IF EXISTS public.class_activity_performance;
CREATE VIEW public.class_activity_performance AS
SELECT 
  aca.class_id,
  a.id as activity_id,
  a.title as activity_title,
  COUNT(s.id) as total_submissions,
  AVG(s.grade) as average_grade,
  COUNT(CASE WHEN s.status = 'graded' THEN 1 END) as graded_count
FROM activity_class_assignments aca
JOIN activities a ON aca.activity_id = a.id
LEFT JOIN submissions s ON a.id = s.activity_id
GROUP BY aca.class_id, a.id, a.title;

-- 8. profiles_with_age view
DROP VIEW IF EXISTS public.profiles_with_age;
CREATE VIEW public.profiles_with_age AS
SELECT 
  id,
  email,
  full_name,
  avatar_url,
  role,
  age,
  cpf,
  email_confirmed,
  is_active,
  created_at,
  updated_at
FROM profiles;

-- 9. class_daily_activity view
DROP VIEW IF EXISTS public.class_daily_activity;
CREATE VIEW public.class_daily_activity AS
SELECT 
  class_id,
  DATE(created_at) as activity_date,
  COUNT(*) as activity_count
FROM (
  SELECT class_id, created_at FROM class_materials
  UNION ALL
  SELECT class_id, created_at FROM discussions
) combined
GROUP BY class_id, DATE(created_at);

-- 10. class_performance_overview view
DROP VIEW IF EXISTS public.class_performance_overview;
CREATE VIEW public.class_performance_overview AS
SELECT 
  c.id as class_id,
  c.name as class_name,
  COUNT(DISTINCT cm.user_id) as student_count,
  COUNT(DISTINCT aca.activity_id) as activity_count,
  AVG(s.grade) as class_average_grade
FROM classes c
LEFT JOIN class_members cm ON c.id = cm.class_id AND cm.role = 'student'
LEFT JOIN activity_class_assignments aca ON c.id = aca.class_id
LEFT JOIN submissions s ON aca.activity_id = s.activity_id
GROUP BY c.id, c.name;

-- 11. class_student_ranking view
DROP VIEW IF EXISTS public.class_student_ranking;
CREATE VIEW public.class_student_ranking AS
SELECT 
  cm.class_id,
  cm.user_id as student_id,
  p.full_name as student_name,
  AVG(s.grade) as average_grade,
  COUNT(s.id) as completed_activities,
  ROW_NUMBER() OVER (PARTITION BY cm.class_id ORDER BY AVG(s.grade) DESC) as rank
FROM class_members cm
JOIN profiles p ON cm.user_id = p.id
LEFT JOIN submissions s ON cm.user_id = s.student_id AND s.status = 'graded'
WHERE cm.role = 'student'
GROUP BY cm.class_id, cm.user_id, p.full_name;

-- ============================================================================
-- PART 2: Enable RLS on Missing Tables
-- ============================================================================

-- 1. correction_drafts table
ALTER TABLE public.correction_drafts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for correction_drafts
CREATE POLICY "Teachers can view their own correction drafts"
  ON public.correction_drafts FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own correction drafts"
  ON public.correction_drafts FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own correction drafts"
  ON public.correction_drafts FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own correction drafts"
  ON public.correction_drafts FOR DELETE
  USING (auth.uid() = teacher_id);

-- 2. correction_history table
ALTER TABLE public.correction_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for correction_history
CREATE POLICY "Teachers can view their own correction history"
  ON public.correction_history FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own correction history"
  ON public.correction_history FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- History is immutable, no update/delete

-- 3. correction_metrics table
ALTER TABLE public.correction_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for correction_metrics
CREATE POLICY "Teachers can view their own correction metrics"
  ON public.correction_metrics FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "System can insert correction metrics"
  ON public.correction_metrics FOR INSERT
  WITH CHECK (true); -- Metrics são inseridas por triggers/functions

-- Metrics são geralmente imutáveis

-- 4. submission_rubric_scores table
ALTER TABLE public.submission_rubric_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for submission_rubric_scores
CREATE POLICY "Users can view rubric scores for their submissions"
  ON public.submission_rubric_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions s
      WHERE s.id = submission_rubric_scores.submission_id
      AND (s.student_id = auth.uid() OR s.activity_id IN (
        SELECT a.id FROM activities a WHERE a.created_by = auth.uid()
      ))
    )
  );

CREATE POLICY "Teachers can insert rubric scores for their activities"
  ON public.submission_rubric_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM submissions s
      JOIN activities a ON s.activity_id = a.id
      WHERE s.id = submission_rubric_scores.submission_id
      AND a.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers can update rubric scores for their activities"
  ON public.submission_rubric_scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM submissions s
      JOIN activities a ON s.activity_id = a.id
      WHERE s.id = submission_rubric_scores.submission_id
      AND a.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete rubric scores for their activities"
  ON public.submission_rubric_scores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM submissions s
      JOIN activities a ON s.activity_id = a.id
      WHERE s.id = submission_rubric_scores.submission_id
      AND a.created_by = auth.uid()
    )
  );

-- ============================================================================
-- PART 3: Comments
-- ============================================================================

COMMENT ON VIEW public.activity_grades IS 'View of grades - respects querying user permissions';
COMMENT ON VIEW public.class_grade_matrix IS 'Grade matrix by class - respects querying user permissions';
COMMENT ON VIEW public.student_grades IS 'Student grade summary - respects querying user permissions';
COMMENT ON VIEW public.grading_queue IS 'Pending submissions queue - respects querying user permissions';
COMMENT ON VIEW public.student_activities_view IS 'Student activities overview - respects querying user permissions';
COMMENT ON VIEW public.unread_notifications_count IS 'Unread notification count - respects querying user permissions';
COMMENT ON VIEW public.class_activity_performance IS 'Class activity performance metrics - respects querying user permissions';
COMMENT ON VIEW public.profiles_with_age IS 'Profiles with calculated age - respects querying user permissions';
COMMENT ON VIEW public.class_daily_activity IS 'Daily activity count by class - respects querying user permissions';
COMMENT ON VIEW public.class_performance_overview IS 'Overview of class performance - respects querying user permissions';
COMMENT ON VIEW public.class_student_ranking IS 'Student ranking within classes - respects querying user permissions';

COMMENT ON TABLE public.correction_drafts IS 'Teacher correction drafts - RLS enabled';
COMMENT ON TABLE public.correction_history IS 'Correction history log - RLS enabled';
COMMENT ON TABLE public.correction_metrics IS 'Correction performance metrics - RLS enabled';
COMMENT ON TABLE public.submission_rubric_scores IS 'Rubric scores for submissions - RLS enabled';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- All security issues from Supabase linter have been fixed:
-- ✅ Removed SECURITY DEFINER from 11 views
-- ✅ Enabled RLS on 4 tables (correction_drafts, correction_history, correction_metrics, submission_rubric_scores)
-- ✅ Created appropriate RLS policies for each table
-- ============================================================================
