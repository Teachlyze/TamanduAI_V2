-- ============================================================================
-- FIX: Coluna CPF na tabela profiles
-- ============================================================================
-- Problema: CPF pode não estar salvando por RLS incorreto
-- Solução: Garantir que coluna existe, tipo correto e permissões adequadas
-- NOTA: View profiles_with_age depende de profiles.cpf, então precisamos 
--       dropar e recriar ela se precisar alterar tipo
-- ============================================================================

-- 1. Verificar se coluna cpf existe e seu tipo atual
DO $$
DECLARE
  col_type TEXT;
BEGIN
  -- Verificar tipo atual da coluna cpf
  SELECT data_type INTO col_type
  FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'cpf';
  
  IF col_type IS NULL THEN
    -- Coluna não existe, criar
    ALTER TABLE profiles ADD COLUMN cpf TEXT;
    RAISE NOTICE '✅ Coluna cpf criada como TEXT';
  ELSIF col_type != 'text' THEN
    -- Coluna existe mas tipo está errado, precisa dropar view, alterar e recriar
    RAISE NOTICE 'ℹ️  Coluna cpf existe como %, precisa converter para TEXT', col_type;
    
    -- Dropar view temporariamente
    DROP VIEW IF EXISTS profiles_with_age CASCADE;
    RAISE NOTICE '   → View profiles_with_age dropada temporariamente';
    
    -- Alterar tipo
    ALTER TABLE profiles ALTER COLUMN cpf TYPE TEXT;
    RAISE NOTICE '   → Coluna cpf convertida para TEXT';
    
    -- Recriar view (baseado em 20250122002000_fix_all_schema_issues.sql)
    CREATE OR REPLACE VIEW profiles_with_age AS
    SELECT 
      p.*,
      calculate_age(p.birth_date) as calculated_age
    FROM profiles p;
    RAISE NOTICE '   → View profiles_with_age recriada';
    
  ELSE
    RAISE NOTICE '✅ Coluna cpf já existe como TEXT';
  END IF;
END $$;

-- 2. Criar índice para buscas por CPF (performance)
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf);

-- 4. Remover políticas antigas relacionadas ao CPF (se existirem)
DROP POLICY IF EXISTS "Users can update their own cpf" ON profiles;
DROP POLICY IF EXISTS "Users can read their own cpf" ON profiles;

-- 5. Criar política para permitir usuários atualizarem seu próprio CPF
CREATE POLICY "Users can update their own profile including cpf"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Criar política para leitura (se ainda não existir uma genérica)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can read their own profile'
  ) THEN
    CREATE POLICY "Users can read their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);
    RAISE NOTICE 'Política de leitura criada';
  ELSE
    RAISE NOTICE 'Política de leitura já existe';
  END IF;
END $$;

-- ============================================================================
-- VALIDAÇÃO: Verificar se tudo está correto
-- ============================================================================

-- Verificar coluna
DO $$
DECLARE
  col_exists BOOLEAN;
  col_type TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'cpf'
  ) INTO col_exists;
  
  SELECT data_type INTO col_type
  FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'cpf';
  
  IF col_exists THEN
    RAISE NOTICE '✅ Coluna cpf existe e é do tipo: %', col_type;
  ELSE
    RAISE WARNING '❌ Coluna cpf NÃO foi criada';
  END IF;
END $$;

-- Verificar índice
DO $$
DECLARE
  idx_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_profiles_cpf'
  ) INTO idx_exists;
  
  IF idx_exists THEN
    RAISE NOTICE '✅ Índice idx_profiles_cpf existe';
  ELSE
    RAISE WARNING '❌ Índice NÃO foi criado';
  END IF;
END $$;

-- Verificar políticas RLS
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'profiles' 
  AND policyname LIKE '%profile%';
  
  RAISE NOTICE '✅ Total de políticas relacionadas a profile: %', policy_count;
END $$;

-- ============================================================================
-- TESTE MANUAL (Executar APÓS fazer login na aplicação)
-- ============================================================================

-- 1. Testar leitura do CPF
-- SELECT id, full_name, cpf FROM profiles WHERE id = auth.uid();

-- 2. Testar update do CPF
-- UPDATE profiles SET cpf = '12345678910' WHERE id = auth.uid();

-- 3. Verificar se salvou
-- SELECT id, full_name, cpf FROM profiles WHERE id = auth.uid();

-- Se qualquer um dos testes acima falhar, verificar:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 0. VIEW profiles_with_age:
--    Esta view foi criada em 20250122002000_fix_all_schema_issues.sql
--    Ela faz SELECT p.* de profiles, então qualquer ALTER TYPE de coluna
--    requer dropar e recriar a view. Esta migration faz isso automaticamente.

-- 1. Esta migration é IDEMPOTENTE - pode ser executada múltiplas vezes sem problemas

-- 2. O CPF é armazenado sem máscara (apenas números: 12345678910)
--    A máscara é aplicada apenas no frontend

-- 3. Não há validação de CPF no banco de dados - isso é feito no frontend
--    Se quiser adicionar validação no BD:
--    ALTER TABLE profiles ADD CONSTRAINT cpf_length_check 
--    CHECK (cpf IS NULL OR LENGTH(cpf) = 11);

-- 4. O CPF não é UNIQUE por design - múltiplos usuários podem ter o mesmo CPF
--    (ex: conta de teste, alunos usando CPF dos pais, etc.)
--    Se quiser tornar UNIQUE:
--    ALTER TABLE profiles ADD CONSTRAINT cpf_unique UNIQUE (cpf);

-- 5. Para reverter (NÃO RECOMENDADO):
--    DROP INDEX IF EXISTS idx_profiles_cpf;
--    DROP POLICY IF EXISTS "Users can update their own profile including cpf" ON profiles;
--    ALTER TABLE profiles DROP COLUMN IF EXISTS cpf;

-- ============================================================================
-- COMO APLICAR ESTA MIGRATION
-- ============================================================================

-- Opção 1: Supabase Dashboard
-- 1. Acesse o projeto no Supabase Dashboard
-- 2. Vá em SQL Editor
-- 3. Cole todo este código
-- 4. Execute

-- Opção 2: Supabase CLI
-- cd TamanduAI_V2
-- supabase db push

-- ============================================================================
-- VERIFICAÇÃO PÓS-APLICAÇÃO
-- ============================================================================

-- Execute isto para confirmar que tudo está OK:
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'cpf';

-- Deve retornar:
-- column_name | data_type | is_nullable
-- ------------|-----------|-------------
-- cpf         | text      | YES
