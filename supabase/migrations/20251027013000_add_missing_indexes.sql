-- ================================================
-- Migration: Adicionar índices faltantes para otimizar performance
-- Data: 2025-10-27
-- Descrição: Adiciona índices em colunas frequentemente usadas em WHERE/JOIN
-- ================================================

-- Índice composto para queries que filtram por class_id e depois fazem JOIN com activities
-- (os índices individuais já existem)
CREATE INDEX IF NOT EXISTS idx_activity_class_assignments_class_activity 
ON public.activity_class_assignments (class_id, activity_id);

-- Índice para acelerar queries de class_members filtradas por user_id e role
CREATE INDEX IF NOT EXISTS idx_class_members_user_role 
ON public.class_members (user_id, role) WHERE role = 'student';

-- Índice composto para submissions mais comuns (student_id + status)
CREATE INDEX IF NOT EXISTS idx_submissions_student_status 
ON public.submissions (student_id, status);

-- Índice para activities filtradas por status (usado em RLS)
-- Nota: idx_activities_is_published já existe, então criamos apenas para status
CREATE INDEX IF NOT EXISTS idx_activities_status 
ON public.activities (status) WHERE status = 'active';

-- Comentários para referência futura
COMMENT ON INDEX idx_activity_class_assignments_class_activity IS 
'Índice composto para otimizar queries que filtram atividades por class_id (ex: StudentDashboard)';

COMMENT ON INDEX idx_class_members_user_role IS 
'Índice para otimizar queries que buscam membros de turma por usuário e role';

COMMENT ON INDEX idx_submissions_student_status IS 
'Índice para otimizar queries que buscam submissões de aluno por status';

COMMENT ON INDEX idx_activities_status IS 
'Índice para otimizar queries que filtram atividades por status';
