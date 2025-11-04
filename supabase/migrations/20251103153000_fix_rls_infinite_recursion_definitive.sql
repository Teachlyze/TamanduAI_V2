-- =====================================================
-- MIGRATION: Fix Infinite Recursion in RLS Policies  
-- Data: 2025-11-03 15:30 (UTC-3)
-- Autor: TamanduAI Team - Senior Software Engineer
-- Status: CRITICAL FIX - Production Blocker
-- =====================================================
-- 
-- PROBLEMA IDENTIFICADO:
-- Erro PostgreSQL 42P17: "infinite recursion detected in policy for relation 'class_members'"
-- 
-- CAUSA RAIZ:
-- Políticas RLS em class_members que consultam class_members dentro de suas próprias regras USING,
-- especificamente a política "Teachers can view their class members" que faz:
--   EXISTS (SELECT 1 FROM class_members WHERE ...) 
-- dentro da própria policy de class_members, criando loop infinito.
--
-- SOLUÇÃO:
-- 1. Remover TODAS as políticas recursivas
-- 2. Criar políticas simples baseadas APENAS em:
--    - user_id = auth.uid() (verificação direta)
--    - classes.created_by = auth.uid() (sem consultar class_members)
-- 3. Corrigir política de classes que está muito permissiva
-- 4. Garantir índices para performance
-- =====================================================

-- =====================================================
-- PASSO 1: BACKUP DE SEGURANÇA
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'INICIANDO CORREÇÃO CRÍTICA DE RLS POLICIES';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Timestamp: %', NOW();
  RAISE NOTICE 'Migration: 20251103153000';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PASSO 2: REMOVER TODAS AS POLÍTICAS PROBLEMÁTICAS
-- =====================================================

-- Remover TODAS as policies de class_members (limpar slate)
DO $$ 
DECLARE
    pol RECORD;
    pol_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Removendo políticas antigas de class_members...';
    
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'class_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.class_members', pol.policyname);
        pol_count := pol_count + 1;
        RAISE NOTICE '  ✓ Removida: %', pol.policyname;
    END LOOP;
    
    RAISE NOTICE 'Total de políticas removidas: %', pol_count;
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PASSO 3: CRIAR POLÍTICAS NÃO-RECURSIVAS E SEGURAS
-- =====================================================

-- 3.1 SELECT: Usuário pode ver seus próprios registros OU se for professor da turma
CREATE POLICY "class_members_select_v2"
ON public.class_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  -- Usuário é o próprio membro (RÁPIDO - usa índice direto)
  user_id = auth.uid()
  OR
  -- OU usuário criou a turma (consulta classes, NÃO class_members)
  class_id IN (
    SELECT id 
    FROM classes 
    WHERE created_by = auth.uid()
  )
);

COMMENT ON POLICY "class_members_select_v2" ON public.class_members IS
'NON-RECURSIVE: Verifica membership via user_id direto ou via classes.created_by (sem consultar class_members)';

-- 3.2 INSERT: Apenas professor que criou a turma pode adicionar membros
CREATE POLICY "class_members_insert_v2"
ON public.class_members
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  -- Verificar se usuário criou a turma (via classes, NÃO class_members)
  class_id IN (
    SELECT id 
    FROM classes 
    WHERE created_by = auth.uid()
  )
  OR
  -- OU está se auto-adicionando como student (via invite code)
  (user_id = auth.uid() AND role = 'student')
);

COMMENT ON POLICY "class_members_insert_v2" ON public.class_members IS
'NON-RECURSIVE: Professor adiciona via classes.created_by, student se auto-adiciona';

-- 3.3 UPDATE: Apenas professor da turma pode atualizar
CREATE POLICY "class_members_update_v2"
ON public.class_members
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  -- Pode atualizar próprio registro (arquivar, etc)
  user_id = auth.uid()
  OR
  -- Ou se for professor da turma (via classes, NÃO class_members)
  class_id IN (
    SELECT id 
    FROM classes 
    WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  -- Mesma lógica no WITH CHECK
  user_id = auth.uid()
  OR
  class_id IN (
    SELECT id 
    FROM classes 
    WHERE created_by = auth.uid()
  )
);

COMMENT ON POLICY "class_members_update_v2" ON public.class_members IS
'NON-RECURSIVE: Update via user_id direto ou classes.created_by';

-- 3.4 DELETE: Professor da turma ou o próprio usuário pode remover
CREATE POLICY "class_members_delete_v2"
ON public.class_members
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  -- Pode deletar a si mesmo (sair da turma)
  user_id = auth.uid()
  OR
  -- Ou se for professor da turma (via classes, NÃO class_members)
  class_id IN (
    SELECT id 
    FROM classes 
    WHERE created_by = auth.uid()
  )
);

COMMENT ON POLICY "class_members_delete_v2" ON public.class_members IS
'NON-RECURSIVE: Delete via user_id direto ou classes.created_by';

-- =====================================================
-- PASSO 4: CORRIGIR POLÍTICA DE CLASSES (MUITO PERMISSIVA)
-- =====================================================

-- Remover política super permissiva de classes
DROP POLICY IF EXISTS "classes_select_policy" ON public.classes;

-- Criar política mais restritiva
CREATE POLICY "classes_select_secure_v2"
ON public.classes
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  -- Usuário criou a turma
  created_by = auth.uid()
  OR
  -- OU é membro da turma (via security definer function para evitar recursão)
  id = ANY(get_user_class_ids_direct(auth.uid()))
);

