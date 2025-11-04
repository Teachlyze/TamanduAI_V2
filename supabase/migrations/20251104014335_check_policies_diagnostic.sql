-- DIAGNÓSTICO: Verificar políticas atuais para identificar recursão infinita
-- Esta migration apenas faz diagnóstico, não modifica nada

DO $$
DECLARE
  pol RECORD;
  found_recursion BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNÓSTICO DE POLÍTICAS RLS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  RAISE NOTICE '📋 Políticas em class_members:';
  RAISE NOTICE '';
  
  FOR pol IN 
    SELECT 
      policyname,
      cmd,
      pg_get_expr(polqual, polrelid) AS using_def,
      pg_get_expr(polwithcheck, polrelid) AS check_def
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'class_members'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  Policy: %', pol.policyname;
    RAISE NOTICE '    Command: %', pol.cmd;
    RAISE NOTICE '    USING: %', COALESCE(pol.using_def, 'NULL');
    RAISE NOTICE '    WITH CHECK: %', COALESCE(pol.check_def, 'NULL');
    
    -- Verificar se há referência a class_members na própria policy
    IF pol.using_def LIKE '%class_members%' OR pol.check_def LIKE '%class_members%' THEN
      RAISE WARNING '    ⚠️  RECURSÃO DETECTADA: Esta policy referencia class_members!';
      found_recursion := TRUE;
    END IF;
    
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '📋 Políticas em classes:';
  RAISE NOTICE '';
  
  FOR pol IN 
    SELECT 
      policyname,
      cmd,
      pg_get_expr(polqual, polrelid) AS using_def,
      pg_get_expr(polwithcheck, polrelid) AS check_def
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'classes'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  Policy: %', pol.policyname;
    RAISE NOTICE '    Command: %', pol.cmd;
    RAISE NOTICE '    USING: %', COALESCE(pol.using_def, 'NULL');
    RAISE NOTICE '    WITH CHECK: %', COALESCE(pol.check_def, 'NULL');
    
    -- Verificar se há referência circular a class_members
    IF pol.using_def LIKE '%class_members%' OR pol.check_def LIKE '%class_members%' THEN
      RAISE NOTICE '    ℹ️  Esta policy referencia class_members';
    END IF;
    
    RAISE NOTICE '';
  END LOOP;
  
  IF found_recursion THEN
    RAISE WARNING '========================================';
    RAISE WARNING '⚠️  RECURSÃO INFINITA DETECTADA!';
    RAISE WARNING '========================================';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Nenhuma recursão óbvia detectada';
    RAISE NOTICE '========================================';
  END IF;
END $$;
