-- =====================================================
-- Migration: Fix Discussions RLS for Students
-- Description: Permite que alunos vejam posts do mural
-- Author: TamanduAI Team  
-- Date: 2025-01-31
-- =====================================================

-- 1. DROPAR POLICIES ANTIGAS QUE PODEM CAUSAR CONFLITO
DROP POLICY IF EXISTS "discussions_owner" ON public.discussions;
DROP POLICY IF EXISTS "discussions_read" ON public.discussions;
DROP POLICY IF EXISTS "discussions_select" ON public.discussions;
DROP POLICY IF EXISTS "discussions_select_policy" ON public.discussions;
DROP POLICY IF EXISTS "discussions_select_members" ON public.discussions;
DROP POLICY IF EXISTS "discussions_insert" ON public.discussions;
DROP POLICY IF EXISTS "discussions_insert_teacher" ON public.discussions;
DROP POLICY IF EXISTS "discussions_update" ON public.discussions;
DROP POLICY IF EXISTS "discussions_update_owner" ON public.discussions;
DROP POLICY IF EXISTS "discussions_delete" ON public.discussions;
DROP POLICY IF EXISTS "discussions_delete_owner" ON public.discussions;

-- 2. CRIAR POLICY: ALUNOS E PROFESSORES PODEM VER DISCUSSIONS
CREATE POLICY "discussions_select_members"
ON public.discussions
FOR SELECT
USING (
    -- Professor/criador pode ver:
    created_by = auth.uid()
    OR
    -- Membros da turma (alunos + professores) podem ver:
    EXISTS (
        SELECT 1 FROM public.class_members
        WHERE class_members.class_id = discussions.class_id
        AND class_members.user_id = auth.uid()
    )
);

-- 3. CRIAR POLICY: PROFESSORES PODEM CRIAR DISCUSSIONS
CREATE POLICY "discussions_insert_teacher"
ON public.discussions
FOR INSERT
WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = discussions.class_id
        AND classes.created_by = auth.uid()
    )
);

-- 4. CRIAR POLICY: DONO PODE EDITAR
CREATE POLICY "discussions_update_owner"
ON public.discussions
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- 5. CRIAR POLICY: DONO PODE DELETAR
CREATE POLICY "discussions_delete_owner"
ON public.discussions
FOR DELETE
USING (created_by = auth.uid());

-- 6. GARANTIR QUE RLS ESTÁ HABILITADO
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

-- 7. VERIFICAR SE COLUNA content EXISTE, SE NÃO, ADICIONAR
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'discussions' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE public.discussions ADD COLUMN content TEXT;
        
        -- Copiar description para content se existir
        UPDATE public.discussions 
        SET content = description 
        WHERE content IS NULL AND description IS NOT NULL;
    END IF;
END $$;
