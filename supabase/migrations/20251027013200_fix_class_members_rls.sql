-- ================================================
-- Migration: Otimizar RLS policy de class_members
-- Data: 2025-10-27
-- Descrição: Remove uso de função pesada em policy de class_members
-- ================================================

-- O problema: A policy atual chama get_user_created_class_ids_direct() 
-- em TODA query, fazendo uma subquery pesada em classes
-- 
-- ANTES:
-- using ((user_id = auth.uid()) OR (class_id = ANY (get_user_created_class_ids_direct(auth.uid()))))
--
-- DEPOIS:
-- using ((user_id = auth.uid()) OR EXISTS (SELECT 1 FROM classes WHERE id = class_members.class_id AND created_by = auth.uid() LIMIT 1))

-- 1. Drop da policy antiga
DROP POLICY IF EXISTS "class_members_select_own_or_teacher" ON public.class_members;

-- 2. Criar policy otimizada
CREATE POLICY "class_members_select_own_or_teacher"
ON public.class_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  -- Usuário é membro da turma (rápido - usa índice)
  user_id = auth.uid()
  OR
  -- Usuário criou a turma (otimizado com EXISTS + LIMIT 1)
  EXISTS (
    SELECT 1
    FROM classes c
    WHERE c.id = class_members.class_id
      AND c.created_by = auth.uid()
    LIMIT 1
  )
);

COMMENT ON POLICY "class_members_select_own_or_teacher" ON public.class_members IS
'Otimizado: Usa EXISTS com LIMIT 1 ao invés de função que agrega TODAS as classes';

-- 3. Otimizar policies de INSERT/UPDATE/DELETE também
DROP POLICY IF EXISTS "class_members_insert_by_teacher" ON public.class_members;

CREATE POLICY "class_members_insert_by_teacher"
ON public.class_members
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM classes c
    WHERE c.id = class_members.class_id
      AND c.created_by = auth.uid()
    LIMIT 1
  )
);

DROP POLICY IF EXISTS "class_members_update_by_teacher" ON public.class_members;

CREATE POLICY "class_members_update_by_teacher"
ON public.class_members
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM classes c
    WHERE c.id = class_members.class_id
      AND c.created_by = auth.uid()
    LIMIT 1
  )
);

DROP POLICY IF EXISTS "class_members_delete_by_teacher_or_self" ON public.class_members;

CREATE POLICY "class_members_delete_by_teacher_or_self"
ON public.class_members
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM classes c
    WHERE c.id = class_members.class_id
      AND c.created_by = auth.uid()
    LIMIT 1
  )
);

-- 4. Criar índice se ainda não existir para acelerar essas queries
CREATE INDEX IF NOT EXISTS idx_classes_created_by_active
ON public.classes (created_by, id) WHERE is_active = true;

COMMENT ON INDEX idx_classes_created_by_active IS
'Índice para otimizar RLS policies que verificam se usuário criou a turma';
