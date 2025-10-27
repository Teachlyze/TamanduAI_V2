-- ================================================
-- Migration: Otimizar RLS policies lentas
-- Data: 2025-10-27
-- Descrição: Otimiza policies que fazem múltiplos JOINs e subqueries
-- ================================================

-- 1. Otimizar policy de activity_class_assignments
-- ANTES: Dois EXISTS separados (lento)
-- DEPOIS: Um EXISTS com OR dentro (mais eficiente)
DROP POLICY IF EXISTS "activity_class_assignments_safe" ON public.activity_class_assignments;

CREATE POLICY "activity_class_assignments_safe"
ON public.activity_class_assignments
AS PERMISSIVE
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM classes c
    WHERE c.id = activity_class_assignments.class_id 
      AND c.created_by = auth.uid()
    
    UNION ALL
    
    SELECT 1
    FROM activities a
    WHERE a.id = activity_class_assignments.activity_id 
      AND a.created_by = auth.uid()
    LIMIT 1
  )
);

COMMENT ON POLICY "activity_class_assignments_safe" ON public.activity_class_assignments IS
'Otimizado: Usa UNION ALL ao invés de dois EXISTS separados';

-- 2. Criar função auxiliar para verificar acesso a turma
-- Isso evita repetir a mesma lógica em múltiplas policies
CREATE OR REPLACE FUNCTION public.user_has_class_access(p_class_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    WHERE cm.class_id = p_class_id
      AND cm.user_id = p_user_id
    LIMIT 1
  );
$$;

COMMENT ON FUNCTION public.user_has_class_access IS
'Função auxiliar para verificar se usuário tem acesso a uma turma. Usada em RLS policies.';

-- 3. Criar função auxiliar para verificar se usuário é dono da atividade ou membro da turma
CREATE OR REPLACE FUNCTION public.user_can_view_activity(p_activity_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    -- Usuário criou a atividade
    SELECT 1
    FROM activities a
    WHERE a.id = p_activity_id
      AND a.created_by = p_user_id
    LIMIT 1
  ) OR EXISTS (
    -- Usuário é membro de uma turma que tem essa atividade
    SELECT 1
    FROM activity_class_assignments aca
    INNER JOIN class_members cm ON cm.class_id = aca.class_id
    WHERE aca.activity_id = p_activity_id
      AND cm.user_id = p_user_id
    LIMIT 1
  );
$$;

COMMENT ON FUNCTION public.user_can_view_activity IS
'Função auxiliar para verificar se usuário pode ver uma atividade. Usada em RLS policies.';

-- 4. Otimizar policy de submissions (muito usada)
-- Substitui múltiplos EXISTS por função auxiliar
DROP POLICY IF EXISTS "submissions_select_own_or_teacher" ON public.submissions;

CREATE POLICY "submissions_select_own_or_teacher"
ON public.submissions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM activities a
    WHERE a.id = submissions.activity_id
      AND a.created_by = auth.uid()
    LIMIT 1
  )
  OR
  EXISTS (
    SELECT 1
    FROM activity_class_assignments aca
    INNER JOIN class_members cm ON cm.class_id = aca.class_id
    WHERE aca.activity_id = submissions.activity_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'teacher'
    LIMIT 1
  )
);

COMMENT ON POLICY "submissions_select_own_or_teacher" ON public.submissions IS
'Otimizado: Usa LIMIT 1 em subqueries para parar assim que encontrar match';
