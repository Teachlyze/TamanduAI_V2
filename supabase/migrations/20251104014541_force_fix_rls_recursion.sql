-- =========================================================================
-- MIGRATION: FORCE FIX RLS Infinite Recursion - Final Solution
-- Data: 2025-11-04 01:45 UTC-3
-- Problema: Erro 42P17 "infinite recursion detected in policy for relation"
-- Solução: Remover TODAS as políticas e recriar do zero SEM recursão
-- =========================================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'INICIANDO CORREÇÃO FORÇADA DE RLS - TIMESTAMP: %', NOW();
  RAISE NOTICE '==========================================================';
END $$;

-- =========================================================================
-- PASSO 1: DESABILITAR RLS TEMPORARIAMENTE (para garantir que podemos limpar)
-- =========================================================================

ALTER TABLE public.class_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;

-- =========================================================================
-- PASSO 2: REMOVER TODAS AS POLÍTICAS DE class_members
-- =========================================================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  Removendo TODAS as políticas de class_members...';
    
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'class_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.class_members CASCADE', pol.policyname);
        RAISE NOTICE '  ✓ Removida: %', pol.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ Todas as políticas de class_members removidas';
END $$;

-- =========================================================================
-- PASSO 3: REMOVER TODAS AS POLÍTICAS DE classes
-- =========================================================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  Removendo TODAS as políticas de classes...';
    
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'classes'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.classes CASCADE', pol.policyname);
        RAISE NOTICE '  ✓ Removida: %', pol.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ Todas as políticas de classes removidas';
END $$;

-- =========================================================================
-- PASSO 4: CRIAR FUNCTION SECURITY DEFINER (para evitar recursão)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.user_is_class_creator(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- SECURITY DEFINER bypassa RLS, tornando esta função segura
  SELECT EXISTS (
    SELECT 1 
    FROM classes 
    WHERE id = p_class_id 
    AND created_by = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.user_is_class_creator IS 
'SECURITY DEFINER: Verifica se usuário criou a turma sem triggerar RLS recursivo';

GRANT EXECUTE ON FUNCTION public.user_is_class_creator TO authenticated;

-- =========================================================================
-- PASSO 5: CRIAR POLÍTICAS NÃO-RECURSIVAS PARA class_members
-- =========================================================================

RAISE NOTICE '';
RAISE NOTICE '🔐 Criando políticas NÃO-RECURSIVAS para class_members...';

-- SELECT: Ver próprios registros OU ser criador da turma
CREATE POLICY "class_members_select_final"
ON public.class_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  user_is_class_creator(class_id)
);

-- INSERT: Criador da turma OU auto-registro como student
CREATE POLICY "class_members_insert_final"
ON public.class_members
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  user_is_class_creator(class_id)
  OR
  (user_id = auth.uid() AND role = 'student')
);

-- UPDATE: Ver próprios registros OU ser criador da turma
CREATE POLICY "class_members_update_final"
ON public.class_members
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  user_is_class_creator(class_id)
)
WITH CHECK (
  user_id = auth.uid()
  OR
  user_is_class_creator(class_id)
);

-- DELETE: Deletar próprio registro OU ser criador da turma
CREATE POLICY "class_members_delete_final"
ON public.class_members
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  user_is_class_creator(class_id)
);

RAISE NOTICE '✅ Políticas de class_members criadas';

-- =========================================================================
-- PASSO 6: CRIAR POLÍTICAS NÃO-RECURSIVAS PARA classes
-- =========================================================================

RAISE NOTICE '';
RAISE NOTICE '🔐 Criando políticas NÃO-RECURSIVAS para classes...';

-- SELECT: Criador OU membro da turma (via function)
CREATE POLICY "classes_select_final"
ON public.classes
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM class_members
    WHERE class_members.class_id = classes.id
    AND class_members.user_id = auth.uid()
    AND class_members.deleted_at IS NULL
  )
);

-- INSERT: Apenas o próprio usuário pode criar turmas para si
CREATE POLICY "classes_insert_final"
ON public.classes
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

-- UPDATE: Apenas criador pode atualizar
CREATE POLICY "classes_update_final"
ON public.classes
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
);

-- DELETE: Apenas criador pode deletar (soft delete)
CREATE POLICY "classes_delete_final"
ON public.classes
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
);

RAISE NOTICE '✅ Políticas de classes criadas';

-- =========================================================================
-- PASSO 7: GARANTIR ÍNDICES PARA PERFORMANCE
-- =========================================================================

RAISE NOTICE '';
RAISE NOTICE '⚡ Garantindo índices...';

CREATE INDEX IF NOT EXISTS idx_class_members_user_id_final
ON public.class_members (user_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_class_members_class_id_final
ON public.class_members (class_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_classes_created_by_final
ON public.classes (created_by)
WHERE deleted_at IS NULL;

RAISE NOTICE '✅ Índices criados';

-- =========================================================================
-- PASSO 8: REABILITAR RLS
-- =========================================================================

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '';
RAISE NOTICE '✅ RLS reabilitado';

-- =========================================================================
-- PASSO 9: VALIDAÇÃO FINAL
-- =========================================================================

DO $$
DECLARE
  cm_policies_count INTEGER;
  classes_policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cm_policies_count
  FROM pg_policies
  WHERE tablename = 'class_members' AND schemaname = 'public';
  
  SELECT COUNT(*) INTO classes_policies_count
  FROM pg_policies
  WHERE tablename = 'classes' AND schemaname = 'public';
  
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE '✅ CORREÇÃO COMPLETA!';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumo:';
  RAISE NOTICE '  • Políticas em class_members: % (esperado: 4)', cm_policies_count;
  RAISE NOTICE '  • Políticas em classes: % (esperado: 4)', classes_policies_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Políticas criadas:';
  RAISE NOTICE '  class_members:';
  RAISE NOTICE '    ✓ class_members_select_final';
  RAISE NOTICE '    ✓ class_members_insert_final';
  RAISE NOTICE '    ✓ class_members_update_final';
  RAISE NOTICE '    ✓ class_members_delete_final';
  RAISE NOTICE '  classes:';
  RAISE NOTICE '    ✓ classes_select_final';
  RAISE NOTICE '    ✓ classes_insert_final';
  RAISE NOTICE '    ✓ classes_update_final';
  RAISE NOTICE '    ✓ classes_delete_final';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ATENÇÃO: A policy classes_select_final REFERENCIA class_members,';
  RAISE NOTICE '   mas isso é SEGURO porque class_members NÃO referencia classes';
  RAISE NOTICE '   de volta (quebra o ciclo de recursão).';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Teste no frontend para confirmar que queries funcionam!';
  RAISE NOTICE '==========================================================';
END $$;
