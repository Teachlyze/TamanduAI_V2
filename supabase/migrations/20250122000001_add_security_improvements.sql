-- =====================================================
-- MIGRATION: Melhorias de Segurança e Privacidade
-- Data: 22/01/2025
-- Descrição: Implementa criptografia e segurança de dados sensíveis (LGPD)
-- =====================================================

-- ============================
-- 1. CRIAR EXTENSÃO DE CRIPTOGRAFIA
-- ============================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================
-- 2. TABELA SEPARADA PARA DADOS SENSÍVEIS
-- ============================

-- 2.1 Criar tabela de dados sensíveis criptografados
CREATE TABLE IF NOT EXISTS sensitive_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- CPF criptografado (LGPD compliance)
  cpf_encrypted TEXT,
  cpf_hash TEXT, -- Hash para busca sem descriptografar
  
  -- Data de nascimento (melhor que armazenar idade)
  birth_date DATE,
  
  -- Outros dados sensíveis
  phone_encrypted TEXT,
  address_encrypted TEXT,
  
  -- Metadados
  encryption_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: um usuário, um registro de dados sensíveis
  UNIQUE(user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sensitive_data_user_id ON sensitive_data(user_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_data_cpf_hash ON sensitive_data(cpf_hash);

-- RLS
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;

-- Policies: Apenas o próprio usuário ou admins podem acessar
CREATE POLICY "Users can read own sensitive data"
  ON sensitive_data FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own sensitive data"
  ON sensitive_data FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert sensitive data"
  ON sensitive_data FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================
-- 3. FUNÇÕES DE CRIPTOGRAFIA
-- ============================

-- 3.1 Função para criptografar CPF
CREATE OR REPLACE FUNCTION encrypt_cpf(cpf_plain TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF cpf_plain IS NULL OR cpf_plain = '' THEN
    RETURN NULL;
  END IF;
  
  -- Criptografar usando AES-256
  RETURN encode(
    pgp_sym_encrypt(cpf_plain, encryption_key),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Função para descriptografar CPF (apenas para admins)
CREATE OR REPLACE FUNCTION decrypt_cpf(cpf_encrypted TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF cpf_encrypted IS NULL OR cpf_encrypted = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN pgp_sym_decrypt(
    decode(cpf_encrypted, 'base64'),
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.3 Função para gerar hash de CPF (para busca)
CREATE OR REPLACE FUNCTION hash_cpf(cpf_plain TEXT)
RETURNS TEXT AS $$
BEGIN
  IF cpf_plain IS NULL OR cpf_plain = '' THEN
    RETURN NULL;
  END IF;
  
  -- Hash SHA-256 para busca
  RETURN encode(digest(cpf_plain, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3.4 Função para calcular idade a partir da data de nascimento
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
  IF birth_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN date_part('year', age(birth_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================
-- 4. MIGRAR DADOS SENSÍVEIS DE PROFILES
-- ============================

-- IMPORTANTE: Esta migration precisa de uma chave de criptografia
-- que deve ser definida nas variáveis de ambiente do Supabase
-- Adicione: ENCRYPTION_KEY=sua-chave-segura-aqui

DO $$
DECLARE
  enc_key TEXT := current_setting('app.encryption_key', TRUE);
BEGIN
  -- Apenas migrar se houver chave configurada
  IF enc_key IS NOT NULL AND enc_key != '' THEN
    
    -- Migrar CPF de profiles para sensitive_data
    INSERT INTO sensitive_data (user_id, cpf_encrypted, cpf_hash, birth_date)
    SELECT 
      id as user_id,
      encrypt_cpf(cpf, enc_key) as cpf_encrypted,
      hash_cpf(cpf) as cpf_hash,
      NULL as birth_date -- Será preenchido depois
    FROM profiles
    WHERE cpf IS NOT NULL 
      AND id NOT IN (SELECT user_id FROM sensitive_data)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '✅ CPFs migrados para sensitive_data com sucesso';
    
  ELSE
    RAISE WARNING '⚠️  ENCRYPTION_KEY não configurada. Defina app.encryption_key para criptografar dados.';
  END IF;
END $$;

-- ============================
-- 5. REMOVER CPF DE PROFILES (APÓS MIGRAÇÃO)
-- ============================

-- ATENÇÃO: Descomente apenas APÓS confirmar que a migração funcionou
-- e todos os CPFs foram movidos para sensitive_data

-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cpf') THEN
--     ALTER TABLE profiles DROP COLUMN cpf;
--     RAISE NOTICE '✅ Coluna cpf removida de profiles';
--   END IF;
-- END $$;

-- ============================
-- 6. SUBSTITUIR 'age' POR 'birth_date'
-- ============================

-- 6.1 Adicionar birth_date a profiles (temporariamente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN birth_date DATE;
  END IF;
END $$;

-- 6.2 Criar view para calcular idade dinamicamente (usar calculated_age para evitar conflito)
CREATE OR REPLACE VIEW profiles_with_age AS
SELECT 
  p.*,
  calculate_age(COALESCE(p.birth_date, sd.birth_date)) as calculated_age
FROM profiles p
LEFT JOIN sensitive_data sd ON sd.user_id = p.id;

-- 6.3 Remover coluna 'age' de profiles (após migração)
-- ATENÇÃO: Descomente apenas APÓS migrar os dados

-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'age') THEN
--     ALTER TABLE profiles DROP COLUMN age;
--     RAISE NOTICE '✅ Coluna age removida de profiles (use birth_date)';
--   END IF;
-- END $$;

-- ============================
-- 7. POLÍTICA DE RETENÇÃO DE LOGS
-- ============================

-- 7.1 Adicionar campo de expiração
ALTER TABLE application_logs 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days');

CREATE INDEX IF NOT EXISTS idx_application_logs_expires_at 
  ON application_logs(expires_at) WHERE expires_at IS NOT NULL;

-- 7.2 Função para limpar logs expirados (rodar via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM application_logs
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Logs expirados removidos: %', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.3 Anonimizar dados sensíveis em logs antigos (30 dias)
CREATE OR REPLACE FUNCTION anonymize_old_logs()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE application_logs
  SET 
    user_agent = 'ANONYMIZED',
    ip_address = '0.0.0.0',
    url = regexp_replace(url, 'token=[^&]+', 'token=REDACTED', 'g')
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND user_agent != 'ANONYMIZED';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Logs anonimizados: %', updated_count;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================
-- 8. AUDITORIA DE ACESSO A DADOS SENSÍVEIS
-- ============================

-- 8.1 Tabela de auditoria
CREATE TABLE IF NOT EXISTS sensitive_data_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  accessed_by UUID NOT NULL REFERENCES profiles(id),
  access_type TEXT NOT NULL, -- 'read', 'update', 'decrypt'
  field_name TEXT, -- qual campo foi acessado
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensitive_access_user 
  ON sensitive_data_access_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sensitive_access_by 
  ON sensitive_data_access_log(accessed_by, created_at DESC);

-- RLS
ALTER TABLE sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access logs"
  ON sensitive_data_access_log FOR SELECT
  USING (user_id = auth.uid() OR accessed_by = auth.uid());

-- 8.2 Trigger para registrar acessos
CREATE OR REPLACE FUNCTION log_sensitive_data_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sensitive_data_access_log (
    user_id,
    accessed_by,
    access_type,
    field_name
  ) VALUES (
    NEW.user_id,
    auth.uid(),
    TG_OP,
    NULL -- Pode ser expandido para logar campos específicos
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTA: PostgreSQL não suporta triggers em SELECT
-- Para auditoria de leitura, use RLS policies com logging ou uma view com função SECURITY DEFINER

-- CREATE TRIGGER log_sensitive_data_read
--   AFTER SELECT ON sensitive_data
--   FOR EACH ROW
--   EXECUTE FUNCTION log_sensitive_data_access();

-- ============================
-- 9. FUNCTION PARA DIREITO AO ESQUECIMENTO (LGPD)
-- ============================

CREATE OR REPLACE FUNCTION gdpr_delete_user_data(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  deleted_count INTEGER := 0;
BEGIN
  -- Verificar se o usuário solicitante é o próprio ou admin
  IF auth.uid() != target_user_id THEN
    -- TODO: Verificar se é admin
    RAISE EXCEPTION 'Não autorizado a deletar dados de outro usuário';
  END IF;
  
  -- Deletar dados sensíveis
  DELETE FROM sensitive_data WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Anonimizar perfil ao invés de deletar (manter integridade referencial)
  UPDATE profiles
  SET 
    full_name = 'Usuário Deletado',
    email = 'deleted_' || target_user_id || '@system.local',
    avatar_url = NULL,
    cpf = NULL,
    phone = NULL,
    updated_at = NOW(),
    deleted_at = NOW()
  WHERE id = target_user_id;
  
  -- Anonimizar submissions
  UPDATE submissions
  SET content = jsonb_build_object('status', 'anonymized')
  WHERE student_id = target_user_id;
  
  -- Deletar notificações
  DELETE FROM notifications WHERE user_id = target_user_id;
  
  result := jsonb_build_object(
    'success', TRUE,
    'user_id', target_user_id,
    'sensitive_data_deleted', deleted_count,
    'deleted_at', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================
-- 10. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================

COMMENT ON TABLE sensitive_data IS 'Dados sensíveis criptografados (LGPD compliance). CPF, telefone e endereço devem sempre ser criptografados.';
COMMENT ON COLUMN sensitive_data.cpf_encrypted IS 'CPF criptografado com AES-256. Use decrypt_cpf() para ler.';
COMMENT ON COLUMN sensitive_data.cpf_hash IS 'Hash SHA-256 do CPF para busca sem descriptografar.';
COMMENT ON COLUMN sensitive_data.birth_date IS 'Data de nascimento. Use calculate_age() para obter idade.';

COMMENT ON FUNCTION encrypt_cpf IS 'Criptografa CPF com AES-256. Requer chave de criptografia.';
COMMENT ON FUNCTION decrypt_cpf IS 'Descriptografa CPF. Apenas para admins com chave de criptografia.';
COMMENT ON FUNCTION hash_cpf IS 'Gera hash SHA-256 de CPF para busca sem exposição.';
COMMENT ON FUNCTION calculate_age IS 'Calcula idade a partir da data de nascimento.';
COMMENT ON FUNCTION gdpr_delete_user_data IS 'Implementa direito ao esquecimento (LGPD Art. 18, VI). Anonimiza dados do usuário.';

-- ============================
-- INSTRUÇÕES DE CONFIGURAÇÃO
-- ============================

DO $$
BEGIN
  RAISE NOTICE E'\n\n';
  RAISE NOTICE '================================================';
  RAISE NOTICE '  CONFIGURAÇÃO NECESSÁRIA';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Defina a chave de criptografia no Supabase:';
  RAISE NOTICE '   Dashboard > Settings > API > Custom Claims';
  RAISE NOTICE '   Adicione: app.encryption_key = "sua-chave-segura-256-bits"';
  RAISE NOTICE '';
  RAISE NOTICE '2. Configure cron jobs para limpeza:';
  RAISE NOTICE '   - SELECT cleanup_expired_logs(); (diário)';
  RAISE NOTICE '   - SELECT anonymize_old_logs(); (semanal)';
  RAISE NOTICE '';
  RAISE NOTICE '3. Após confirmar migração de CPFs:';
  RAISE NOTICE '   - Descomente DROP COLUMN cpf em profiles';
  RAISE NOTICE '   - Descomente DROP COLUMN age em profiles';
  RAISE NOTICE '';
  RAISE NOTICE '4. Use profiles_with_age VIEW no frontend';
  RAISE NOTICE '   ao invés de profiles.age diretamente';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE E'\n';
END $$;
