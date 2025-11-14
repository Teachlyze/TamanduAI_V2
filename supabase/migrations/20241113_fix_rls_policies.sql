-- ============================================================================
-- FIX RLS POLICIES: Flashcards - Permitir INSERT/UPDATE de card_stats
-- Data: 2024-11-13
-- Problema: "new row violates row-level security policy for table card_stats"
-- ============================================================================

-- 1. Verificar e dropar policies existentes que podem estar conflitando
DROP POLICY IF EXISTS "Users can view their own card stats" ON card_stats;
DROP POLICY IF EXISTS "Users can create their own card stats" ON card_stats;
DROP POLICY IF EXISTS "Users can update their own card stats" ON card_stats;
DROP POLICY IF EXISTS "Users can delete their own card stats" ON card_stats;

-- 2. Criar policies corretas para card_stats
-- SELECT: Ver apenas seus próprios card_stats
CREATE POLICY "Users can view their own card stats"
ON card_stats FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Criar apenas seus próprios card_stats
CREATE POLICY "Users can create their own card stats"
ON card_stats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Atualizar apenas seus próprios card_stats
CREATE POLICY "Users can update their own card stats"
ON card_stats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Deletar apenas seus próprios card_stats (opcional)
CREATE POLICY "Users can delete their own card stats"
ON card_stats FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Verificar e corrigir policies de deck_stats
DROP POLICY IF EXISTS "Users can view their own deck stats" ON deck_stats;
DROP POLICY IF EXISTS "Users can create their own deck stats" ON deck_stats;
DROP POLICY IF EXISTS "Users can update their own deck stats" ON deck_stats;

CREATE POLICY "Users can view their own deck stats"
ON deck_stats FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deck stats"
ON deck_stats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deck stats"
ON deck_stats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Verificar e corrigir policies de cards
DROP POLICY IF EXISTS "Users can view their own cards" ON cards;
DROP POLICY IF EXISTS "Users can create their own cards" ON cards;
DROP POLICY IF EXISTS "Users can update their own cards" ON cards;
DROP POLICY IF EXISTS "Users can delete their own cards" ON cards;

CREATE POLICY "Users can view their own cards"
ON cards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cards"
ON cards FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards"
ON cards FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards"
ON cards FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Verificar e corrigir policies de decks
DROP POLICY IF EXISTS "Users can view their own decks" ON decks;
DROP POLICY IF EXISTS "Users can create their own decks" ON decks;
DROP POLICY IF EXISTS "Users can update their own decks" ON decks;
DROP POLICY IF EXISTS "Users can delete their own decks" ON decks;

CREATE POLICY "Users can view their own decks"
ON decks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own decks"
ON decks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks"
ON decks FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks"
ON decks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 6. Verificar RLS está habilitado
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_stats ENABLE ROW LEVEL SECURITY;

-- 7. Verificar policies criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('cards', 'card_stats', 'decks', 'deck_stats')
ORDER BY tablename, policyname;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- Deve mostrar 4 policies por tabela (SELECT, INSERT, UPDATE, DELETE)
-- Todas usando auth.uid() = user_id
-- ============================================================================
