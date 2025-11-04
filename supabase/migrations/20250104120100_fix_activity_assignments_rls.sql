-- Corrigir RLS de activity_class_assignments
-- Permitir alunos verem assignments de suas turmas

-- Drop política antiga que estava causando 406
DROP POLICY IF EXISTS "assignments_select_policy" ON public.activity_class_assignments;

-- Criar política que permite alunos verem assignments de suas turmas
CREATE POLICY "Alunos podem ver assignments de suas turmas"
ON public.activity_class_assignments
FOR SELECT
USING (
  -- Usuário é membro da turma
  class_id IN (
    SELECT class_id
    FROM public.class_members
    WHERE user_id = auth.uid()
  )
  OR
  -- Usuário é o criador da turma (professor)
  class_id IN (
    SELECT id
    FROM public.classes
    WHERE created_by = auth.uid()
  )
);

-- Política para professores poderem criar/editar assignments
CREATE POLICY "Professores podem gerenciar assignments de suas turmas"
ON public.activity_class_assignments
FOR ALL
USING (
  class_id IN (
    SELECT id
    FROM public.classes
    WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  class_id IN (
    SELECT id
    FROM public.classes
    WHERE created_by = auth.uid()
  )
);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_activity_class_assignments_activity_id 
  ON public.activity_class_assignments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_class_assignments_class_id 
  ON public.activity_class_assignments(class_id);
