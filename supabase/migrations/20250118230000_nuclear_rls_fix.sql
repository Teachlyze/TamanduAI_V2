-- =====================================================
-- Migration: Nuclear RLS Fix (Solução Definitiva)
-- Description: Desabilita RLS, limpa tudo, recria zero
-- Author: TamanduAI Team
-- Date: 2025-01-18 23:00
-- =====================================================

-- ============================================================
-- STEP 1: DESABILITAR RLS TEMPORARIAMENTE
-- ============================================================

ALTER TABLE IF EXISTS public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gamification_profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: DELETAR TODAS POLÍTICAS EXISTENTES
-- ============================================================

DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Deletar policies de classes
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'classes'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.classes CASCADE', pol.policyname);
    END LOOP;

    -- Deletar policies de class_members
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'class_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.class_members CASCADE', pol.policyname);
    END LOOP;

    -- Deletar policies de activities
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'activities'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.activities CASCADE', pol.policyname);
    END LOOP;

    -- Deletar policies de submissions
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'submissions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.submissions CASCADE', pol.policyname);
    END LOOP;

    -- Deletar policies de calendar_events
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'calendar_events'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.calendar_events CASCADE', pol.policyname);
    END LOOP;

    -- Deletar policies de gamification_profiles
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'gamification_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.gamification_profiles CASCADE', pol.policyname);
    END LOOP;

    RAISE NOTICE 'Todas políticas deletadas com sucesso';
END $$;

-- ============================================================
-- STEP 3: CRIAR TABELAS FALTANTES
-- ============================================================

-- Tabela question_bank
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id),
  school_id UUID,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
  options JSONB,
  correct_answer TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  subject TEXT,
  topic TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  uses_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela missions
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  class_id UUID,
  created_by UUID REFERENCES public.profiles(id),
  xp_reward INTEGER DEFAULT 0,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 4: CORRIGIR SCHEMA DE TABELAS EXISTENTES
-- ============================================================

-- Garantir full_name em profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name'
    ) THEN
      ALTER TABLE public.profiles RENAME COLUMN name TO full_name;
    ELSE
      ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
  END IF;
END $$;

-- Garantir colunas em gamification_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gamification_profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.gamification_profiles ADD COLUMN user_id UUID REFERENCES public.profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gamification_profiles' AND column_name = 'level'
  ) THEN
    ALTER TABLE public.gamification_profiles ADD COLUMN level INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gamification_profiles' AND column_name = 'total_xp'
  ) THEN
    ALTER TABLE public.gamification_profiles ADD COLUMN total_xp INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'gamification_profiles' AND column_name = 'current_streak'
  ) THEN
    ALTER TABLE public.gamification_profiles ADD COLUMN current_streak INTEGER DEFAULT 0;
  END IF;
END $$;

-- Adicionar activity_id em activities se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'class_id'
  ) THEN
    ALTER TABLE public.activities ADD COLUMN class_id UUID;
  END IF;
END $$;

-- ============================================================
-- STEP 5: CRIAR POLÍTICAS ULTRA-SIMPLES (SEM RECURSÃO)
-- ============================================================

-- ========================
-- CLASSES
-- ========================

-- Professores veem/editam suas próprias turmas
CREATE POLICY "classes_owner_all"
  ON public.classes
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ========================
-- CLASS_MEMBERS
-- ========================

-- Usuários veem seus próprios registros
CREATE POLICY "class_members_self"
  ON public.class_members
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================
-- ACTIVITIES
-- ========================

-- Professores veem suas atividades
CREATE POLICY "activities_owner"
  ON public.activities
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ========================
-- SUBMISSIONS
-- ========================

-- Alunos veem suas submissões
CREATE POLICY "submissions_student"
  ON public.submissions
  FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Professores veem submissões de suas atividades
CREATE POLICY "submissions_teacher"
  ON public.submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = submissions.activity_id
      AND a.created_by = auth.uid()
    )
  );

-- ========================
-- CALENDAR_EVENTS
-- ========================

-- Criador vê seus eventos
CREATE POLICY "calendar_owner"
  ON public.calendar_events
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ========================
-- GAMIFICATION_PROFILES
-- ========================

-- Usuários veem seu próprio perfil
CREATE POLICY "gamification_self"
  ON public.gamification_profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================
-- QUESTION_BANK
-- ========================

-- Autor vê suas questões
CREATE POLICY "questions_owner"
  ON public.question_bank
  FOR ALL
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Questões aprovadas são públicas
CREATE POLICY "questions_approved_public"
  ON public.question_bank
  FOR SELECT
  USING (status = 'approved');

-- ========================
-- MISSIONS
-- ========================

-- Criador vê suas missões
CREATE POLICY "missions_owner"
  ON public.missions
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================
-- STEP 6: REABILITAR RLS
-- ============================================================

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 7: CRIAR ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_classes_created_by ON public.classes(created_by);
CREATE INDEX IF NOT EXISTS idx_class_members_user_id ON public.class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON public.class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON public.activities(created_by);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_activity_id ON public.submissions(activity_id);
CREATE INDEX IF NOT EXISTS idx_gamification_user_id ON public.gamification_profiles(user_id);

-- ============================================================
-- STEP 8: COMENTÁRIOS
-- ============================================================

COMMENT ON POLICY "classes_owner_all" ON public.classes IS 'Professores gerenciam suas turmas';
COMMENT ON POLICY "class_members_self" ON public.class_members IS 'Usuários veem seus registros';
COMMENT ON POLICY "activities_owner" ON public.activities IS 'Professores gerenciam atividades';
COMMENT ON POLICY "submissions_student" ON public.submissions IS 'Alunos veem suas submissões';
COMMENT ON POLICY "submissions_teacher" ON public.submissions IS 'Professores veem submissões';
COMMENT ON POLICY "gamification_self" ON public.gamification_profiles IS 'Perfil próprio';

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration concluída: RLS limpo e recriado com sucesso';
END $$;
