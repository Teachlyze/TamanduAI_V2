-- ============================================================================
-- FIX: RLS Policy for class_members table
-- ============================================================================
-- Problema: Erro 406 ao verificar permissão de membro da turma
-- Causa: Falta de política RLS para permitir usuários verificarem sua própria membership
-- Solução: Criar política que permite usuários lerem seus próprios registros
-- ============================================================================

-- 1. Habilitar RLS na tabela class_members (se ainda não estiver)
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;

-- 2. Remover política antiga se existir
DROP POLICY IF EXISTS "Users can view their own memberships" ON class_members;
DROP POLICY IF EXISTS "Users can check their own membership" ON class_members;
DROP POLICY IF EXISTS "Members can view class membership" ON class_members;

-- 3. Criar política para permitir usuários visualizarem suas próprias memberships
CREATE POLICY "Users can view their own class memberships"
ON class_members FOR SELECT
USING (auth.uid() = user_id);

-- 4. Criar política para permitir professores visualizarem membros de suas turmas
CREATE POLICY "Teachers can view their class members"
ON class_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM class_members AS cm
    WHERE cm.class_id = class_members.class_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'teacher'
  )
);

-- 5. Criar política para permitir professores adicionarem membros
CREATE POLICY "Teachers can insert class members"
ON class_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM class_members AS cm
    WHERE cm.class_id = class_members.class_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'teacher'
  )
);

-- 6. Criar política para permitir professores removerem membros
CREATE POLICY "Teachers can delete class members"
ON class_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM class_members AS cm
    WHERE cm.class_id = class_members.class_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'teacher'
  )
);

-- 7. Criar política para permitir usuários atualizarem seus próprios registros (ex: arquivar turma)
CREATE POLICY "Users can update their own memberships"
ON class_members FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. Criar política para permitir alunos se adicionarem a turmas públicas (join by invite code)
CREATE POLICY "Students can join classes via invite"
ON class_members FOR INSERT
WITH CHECK (
  role = 'student' 
  AND user_id = auth.uid()
);

-- ============================================================================
-- VERIFICAÇÃO: Consultas que devem funcionar após aplicar estas políticas
-- ============================================================================

-- ✅ Aluno verificando se é membro de uma turma:
-- SELECT id FROM class_members 
-- WHERE class_id = 'xxx' AND user_id = auth.uid();

-- ✅ Professor vendo membros de sua turma:
-- SELECT * FROM class_members 
-- WHERE class_id = 'xxx';

-- ✅ Aluno arquivando turma:
-- UPDATE class_members 
-- SET is_archived = true 
-- WHERE class_id = 'xxx' AND user_id = auth.uid();

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. Esta migration corrige o erro 406 permitindo que usuários leiam
--    seus próprios registros de membership

-- 2. As políticas são cumulativas - múltiplas políticas podem permitir
--    acesso ao mesmo recurso

-- 3. Para aplicar no Supabase:
--    - Via Dashboard: SQL Editor > Execute SQL
--    - Via CLI: supabase db push

-- 4. Para reverter (NÃO RECOMENDADO em produção):
--    DROP POLICY IF EXISTS "Users can view their own class memberships" ON class_members;
--    DROP POLICY IF EXISTS "Teachers can view their class members" ON class_members;
--    DROP POLICY IF EXISTS "Teachers can insert class members" ON class_members;
--    DROP POLICY IF EXISTS "Teachers can delete class members" ON class_members;
--    DROP POLICY IF EXISTS "Users can update their own memberships" ON class_members;
--    DROP POLICY IF EXISTS "Students can join classes via invite" ON class_members;
