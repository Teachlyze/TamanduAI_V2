-- ============================================
-- TABELA PÚBLICA DE IDEIAS (SEM LOGIN)
-- ============================================

-- Tabela principal de ideias
CREATE TABLE IF NOT EXISTS public_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  problem TEXT CHECK (char_length(problem) <= 1000),
  solution TEXT CHECK (char_length(solution) <= 1000),
  segment TEXT CHECK (segment IN ('fundamental-1', 'fundamental-2', 'medio', 'tecnico', 'superior')),
  identification TEXT CHECK (char_length(identification) <= 100),
  status TEXT NOT NULL DEFAULT 'em-analise' CHECK (status IN ('em-analise', 'em-desenvolvimento', 'lancado')),
  votes_count INTEGER NOT NULL DEFAULT 0 CHECK (votes_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de votos (1 voto por visitor_id)
CREATE TABLE IF NOT EXISTS public_idea_votes (
  idea_id UUID NOT NULL REFERENCES public_ideas(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL CHECK (char_length(visitor_id) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, visitor_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_public_ideas_status ON public_ideas(status);
CREATE INDEX IF NOT EXISTS idx_public_ideas_created_at ON public_ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_ideas_votes_count ON public_ideas(votes_count DESC);
CREATE INDEX IF NOT EXISTS idx_public_idea_votes_visitor ON public_idea_votes(visitor_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_public_ideas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_public_ideas_updated_at
  BEFORE UPDATE ON public_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_public_ideas_updated_at();

-- ============================================
-- RLS POLICIES (Acesso público controlado)
-- ============================================

-- Habilitar RLS
ALTER TABLE public_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_idea_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Qualquer pessoa pode ler ideias
CREATE POLICY "Qualquer pessoa pode ler ideias"
  ON public_ideas FOR SELECT
  USING (true);

-- Policy: Inserção via Edge Function apenas (service_role)
-- Usuários anônimos NÃO podem inserir diretamente
CREATE POLICY "Inserção apenas via Edge Function"
  ON public_ideas FOR INSERT
  WITH CHECK (false);

-- Policy: Atualização apenas via service_role (Edge Function)
CREATE POLICY "Atualização apenas via Edge Function"
  ON public_ideas FOR UPDATE
  USING (false);

-- Policy: Qualquer pessoa pode ler votos
CREATE POLICY "Qualquer pessoa pode ler votos"
  ON public_idea_votes FOR SELECT
  USING (true);

-- Policy: Votos via Edge Function apenas
CREATE POLICY "Votos apenas via Edge Function"
  ON public_idea_votes FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Remover votos apenas via Edge Function"
  ON public_idea_votes FOR DELETE
  USING (false);

-- ============================================
-- FUNÇÃO: Incrementar/Decrementar Votos
-- ============================================

CREATE OR REPLACE FUNCTION toggle_idea_vote(
  p_idea_id UUID,
  p_visitor_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_vote_exists BOOLEAN;
  v_new_votes_count INTEGER;
  v_action TEXT;
BEGIN
  -- Verifica se o voto já existe
  SELECT EXISTS (
    SELECT 1 FROM public_idea_votes 
    WHERE idea_id = p_idea_id AND visitor_id = p_visitor_id
  ) INTO v_vote_exists;

  IF v_vote_exists THEN
    -- Remove o voto
    DELETE FROM public_idea_votes 
    WHERE idea_id = p_idea_id AND visitor_id = p_visitor_id;
    
    -- Decrementa contador
    UPDATE public_ideas 
    SET votes_count = GREATEST(votes_count - 1, 0)
    WHERE id = p_idea_id
    RETURNING votes_count INTO v_new_votes_count;
    
    v_action := 'unvote';
  ELSE
    -- Adiciona o voto
    INSERT INTO public_idea_votes (idea_id, visitor_id)
    VALUES (p_idea_id, p_visitor_id);
    
    -- Incrementa contador
    UPDATE public_ideas 
    SET votes_count = votes_count + 1
    WHERE id = p_idea_id
    RETURNING votes_count INTO v_new_votes_count;
    
    v_action := 'vote';
  END IF;

  -- Retorna resultado
  RETURN json_build_object(
    'action', v_action,
    'votes_count', v_new_votes_count,
    'has_voted', NOT v_vote_exists
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DADOS INICIAIS (EXEMPLO - OPCIONAL)
-- ============================================

INSERT INTO public_ideas (title, problem, solution, identification, status, votes_count, created_at) VALUES
  (
    'Banco de questões compartilhado entre professores',
    'Criar provas sempre do zero consome muito tempo e professores não conseguem aproveitar questões de colegas.',
    'Criar um banco colaborativo onde professores podem adicionar, buscar e reutilizar questões por disciplina e nível.',
    'Prof. de Matemática - Ensino Médio',
    'em-analise',
    47,
    now() - interval '5 days'
  ),
  (
    'Integração com Google Classroom',
    'Uso o Google Classroom para distribuir atividades e preciso replicar tudo na TamanduAI manualmente.',
    'Sincronizar automaticamente turmas, alunos e atividades entre Google Classroom e TamanduAI.',
    'Prof. de História - Fundamental II',
    'em-desenvolvimento',
    38,
    now() - interval '7 days'
  ),
  (
    'Relatórios automatizados para reuniões de pais',
    'Preparar relatórios de desempenho individual para reuniões com pais demora muito e preciso repetir informações.',
    'Gerar automaticamente relatórios com gráficos de evolução, pontos fortes e áreas de melhoria para cada aluno.',
    'Prof. de Português - Fundamental I',
    'em-analise',
    31,
    now() - interval '3 days'
  ),
  (
    'App mobile para alunos acessarem atividades',
    'Alunos reclamam que o site mobile não é tão prático quanto um app e perdem prazos.',
    'Desenvolver aplicativo mobile nativo com notificações push para prazos e novidades.',
    'Prof. de Ciências - Ensino Médio',
    'lancado',
    29,
    now() - interval '25 days'
  ),
  (
    'Modo offline para correção de atividades',
    'Quando estou sem internet (ônibus, casa de campo), não consigo corrigir atividades.',
    'Permitir baixar atividades pendentes e corrigir offline, sincronizando quando voltar a ter conexão.',
    'Prof. de Geografia - Fundamental II',
    'em-analise',
    24,
    now() - interval '1 day'
  ),
  (
    'Templates de plano de aula com IA',
    'Criar planos de aula alinhados à BNCC do zero é trabalhoso e repetitivo.',
    'IA que sugere estrutura de plano de aula baseado no tema, série e competências da BNCC.',
    'Prof. de Educação Física - Fundamental I',
    'em-desenvolvimento',
    22,
    now() - interval '10 days'
  );

-- Commit
COMMIT;