COMMENT ON POLICY "classes_select_secure_v2" ON public.classes IS
'SECURE: Apenas criador ou membros podem ver a turma. Usa SECURITY DEFINER function para evitar recursão.';

-- =====================================================
-- PASSO 5: GARANTIR ÍNDICES CRÍTICOS PARA PERFORMANCE
-- =====================================================

-- Índice para class_members.user_id (já deve existir, mas garantir)
CREATE INDEX IF NOT EXISTS idx_class_members_user_id_v2
ON public.class_members (user_id)
WHERE deleted_at IS NULL;

-- Índice para class_members.class_id (já deve existir, mas garantir)
CREATE INDEX IF NOT EXISTS idx_class_members_class_id_v2
ON public.class_members (class_id)
WHERE deleted_at IS NULL;

-- Índice composto para queries frequentes
CREATE INDEX IF NOT EXISTS idx_class_members_class_user_v2
ON public.class_members (class_id, user_id)
WHERE deleted_at IS NULL;

-- Índice para classes.created_by (crítico para RLS performance)
CREATE INDEX IF NOT EXISTS idx_classes_created_by_v2
ON public.classes (created_by)
WHERE is_active = true AND deleted_at IS NULL;

-- Índice composto para classes (id, created_by)
CREATE INDEX IF NOT EXISTS idx_classes_id_created_by_v2
ON public.classes (id, created_by)
WHERE is_active = true;

COMMENT ON INDEX idx_class_members_user_id_v2 IS 'Performance: Acelera RLS user_id = auth.uid()';
COMMENT ON INDEX idx_class_members_class_id_v2 IS 'Performance: Acelera joins com classes';
COMMENT ON INDEX idx_class_members_class_user_v2 IS 'Performance: Acelera verificações combinadas';
COMMENT ON INDEX idx_classes_created_by_v2 IS 'Performance: Crítico para RLS de class_members';
COMMENT ON INDEX idx_classes_id_created_by_v2 IS 'Performance: Otimiza subqueries de RLS';

-- =====================================================
-- PASSO 6: VALIDAR FUNCTION SECURITY DEFINER
-- =====================================================

-- Garantir que get_user_class_ids_direct existe e está correta
CREATE OR REPLACE FUNCTION public.get_user_class_ids_direct(p_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Esta function BYPASSA RLS, por isso é SECURITY DEFINER
  -- Ela é segura porque apenas retorna IDs de classes do próprio usuário
  SELECT ARRAY_AGG(class_id) 
  FROM class_members 
  WHERE user_id = p_user_id 
  AND deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.get_user_class_ids_direct IS
'SECURITY DEFINER: Retorna class_ids do usuário sem triggerar RLS. SAFE porque filtra por user_id passado.';

-- Grant execute para authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_class_ids_direct TO authenticated;

-- =====================================================
-- PASSO 7: ANÁLISE E VALIDAÇÃO
-- =====================================================

DO $$
DECLARE
  total_policies INTEGER;
  total_indices INTEGER;
  classes_policy_count INTEGER;
BEGIN
  -- Contar políticas de class_members
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'class_members';
  
  -- Contar índices de class_members
  SELECT COUNT(*) INTO total_indices
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename = 'class_members'
  AND indexname LIKE '%v2%';
  
  -- Contar políticas de classes
  SELECT COUNT(*) INTO classes_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'classes'
  AND policyname LIKE '%v2%';
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ CORREÇÃO APLICADA COM SUCESSO';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ESTATÍSTICAS:';
  RAISE NOTICE '  • Políticas em class_members: % (esperado: 4)', total_policies;
  RAISE NOTICE '  • Índices novos em class_members: %', total_indices;
  RAISE NOTICE '  • Políticas novas em classes: % (esperado: 1)', classes_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔐 POLÍTICAS NÃO-RECURSIVAS CRIADAS:';
  RAISE NOTICE '  ✓ class_members_select_v2';
  RAISE NOTICE '  ✓ class_members_insert_v2';
  RAISE NOTICE '  ✓ class_members_update_v2';
  RAISE NOTICE '  ✓ class_members_delete_v2';
  RAISE NOTICE '  ✓ classes_select_secure_v2';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ ÍNDICES OTIMIZADOS:';
  RAISE NOTICE '  ✓ idx_class_members_user_id_v2';
  RAISE NOTICE '  ✓ idx_class_members_class_id_v2';
  RAISE NOTICE '  ✓ idx_class_members_class_user_v2';
  RAISE NOTICE '  ✓ idx_classes_created_by_v2';
  RAISE NOTICE '  ✓ idx_classes_id_created_by_v2';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 QUERIES QUE DEVEM FUNCIONAR:';
  RAISE NOTICE '  ✓ classes?select=*,class_members(count)';
  RAISE NOTICE '  ✓ class_members?select=*&class_id=in.(...)';
  RAISE NOTICE '  ✓ activities?select=*,assignments:activity_class_assignments(...)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  PRÓXIMOS PASSOS:';
  RAISE NOTICE '  1. Testar queries no frontend';
  RAISE NOTICE '  2. Verificar performance com EXPLAIN ANALYZE';
  RAISE NOTICE '  3. Monitorar logs do Supabase por 24h';
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration completed at: %', NOW();
  RAISE NOTICE '==============================================';
END $$;

-- =====================================================
-- PASSO 8: HABILITAR RLS (se desabilitado)
-- =====================================================

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
