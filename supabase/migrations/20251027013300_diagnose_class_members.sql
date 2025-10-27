-- ================================================
-- Diagnóstico: Identificar política RLS problemática
-- Data: 2025-10-27
-- Execute no SQL Editor do Supabase Dashboard
-- ================================================

-- 1. Ver todas as policies ativas em class_members
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'class_members'
ORDER BY policyname;

-- 2. Contar registros na tabela
SELECT 
  'Total de registros em class_members' as info,
  COUNT(*) as total
FROM class_members;

-- 3. Verificar distribuição por role
SELECT 
  role,
  COUNT(*) as total
FROM class_members
GROUP BY role;

-- 4. Testar query simples SEM RLS (como superuser)
-- Esta query vai funcionar rápido se o problema for RLS
SELECT 
  'Teste sem RLS' as teste,
  COUNT(*) as total_registros,
  COUNT(DISTINCT user_id) as usuarios_unicos,
  COUNT(DISTINCT class_id) as turmas_unicas
FROM class_members;

-- 5. Ver índices existentes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'class_members';
