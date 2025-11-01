-- ================================
-- TABELA DE REAÇÕES EM DISCUSSÕES
-- ================================

-- Criar tabela de reações
CREATE TABLE IF NOT EXISTS discussion_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'celebrate', 'insightful', 'support')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Usuário só pode reagir uma vez por tipo em cada discussão
  UNIQUE(discussion_id, user_id, reaction_type)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_discussion_reactions_discussion ON discussion_reactions(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_reactions_user ON discussion_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_reactions_type ON discussion_reactions(reaction_type);

-- ================================
-- RLS POLICIES - discussion_reactions
-- ================================

-- Habilitar RLS
ALTER TABLE discussion_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ver reações
CREATE POLICY "Todos podem ver reações"
ON discussion_reactions FOR SELECT
TO authenticated
USING (true);

-- Policy: Usuários podem criar suas próprias reações
CREATE POLICY "Usuários podem criar reações"
ON discussion_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem deletar suas próprias reações
CREATE POLICY "Usuários podem deletar suas reações"
ON discussion_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ================================
-- VERIFICAR E CORRIGIR RLS - class_materials
-- ================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Membros podem ver materiais" ON class_materials;
DROP POLICY IF EXISTS "Professores podem criar materiais" ON class_materials;
DROP POLICY IF EXISTS "Professores podem atualizar materiais" ON class_materials;
DROP POLICY IF EXISTS "Professores podem deletar materiais" ON class_materials;

-- Policy: Membros da turma podem ver materiais
CREATE POLICY "Membros da turma podem ver materiais"
ON class_materials FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM class_members
    WHERE class_members.class_id = class_materials.class_id
    AND class_members.user_id = auth.uid()
  )
);

-- Policy: Professores podem criar materiais
CREATE POLICY "Professores podem criar materiais"
ON class_materials FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM class_members
    WHERE class_members.class_id = class_materials.class_id
    AND class_members.user_id = auth.uid()
    AND class_members.role = 'teacher'
  )
);

-- Policy: Professores podem atualizar seus materiais
CREATE POLICY "Professores podem atualizar materiais"
ON class_materials FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM class_members
    WHERE class_members.class_id = class_materials.class_id
    AND class_members.user_id = auth.uid()
    AND class_members.role = 'teacher'
  )
);

-- Policy: Professores podem deletar materiais
CREATE POLICY "Professores podem deletar materiais"
ON class_materials FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM class_members
    WHERE class_members.class_id = class_materials.class_id
    AND class_members.user_id = auth.uid()
    AND class_members.role = 'teacher'
  )
);

-- ================================
-- VERIFICAR E CORRIGIR RLS - discussions
-- ================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Membros podem ver discussões" ON discussions;
DROP POLICY IF EXISTS "Membros podem criar discussões" ON discussions;
DROP POLICY IF EXISTS "Criadores podem atualizar discussões" ON discussions;
DROP POLICY IF EXISTS "Criadores podem deletar discussões" ON discussions;

-- Policy: Membros da turma podem ver discussões
CREATE POLICY "Membros da turma podem ver discussões"
ON discussions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM class_members
    WHERE class_members.class_id = discussions.class_id
    AND class_members.user_id = auth.uid()
  )
);

-- Policy: Membros podem criar discussões
CREATE POLICY "Membros podem criar discussões"
ON discussions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM class_members
    WHERE class_members.class_id = discussions.class_id
    AND class_members.user_id = auth.uid()
  )
  AND auth.uid() = created_by
);

-- Policy: Criadores podem atualizar discussões
CREATE POLICY "Criadores podem atualizar discussões"
ON discussions FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Policy: Criadores podem deletar discussões
CREATE POLICY "Criadores podem deletar discussões"
ON discussions FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- ================================
-- VERIFICAR E CORRIGIR RLS - discussion_messages
-- ================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Membros podem ver mensagens" ON discussion_messages;
DROP POLICY IF EXISTS "Membros podem criar mensagens" ON discussion_messages;
DROP POLICY IF EXISTS "Criadores podem atualizar mensagens" ON discussion_messages;
DROP POLICY IF EXISTS "Criadores podem deletar mensagens" ON discussion_messages;

-- Habilitar RLS se não estiver
ALTER TABLE discussion_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Membros podem ver mensagens de discussões da sua turma
CREATE POLICY "Membros podem ver mensagens"
ON discussion_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM discussions
    JOIN class_members ON class_members.class_id = discussions.class_id
    WHERE discussions.id = discussion_messages.discussion_id
    AND class_members.user_id = auth.uid()
  )
);

-- Policy: Membros podem criar mensagens
CREATE POLICY "Membros podem criar mensagens"
ON discussion_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM discussions
    JOIN class_members ON class_members.class_id = discussions.class_id
    WHERE discussions.id = discussion_messages.discussion_id
    AND class_members.user_id = auth.uid()
  )
  AND auth.uid() = user_id
);

-- Policy: Criadores podem atualizar suas mensagens
CREATE POLICY "Criadores podem atualizar mensagens"
ON discussion_messages FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Criadores podem marcar como deletado
CREATE POLICY "Criadores podem deletar mensagens"
ON discussion_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ================================
-- COMENTÁRIO FINAL
-- ================================

COMMENT ON TABLE discussion_reactions IS 'Reações (likes, love, etc) em discussões/posts';
COMMENT ON COLUMN discussion_reactions.reaction_type IS 'Tipo de reação: like, love, celebrate, insightful, support';
