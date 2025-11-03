-- ============================================
-- STORAGE BUCKETS SETUP INSTRUCTIONS
-- ============================================
-- Este arquivo documenta os buckets necessários para o sistema
-- Os buckets devem ser criados manualmente no Supabase Dashboard
-- em: Storage > Create New Bucket

-- 1. BUCKET: avatars
--    - Name: avatars
--    - Public: Yes (para URLs públicas)
--    - File size limit: 2MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--    - Path: avatars/

-- 2. BUCKET: class-materials  
--    - Name: class-materials
--    - Public: Yes
--    - File size limit: 50MB
--    - Allowed MIME types: application/pdf, image/*, video/*, etc

-- 3. BUCKET: activity-files
--    - Name: activity-files
--    - Public: No (acesso via RLS)
--    - File size limit: 10MB
--    - Allowed MIME types: image/*, application/pdf

-- 4. BUCKET: submissions
--    - Name: submissions  
--    - Public: No (acesso apenas para professor/aluno dono)
--    - File size limit: 25MB

-- NOTA: Após criar os buckets, configure as políticas RLS apropriadas
-- para cada bucket no painel do Supabase Storage.

-- RLS POLICIES RECOMENDADAS:

-- Para 'avatars':
-- Policy: "Users can upload their own avatar"
-- Operation: INSERT
-- Check: auth.uid() = (storage.foldername(name))[1]::uuid

-- Policy: "Users can update their own avatar"  
-- Operation: UPDATE
-- Check: auth.uid() = (storage.foldername(name))[1]::uuid

-- Policy: "Anyone can view avatars"
-- Operation: SELECT
-- Check: true

-- Para outros buckets, criar policies similares conforme necessidade
