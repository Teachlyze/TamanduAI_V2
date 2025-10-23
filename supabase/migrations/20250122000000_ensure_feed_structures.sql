-- =====================================================
-- GARANTIR ESTRUTURAS DO FEED
-- =====================================================
-- Versão: 1.1 (safe)
-- Data: 22 de Janeiro de 2025
-- Descrição: Garante que as estruturas do feed existem sem conflitos

-- Adicionar colunas faltantes em class_posts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_posts' AND column_name = 'created_by') THEN
    ALTER TABLE public.class_posts ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_posts' AND column_name = 'link_url') THEN
    ALTER TABLE public.class_posts ADD COLUMN link_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_posts' AND column_name = 'is_scheduled') THEN
    ALTER TABLE public.class_posts ADD COLUMN is_scheduled BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_posts' AND column_name = 'scheduled_for') THEN
    ALTER TABLE public.class_posts ADD COLUMN scheduled_for TIMESTAMPTZ;
  END IF;
END $$;

-- Criar índices apenas se não existirem (skip se já existem)
CREATE INDEX IF NOT EXISTS idx_class_posts_created_by ON public.class_posts(created_by);

-- Garantir que post_views existe
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.class_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON public.post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON public.post_views(user_id);

-- Garantir que post_likes existe
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.class_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

-- Garantir que comment_likes existe
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);

-- Garantir functions de triggers
CREATE OR REPLACE FUNCTION increment_post_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.class_posts
  SET views_count = views_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.class_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.class_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments
    SET likes_count = likes_count - 1
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers se não existirem
DROP TRIGGER IF EXISTS trigger_increment_post_views ON public.post_views;
CREATE TRIGGER trigger_increment_post_views
  AFTER INSERT ON public.post_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_views();

DROP TRIGGER IF EXISTS trigger_post_likes_insert ON public.post_likes;
CREATE TRIGGER trigger_post_likes_insert
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

DROP TRIGGER IF EXISTS trigger_post_likes_delete ON public.post_likes;
CREATE TRIGGER trigger_post_likes_delete
  AFTER DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

DROP TRIGGER IF EXISTS trigger_comment_likes_insert ON public.comment_likes;
CREATE TRIGGER trigger_comment_likes_insert
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_likes_count();

DROP TRIGGER IF EXISTS trigger_comment_likes_delete ON public.comment_likes;
CREATE TRIGGER trigger_comment_likes_delete
  AFTER DELETE ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_likes_count();

-- Function para publicar posts agendados
CREATE OR REPLACE FUNCTION publish_scheduled_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  published_count INTEGER;
BEGIN
  UPDATE public.class_posts
  SET 
    is_scheduled = FALSE,
    scheduled_for = NULL,
    updated_at = NOW()
  WHERE 
    is_scheduled = TRUE 
    AND scheduled_for <= NOW();
  
  GET DIAGNOSTICS published_count = ROW_COUNT;
  RETURN published_count;
END;
$$;

-- RLS Policies (apenas se não existirem)
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies para views
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_views' AND policyname = 'post_views_insert_members') THEN
    CREATE POLICY "post_views_insert_members"
    ON public.post_views FOR INSERT
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Policies para likes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_likes' AND policyname = 'post_likes_all_members') THEN
    CREATE POLICY "post_likes_all_members"
    ON public.post_likes FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Policies para comment likes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comment_likes' AND policyname = 'comment_likes_all_members') THEN
    CREATE POLICY "comment_likes_all_members"
    ON public.comment_likes FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
