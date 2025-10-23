-- =====================================================
-- Migration: Fix XP Log Table (Incremental)
-- Description: Adiciona colunas e configurações faltantes
-- Author: TamanduAI Team
-- Date: 2025-01-18
-- =====================================================

-- 1. Adicionar coluna metadata se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_log' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.xp_log ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 2. Adicionar constraint de XP positivo se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'xp_log_xp_check'
  ) THEN
    ALTER TABLE public.xp_log ADD CONSTRAINT xp_log_xp_check CHECK (xp > 0);
  END IF;
END $$;

-- 3. Comentários para documentação
COMMENT ON TABLE public.xp_log IS 'Log de XP ganho pelos usuários do sistema de gamificação';
COMMENT ON COLUMN public.xp_log.id IS 'Identificador único do registro de XP';
COMMENT ON COLUMN public.xp_log.user_id IS 'ID do usuário que recebeu o XP';
COMMENT ON COLUMN public.xp_log.xp IS 'Quantidade de XP ganha (deve ser positiva)';
COMMENT ON COLUMN public.xp_log.source IS 'Descrição da ação que gerou o XP (ex: "Atividade submetida")';
COMMENT ON COLUMN public.xp_log.metadata IS 'Dados adicionais em JSON (ex: activity_id, submission_id)';
COMMENT ON COLUMN public.xp_log.created_at IS 'Data e hora em que o XP foi ganho';

-- 4. Índices para performance (criar apenas se não existirem)
CREATE INDEX IF NOT EXISTS idx_xp_log_user_id 
  ON public.xp_log(user_id);

CREATE INDEX IF NOT EXISTS idx_xp_log_created_at 
  ON public.xp_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_xp_log_user_created 
  ON public.xp_log(user_id, created_at DESC);

-- 5. Função helper: Calcular XP total de um usuário
CREATE OR REPLACE FUNCTION public.get_user_total_xp(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(xp), 0)::INTEGER
  FROM public.xp_log
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_total_xp IS 'Retorna o XP total acumulado de um usuário';

-- 6. Função helper: Calcular XP ganho hoje
CREATE OR REPLACE FUNCTION public.get_user_xp_today(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(xp), 0)::INTEGER
  FROM public.xp_log
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_xp_today IS 'Retorna o XP ganho pelo usuário no dia atual';

-- 7. Função helper: Histórico de XP dos últimos N dias
CREATE OR REPLACE FUNCTION public.get_user_xp_history(
  p_user_id UUID, 
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_xp INTEGER,
  action_count BIGINT
) AS $$
  SELECT 
    created_at::DATE as date,
    SUM(xp)::INTEGER as total_xp,
    COUNT(*) as action_count
  FROM public.xp_log
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  GROUP BY created_at::DATE
  ORDER BY date DESC;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_xp_history IS 'Retorna histórico diário de XP dos últimos N dias';

-- 8. Políticas RLS
ALTER TABLE public.xp_log ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios registros
DROP POLICY IF EXISTS "Users can view their own XP log" ON public.xp_log;
CREATE POLICY "Users can view their own XP log"
  ON public.xp_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Usuários podem inserir apenas para si mesmos
DROP POLICY IF EXISTS "Users can insert their own XP" ON public.xp_log;
CREATE POLICY "Users can insert their own XP"
  ON public.xp_log
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Apenas admins podem deletar (para moderação)
DROP POLICY IF EXISTS "Only admins can delete XP" ON public.xp_log;
CREATE POLICY "Only admins can delete XP"
  ON public.xp_log
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'school'
    )
  );

-- 9. Ajustar tabela de notificações para usar is_read
DO $$ 
BEGIN
  -- Adicionar coluna is_read se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.notifications 
      ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    
    -- Se existir coluna 'read', migrar dados
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications' 
      AND column_name = 'read'
    ) THEN
      UPDATE public.notifications SET is_read = "read";
      ALTER TABLE public.notifications DROP COLUMN IF EXISTS "read";
    END IF;
  END IF;
END $$;

-- 10. Trigger para criar notificação ao ganhar XP (opcional)
CREATE OR REPLACE FUNCTION public.notify_xp_gained()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir notificação automática
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    is_read
  ) VALUES (
    NEW.user_id,
    'xp_gained',
    'XP Ganho!',
    format('+%s XP - %s', NEW.xp, NEW.source),
    jsonb_build_object(
      'xp', NEW.xp,
      'source', NEW.source,
      'xp_log_id', NEW.id
    ) || COALESCE(NEW.metadata, '{}'::jsonb),
    FALSE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_notify_xp_gained ON public.xp_log;
CREATE TRIGGER trigger_notify_xp_gained
  AFTER INSERT ON public.xp_log
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_xp_gained();

COMMENT ON FUNCTION public.notify_xp_gained IS 'Trigger que cria notificação automática ao ganhar XP';

-- 11. Grant permissions
GRANT SELECT ON public.xp_log TO authenticated;
GRANT INSERT ON public.xp_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_total_xp TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_xp_today TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_xp_history TO authenticated;

-- =====================================================
-- Fim da Migration
-- =====================================================
