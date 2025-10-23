-- Create gamification_profiles table
CREATE TABLE IF NOT EXISTS public.gamification_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  xp_total INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_gamification_profiles_user_id ON public.gamification_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_profiles_xp_total ON public.gamification_profiles(xp_total DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_profiles_level ON public.gamification_profiles(level DESC);

-- RLS Policies (safe, no recursion)
ALTER TABLE public.gamification_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own gamification profile
CREATE POLICY "gamification_profiles_read_own"
  ON public.gamification_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own gamification profile
CREATE POLICY "gamification_profiles_update_own"
  ON public.gamification_profiles
  FOR UPDATE
  USING (user_id = auth.uid());

-- System can insert gamification profiles (for new users)
CREATE POLICY "gamification_profiles_insert_system"
  ON public.gamification_profiles
  FOR INSERT
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_gamification_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gamification_profiles_updated_at
  BEFORE UPDATE ON public.gamification_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gamification_profiles_updated_at();

-- Comment
COMMENT ON TABLE public.gamification_profiles IS 'Gamification profiles for users with XP, levels, and streaks';
