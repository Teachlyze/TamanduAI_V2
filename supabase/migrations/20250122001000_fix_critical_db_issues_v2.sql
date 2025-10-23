-- =====================================================
-- MIGRATION: Correções Críticas do Banco de Dados
-- Data: 22/01/2025
-- Descrição: Corrige inconsistências críticas identificadas na análise
-- =====================================================

-- ============================
-- 1. NORMALIZAR NOMENCLATURA
-- ============================

-- 1.1 Remover campos duplicados em gamification_profiles
DO $$ 
BEGIN
  -- Manter apenas xp_total, remover total_xp se existir
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gamification_profiles' AND column_name = 'total_xp') THEN
    -- Migrar dados se total_xp tiver valor e xp_total não
    UPDATE gamification_profiles 
    SET xp_total = COALESCE(xp_total, total_xp)
    WHERE xp_total IS NULL OR xp_total = 0;
    
    ALTER TABLE gamification_profiles DROP COLUMN IF EXISTS total_xp;
  END IF;
END $$;

-- 1.2 Padronizar is_read em notifications (remover 'read')
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
    -- Dropar views que dependem da coluna
    DROP VIEW IF EXISTS unread_notifications_count CASCADE;
    
    -- Migrar dados
    UPDATE notifications 
    SET is_read = COALESCE(is_read, "read")
    WHERE is_read IS NULL;
    
    ALTER TABLE notifications DROP COLUMN IF EXISTS "read";
    
    -- Recriar view com coluna correta
    CREATE OR REPLACE VIEW unread_notifications_count AS
    SELECT user_id, COUNT(*) as count
    FROM notifications
    WHERE is_read = false
    GROUP BY user_id;
  END IF;
END $$;

-- 1.3 Padronizar activities.created_by (remover teacher_id duplicado)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'teacher_id') THEN
    -- Migrar dados: se created_by null mas teacher_id não, copiar
    UPDATE activities 
    SET created_by = teacher_id
    WHERE created_by IS NULL AND teacher_id IS NOT NULL;
    
    -- Remover coluna redundante (CASCADE drop views dependentes)
    ALTER TABLE activities DROP COLUMN IF EXISTS teacher_id CASCADE;
  END IF;
END $$;

-- 1.4 Consolidar classes.created_by (remover professor_id duplicado)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'professor_id') THEN
    -- Migrar dados
    UPDATE classes 
    SET created_by = professor_id
    WHERE created_by IS NULL AND professor_id IS NOT NULL;
    
    ALTER TABLE classes DROP COLUMN IF EXISTS professor_id CASCADE;
  END IF;
END $$;

-- ============================
-- 2. CORRIGIR FOREIGN KEYS
-- ============================

-- 2.1 Corrigir teacher_invites.school_id que referencia auth.users ao invés de schools
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'teacher_invites' AND constraint_name LIKE '%school_id%'
  ) THEN
    -- Drop FK incorreta
    ALTER TABLE teacher_invites DROP CONSTRAINT IF EXISTS teacher_invites_school_id_fkey;
    
    -- Criar FK correta
    ALTER TABLE teacher_invites 
    ADD CONSTRAINT teacher_invites_school_id_fkey 
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2.2 Adicionar FK faltante em activities.class_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'activities' AND constraint_name = 'activities_class_id_fkey'
  ) THEN
    ALTER TABLE activities 
    ADD CONSTRAINT activities_class_id_fkey 
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2.3 Adicionar FK faltante em question_bank.school_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'question_bank' AND constraint_name = 'question_bank_school_id_fkey'
  ) THEN
    ALTER TABLE question_bank 
    ADD CONSTRAINT question_bank_school_id_fkey 
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================
-- 3. ADICIONAR ÍNDICES DE PERFORMANCE
-- ============================

-- 3.1 Índices compostos para queries frequentes
CREATE INDEX IF NOT EXISTS idx_submissions_activity_student 
  ON submissions(activity_id, student_id);

CREATE INDEX IF NOT EXISTS idx_class_members_class_user 
  ON class_members(class_id, user_id);

CREATE INDEX IF NOT EXISTS idx_xp_log_user_date 
  ON xp_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_class_published 
  ON activities(class_id, is_published);

-- 3.2 Índices GIN para arrays
CREATE INDEX IF NOT EXISTS idx_classes_meeting_days_gin 
  ON classes USING GIN(meeting_days);

CREATE INDEX IF NOT EXISTS idx_classes_cancelled_dates_gin 
  ON classes USING GIN(cancelled_dates);

CREATE INDEX IF NOT EXISTS idx_class_materials_tags_gin 
  ON class_materials USING GIN(tags);

-- ============================
-- 4. ADICIONAR CONSTRAINTS CHECK
-- ============================

-- 4.1 Validar grade entre 0 e 10
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'submissions_grade_check'
  ) THEN
    ALTER TABLE submissions 
    ADD CONSTRAINT submissions_grade_check 
    CHECK (grade IS NULL OR (grade >= 0 AND grade <= 10));
  END IF;
END $$;

-- 4.2 Validar weight positivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'activities_weight_check'
  ) THEN
    ALTER TABLE activities 
    ADD CONSTRAINT activities_weight_check 
    CHECK (weight IS NULL OR weight > 0);
  END IF;
