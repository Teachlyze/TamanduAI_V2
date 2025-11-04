-- Verificar políticas atuais de class_members e classes
-- para identificar o problema de recursão infinita

-- Políticas de class_members
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_clause,
  with_check
FROM pg_policies
WHERE tablename IN ('class_members', 'classes')
ORDER BY tablename, policyname;

-- Verificar se há políticas que referenciam class_members dentro de class_members
SELECT 
  policyname,
  pg_get_expr(polqual, polrelid) AS using_definition,
  pg_get_expr(polwithcheck, polrelid) AS with_check_definition
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname IN ('class_members', 'classes')
ORDER BY c.relname, policyname;
