-- ================================================
-- Migration: Simplificar DRASTICAMENTE as RLS policies de class_members
-- Data: 2025-10-27
-- Descrição: Remove políticas complexas e mantém apenas o essencial
-- ================================================

-- PROBLEMA: Múltiplas policies complexas estão causando lentidão
-- SOLUÇÃO: Manter apenas 1 policy simples para cada operação

-- 1. REMOVER TODAS as policies existentes
DROP POLICY IF EXISTS "class_members_select_own_or_teacher" ON public.class_members;
DROP POLICY IF EXISTS "class_members_select_policy" ON public.class_members;
DROP POLICY IF EXISTS "class_members_insert_by_teacher" ON public.class_members;
DROP POLICY IF EXISTS "class_members_insert_policy" ON public.class_members;
DROP POLICY IF EXISTS "class_members_update_by_teacher" ON public.class_members;
DROP POLICY IF EXISTS "class_members_update_policy" ON public.class_members;
DROP POLICY IF EXISTS "class_members_delete_by_teacher_or_self" ON public.class_members;
DROP POLICY IF EXISTS "class_members_delete_policy" ON public.class_members;

-- 2. Criar UMA policy simples para SELECT (a mais importante!)
CREATE POLICY "class_members_read_simple"
ON public.class_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  -- Usuário é o próprio membro (índice existe: idx_class_members_user_id)
  user_id = auth.uid()
  OR
  -- OU usuário é professor da turma (índice existe: idx_classes_created_by)
  class_id IN (
    SELECT id 
    FROM classes 
    WHERE created_by = auth.uid()
  )
);

COMMENT ON POLICY "class_members_read_simple" ON public.class_members IS
'Policy simplificada - prioriza velocidade sobre granularidade';

-- 3. Criar policy simples para INSERT (apenas professores que criaram a turma)
CREATE POLICY "class_members_insert_simple"
ON public.class_members
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  class_id IN (
    SELECT id 
    FROM classes 
    WHERE created_by = auth.uid()
  )
);

-- 4. Criar policy simples para UPDATE
CREATE POLICY "class_members_update_simple"
ON public.class_members
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  class_id IN (
    SELECT id 
    FROM classes 
    WHERE created_by = auth.uid()
  )
);

-- 5. Criar policy simples para DELETE
CREATE POLICY "class_members_delete_simple"
ON public.class_members
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  -- Pode deletar a si mesmo
  user_id = auth.uid()
  OR
  -- Ou se for professor da turma
  class_id IN (
    SELECT id 
    FROM classes 
    WHERE created_by = auth.uid()
  )
);

-- 6. Garantir que o índice crítico existe
CREATE INDEX IF NOT EXISTS idx_class_members_user_class 
ON public.class_members (user_id, class_id);

COMMENT ON INDEX idx_class_members_user_class IS
'Índice composto para acelerar RLS policies simplificadas';