END $$;

-- 4.3 Validar XP positivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'xp_log_xp_check'
  ) THEN
    ALTER TABLE xp_log 
    ADD CONSTRAINT xp_log_xp_check 
    CHECK (xp > 0);
  END IF;
END $$;

-- ============================
-- 5. ADICIONAR CAMPOS DE AUDITORIA FALTANTES
-- ============================

-- 5.1 Função helper para adicionar campos de auditoria
CREATE OR REPLACE FUNCTION add_audit_columns(p_table_name text)
RETURNS void AS $$
BEGIN
  -- created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = 'created_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW()', p_table_name);
  END IF;
  
  -- updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = 'updated_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()', p_table_name);
  END IF;
  
  -- deleted_at (soft delete)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = 'deleted_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN deleted_at TIMESTAMPTZ', p_table_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Aplicar em tabelas principais que não têm
SELECT add_audit_columns('activities');
SELECT add_audit_columns('classes');
SELECT add_audit_columns('class_members');
SELECT add_audit_columns('question_bank');
SELECT add_audit_columns('quiz_questions');
SELECT add_audit_columns('teacher_subscriptions');
SELECT add_audit_columns('class_materials');

-- 5.3 Criar trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em tabelas que têm updated_at (excluindo views)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT c.table_name 
    FROM information_schema.columns c
    JOIN information_schema.tables tb 
      ON c.table_name = tb.table_name 
      AND c.table_schema = tb.table_schema
    WHERE c.column_name = 'updated_at' 
      AND c.table_schema = 'public'
      AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END $$;

-- ============================
-- 5.4 ADICIONAR ÍNDICES PARA SOFT DELETE
-- ============================

-- Criar índices parciais para queries que ignoram deleted (DEPOIS de criar deleted_at)
CREATE INDEX IF NOT EXISTS idx_activities_not_deleted 
  ON activities(class_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_classes_not_deleted 
  ON classes(created_by) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_class_members_not_deleted 
  ON class_members(class_id, user_id) WHERE deleted_at IS NULL;

-- ============================
-- 6. REMOVER CAMPOS PROBLEMÁTICOS
-- ============================

-- 6.1 Remover is_published e is_draft de activities (usar apenas status)
DO $$
BEGIN
  -- Migrar dados primeiro
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'is_published') THEN
    UPDATE activities 
    SET status = CASE 
      WHEN is_published = true THEN 'published'
      WHEN is_draft = true THEN 'draft'
      ELSE COALESCE(status, 'draft')
    END
    WHERE status IS NULL;
    
    ALTER TABLE activities DROP COLUMN IF EXISTS is_published CASCADE;
    ALTER TABLE activities DROP COLUMN IF EXISTS is_draft CASCADE;
  END IF;
END $$;

-- ============================
-- 7. MELHORAR ENUM DE STATUS
-- ============================

-- 7.1 Expandir teacher_subscriptions.status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    -- Adicionar novos valores ao enum existente
    ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'suspended';
    ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'payment_failed';
    ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'pending_cancellation';
  END IF;
END $$;

-- ============================
-- 9. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================

COMMENT ON TABLE activities IS 'Atividades criadas por professores. Use status para controlar publicação.';
COMMENT ON COLUMN activities.created_by IS 'FK para profiles(id) - professor que criou a atividade';
COMMENT ON COLUMN activities.status IS 'Status da atividade: draft, published, archived';
COMMENT ON COLUMN activities.weight IS 'Peso da atividade para cálculo de média (use ESTE campo, não total_points)';

COMMENT ON TABLE class_members IS 'Membros de uma turma (alunos e monitores)';
COMMENT ON COLUMN class_members.role IS 'Papel do membro: student, monitor, etc.';

COMMENT ON TABLE notifications IS 'Notificações do sistema. Use is_read para controlar leitura.';

COMMENT ON TABLE xp_log IS 'Log de XP ganho pelos usuários. Usado para rankings e gamificação.';

-- ============================
-- 10. VALIDAÇÕES FINAIS
-- ============================

-- 10.1 Relatório de inconsistências restantes
DO $$
DECLARE
  report text := '';
BEGIN
  -- Verificar activities sem created_by
  IF EXISTS (SELECT 1 FROM activities WHERE created_by IS NULL LIMIT 1) THEN
    report := report || E'\n⚠️  Há activities sem created_by (devem ser corrigidas manualmente)';
  END IF;
  
  -- Verificar classes sem created_by
  IF EXISTS (SELECT 1 FROM classes WHERE created_by IS NULL LIMIT 1) THEN
    report := report || E'\n⚠️  Há classes sem created_by (devem ser corrigidas manualmente)';
  END IF;
  
  -- Verificar duplicações restantes
  IF EXISTS (
    SELECT user_id FROM class_members 
    GROUP BY class_id, user_id 
    HAVING COUNT(*) > 1 
    LIMIT 1
  ) THEN
    report := report || E'\n⚠️  Há duplicações em class_members (devem ser removidas manualmente)';
  END IF;
  
  IF report != '' THEN
    RAISE NOTICE 'Relatório de Inconsistências:%', report;
  ELSE
    RAISE NOTICE '✅ Todas as validações passaram com sucesso!';
  END IF;
END $$;
