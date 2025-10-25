-- ============================
-- FIX: Adicionar políticas RLS para tabela profiles
-- Problema: RLS está habilitado mas sem políticas = acesso bloqueado
-- ============================

-- 1. Deletar políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

-- 2. Criar política: Usuários podem ver e editar seu próprio profile
CREATE POLICY "profiles_self"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Criar política: Usuários autenticados podem ver profiles de outros (leitura)
-- Necessário para professores verem alunos, etc
CREATE POLICY "profiles_public_read"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Criar índice se não existir (performance)
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 5. Garantir que a função handle_new_user está atualizada
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    cpf,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'cpf',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    -- ✅ FORÇA ATUALIZAÇÃO DO ROLE (não usa COALESCE que mantém o antigo)
    role = EXCLUDED.role,
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 6. Recriar trigger (garantir que está ativo)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Atualizar profiles de usuários existentes com dados do auth.users
-- Isso sincroniza o role do raw_user_meta_data para a tabela profiles
DO $$ 
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data
    FROM auth.users
  LOOP
    UPDATE public.profiles
    SET 
      role = COALESCE(user_record.raw_user_meta_data->>'role', role, 'student'),
      full_name = COALESCE(
        user_record.raw_user_meta_data->>'full_name', 
        user_record.raw_user_meta_data->>'name',
        full_name
      ),
      cpf = COALESCE(user_record.raw_user_meta_data->>'cpf', cpf),
      updated_at = NOW()
    WHERE id = user_record.id;
  END LOOP;
  
  RAISE NOTICE '✅ Profiles sincronizados com auth.users';
END $$;

-- 8. Comentários
COMMENT ON POLICY "profiles_self" ON public.profiles IS 'Usuários gerenciam seu próprio perfil';
COMMENT ON POLICY "profiles_public_read" ON public.profiles IS 'Usuários autenticados podem ver outros perfis (leitura)';

-- 9. Verificar resultado
DO $$ 
DECLARE
  policy_count INTEGER;
  profile_count INTEGER;
BEGIN
  -- Contar políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles';
  
  -- Contar profiles
  SELECT COUNT(*) INTO profile_count
  FROM public.profiles;
  
  RAISE NOTICE '✅ Migration concluída!';
  RAISE NOTICE '   - Políticas RLS em profiles: %', policy_count;
  RAISE NOTICE '   - Total de profiles: %', profile_count;
  RAISE NOTICE '   - Login deve funcionar agora! 🎉';
END $$;
