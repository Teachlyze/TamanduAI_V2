-- ============================================
-- VERIFICAR: Tabela meetings existe?
-- Execute no Supabase SQL Editor
-- ============================================

-- Verificar se tabela meetings existe
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE columns.table_name = 'meetings') as column_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'meetings';

-- Se não existir, vamos usar calendar_events
-- Verificar calendar_events
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE columns.table_name = 'calendar_events') as column_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'calendar_events';
