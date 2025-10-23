-- ============================================
-- FIX SCHEMA CRÍTICO - Colunas e Tabelas Faltantes
-- Data: 20/01/2025
-- ============================================

-- 1. ADICIONAR total_points em activities (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE activities ADD COLUMN total_points INTEGER DEFAULT 100;
    COMMENT ON COLUMN activities.total_points IS 'Pontuação máxima da atividade';
  END IF;
END $$;

-- 2. ADICIONAR created_by em class_invitations (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_invitations' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE class_invitations ADD COLUMN created_by UUID REFERENCES profiles(id);
    COMMENT ON COLUMN class_invitations.created_by IS 'Quem criou o convite';
  END IF;
END $$;

-- 3. CRIAR gamification_profiles se não existir
CREATE TABLE IF NOT EXISTS gamification_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_level_xp INTEGER DEFAULT 0,
  next_level_xp INTEGER DEFAULT 100,
  badges JSONB DEFAULT '[]'::jsonb,
  achievements JSONB DEFAULT '[]'::jsonb,
  streak_days INTEGER DEFAULT 0,
  last_activity_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_gamification_profiles_user_id ON gamification_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_profiles_total_xp ON gamification_profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_profiles_level ON gamification_profiles(level DESC);

-- 4. RLS para gamification_profiles
ALTER TABLE gamification_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gamification_profiles_read" ON gamification_profiles;
CREATE POLICY "gamification_profiles_read" ON gamification_profiles
  FOR SELECT USING (true); -- Todos podem ver rankings

DROP POLICY IF EXISTS "gamification_profiles_own" ON gamification_profiles;
CREATE POLICY "gamification_profiles_own" ON gamification_profiles
  FOR ALL
  USING (user_id = auth.uid());

-- 5. Trigger para updated_at
DROP TRIGGER IF EXISTS update_gamification_profiles_updated_at ON gamification_profiles;
CREATE TRIGGER update_gamification_profiles_updated_at
  BEFORE UPDATE ON gamification_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. CRIAR foreign key activities -> classes via activity_class_assignments
-- Isso permite fazer .select('*,classes(*)') via assignments

-- Verificar se já existe índice
CREATE INDEX IF NOT EXISTS idx_activity_class_assignments_activity_id 
  ON activity_class_assignments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_class_assignments_class_id 
  ON activity_class_assignments(class_id);

-- 7. COMENTÁRIOS para documentação
COMMENT ON TABLE gamification_profiles IS 'Perfis de gamificação dos usuários com XP, nível e badges';
COMMENT ON COLUMN activities.total_points IS 'Pontuação máxima da atividade (padrão 100)';
COMMENT ON COLUMN class_invitations.created_by IS 'UUID do usuário que criou o convite';

-- 8. REFRESH do schema cache (força Supabase recarregar)
NOTIFY pgrst, 'reload schema';
