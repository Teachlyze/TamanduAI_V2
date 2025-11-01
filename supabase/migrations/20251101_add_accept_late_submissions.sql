-- Migration: Adicionar campo accept_late_submissions à tabela activities
-- Data: 01/11/2025
-- Descrição: Permite que professores configurem se atividades aceitam respostas atrasadas

-- Adicionar coluna accept_late_submissions
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS accept_late_submissions BOOLEAN DEFAULT false;

-- Adicionar comentário explicativo
COMMENT ON COLUMN activities.accept_late_submissions IS 
'Se true, permite que alunos respondam a atividade após o prazo (due_date). O professor pode aplicar penalidade na pontuação para respostas atrasadas.';

-- Atualizar atividades existentes (opcional - define todas como não aceitando respostas atrasadas)
UPDATE activities 
SET accept_late_submissions = false 
WHERE accept_late_submissions IS NULL;

-- Log de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Campo accept_late_submissions adicionado com sucesso à tabela activities';
  RAISE NOTICE '📋 Atividades existentes configuradas para não aceitar respostas atrasadas (padrão)';
  RAISE NOTICE '👨‍🏫 Professores podem alterar esta configuração ao editar atividades';
END $$;
