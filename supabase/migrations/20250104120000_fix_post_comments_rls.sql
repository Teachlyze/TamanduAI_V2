-- Corrigir RLS de post_comments para permitir comentários
-- Problema: posts vindos de class_materials não têm comments_enabled

-- Drop política antiga
DROP POLICY IF EXISTS "Membros podem comentar se habilitado" ON public.post_comments;

-- Criar nova política mais permissiva
-- Permite comentar em posts de turmas onde o usuário é membro
CREATE POLICY "Membros da turma podem comentar"
ON public.post_comments
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND (
    -- Post de class_posts com comments habilitados
    post_id IN (
      SELECT cp.id
      FROM public.class_posts cp
      INNER JOIN public.class_members cm ON cm.class_id = cp.class_id
      WHERE cm.user_id = auth.uid()
        AND cp.comments_enabled = true
    )
    OR
    -- Material de class_materials (sempre permite comentários)
    post_id IN (
      SELECT cm_mat.id
      FROM public.class_materials cm_mat
      INNER JOIN public.class_members cm ON cm.class_id = cm_mat.class_id
      WHERE cm.user_id = auth.uid()
    )
  )
);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON public.post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_class_posts_comments_enabled ON public.class_posts(comments_enabled);
