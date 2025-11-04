-- ================================================
-- FIX: Políticas RLS para Upload de Avatars
-- ================================================
-- Data: 04/11/2025
-- Descrição: Corrigir erro 403 ao fazer upload de avatar
-- ================================================

-- 1. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários podem fazer upload do próprio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars públicos para leitura" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;

-- 2. Criar política para INSERT (upload)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Criar política para UPDATE (substituir avatar)
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Criar política para DELETE (remover avatar antigo)
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Criar política para SELECT (acesso público aos avatars)
CREATE POLICY "Public avatar access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 6. Verificar se a bucket 'avatars' existe e é pública
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';

-- 7. Verificar políticas criadas
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
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- ================================================
-- RESULTADO ESPERADO:
-- ================================================
-- ✅ Política INSERT: Permite upload na pasta auth.uid()
-- ✅ Política UPDATE: Permite atualizar próprios arquivos
-- ✅ Política DELETE: Permite deletar próprios arquivos
-- ✅ Política SELECT: Acesso público para leitura
-- ✅ Bucket pública para URLs públicas
-- ================================================

-- ================================================
-- ESTRUTURA DE PASTAS:
-- ================================================
-- avatars/
--   └── {user_id}/
--       ├── 1730685600000.png
--       ├── 1730685700000.jpg
--       └── ...
-- ================================================

-- ================================================
-- TESTE:
-- ================================================
-- 1. Fazer upload de um avatar
-- 2. Verificar se o arquivo está em avatars/{user_id}/timestamp.ext
-- 3. Verificar se a URL pública funciona
-- 4. Tentar acessar a URL em modo anônimo
-- ================================================
