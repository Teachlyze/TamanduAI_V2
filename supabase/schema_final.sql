


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."mission_type" AS ENUM (
    'daily',
    'weekly'
);


ALTER TYPE "public"."mission_type" OWNER TO "postgres";


CREATE TYPE "public"."period_type" AS ENUM (
    'weekly',
    'monthly'
);


ALTER TYPE "public"."period_type" OWNER TO "postgres";


CREATE TYPE "public"."quiz_question_type" AS ENUM (
    'mcq',
    'truefalse',
    'open'
);


ALTER TYPE "public"."quiz_question_type" OWNER TO "postgres";


CREATE TYPE "public"."school_admin_role" AS ENUM (
    'owner',
    'admin'
);


ALTER TYPE "public"."school_admin_role" OWNER TO "postgres";


CREATE TYPE "public"."school_teacher_status" AS ENUM (
    'active',
    'pending',
    'removed'
);


ALTER TYPE "public"."school_teacher_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_class_invitation"("invitation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Buscar convite
  SELECT * INTO v_invitation
  FROM public.class_invitations
  WHERE id = invitation_id
  AND status = 'pending'
  AND (expires_at IS NULL OR expires_at > NOW());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite não encontrado ou expirado'
    );
  END IF;
  
  -- Buscar user_id pelo email
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Verificar se email corresponde
  IF v_invitation.invitee_email != (SELECT email FROM auth.users WHERE id = v_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email não corresponde'
    );
  END IF;
  
  -- Verificar se já está na turma
  IF EXISTS (
    SELECT 1 FROM public.class_members
    WHERE class_id = v_invitation.class_id
    AND user_id = v_user_id
  ) THEN
    -- Já está na turma, apenas marcar como aceito
    UPDATE public.class_invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        invitee_id = v_user_id
    WHERE id = invitation_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Você já está nesta turma'
    );
  END IF;
  
  -- Adicionar à turma
  INSERT INTO public.class_members (class_id, user_id, role, joined_at)
  VALUES (v_invitation.class_id, v_user_id, 'student', NOW())
  ON CONFLICT (class_id, user_id) DO NOTHING;
  
  -- Marcar convite como aceito
  UPDATE public.class_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      invitee_id = v_user_id
  WHERE id = invitation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'class_id', v_invitation.class_id,
    'message', 'Convite aceito com sucesso'
  );
END;
$$;


ALTER FUNCTION "public"."accept_class_invitation"("invitation_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_class_invitation"("invitation_id" "uuid") IS 'Aceita convite e adiciona aluno à turma';



CREATE OR REPLACE FUNCTION "public"."accept_invitation_with_transaction"("p_invitation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Buscar convite
  SELECT * INTO v_invitation
  FROM public.class_invitations
  WHERE id = p_invitation_id
  AND status = 'pending'
  AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE; -- Lock para evitar race condition

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Convite não encontrado ou expirado'
    );
  END IF;

  v_user_id := auth.uid();

  -- 2. Verificar email
  IF v_invitation.invitee_email != (SELECT email FROM auth.users WHERE id = v_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email não corresponde'
    );
  END IF;

  -- 3. Adicionar à turma (se ainda não está)
  INSERT INTO public.class_members (class_id, user_id, role, joined_at)
  VALUES (v_invitation.class_id, v_user_id, 'student', NOW())
  ON CONFLICT (class_id, user_id) DO NOTHING;

  -- 4. Marcar convite como aceito
  UPDATE public.class_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      invitee_id = v_user_id
  WHERE id = p_invitation_id;

  -- 5. Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'class_id', v_invitation.class_id,
    'message', 'Convite aceito com sucesso'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao aceitar convite: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."accept_invitation_with_transaction"("p_invitation_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_invitation_with_transaction"("p_invitation_id" "uuid") IS 'Aceita convite e adiciona à turma em transação atômica';



CREATE OR REPLACE FUNCTION "public"."add_audit_columns"("p_table_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."add_audit_columns"("p_table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."anonymize_old_logs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."anonymize_old_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_grade_with_transaction"("p_submission_id" "uuid", "p_grade" numeric, "p_feedback" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_submission RECORD;
  v_xp INTEGER;
  v_multiplier NUMERIC;
  v_result JSONB;
BEGIN
  -- 1. Buscar submissão
  SELECT * INTO v_submission
  FROM public.activity_submissions
  WHERE id = p_submission_id
  FOR UPDATE; -- Lock

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submissão não encontrada');
  END IF;

  -- 2. Atualizar nota
  UPDATE public.activity_submissions
  SET grade = p_grade,
      feedback = p_feedback,
      status = 'graded',
      graded_at = NOW(),
      updated_at = NOW()
  WHERE id = p_submission_id;

  -- 3. Calcular XP baseado na nota
  IF p_grade >= 9.6 THEN
    v_multiplier := 3.0;
  ELSIF p_grade >= 9.0 THEN
    v_multiplier := 2.5;
  ELSIF p_grade >= 8.0 THEN
    v_multiplier := 2.0;
  ELSIF p_grade >= 7.0 THEN
    v_multiplier := 1.5;
  ELSIF p_grade >= 5.0 THEN
    v_multiplier := 1.0;
  ELSE
    v_multiplier := 0.5;
  END IF;

  v_xp := FLOOR(10 * v_multiplier);

  -- Bônus para nota 10
  IF p_grade = 10.0 THEN
    v_xp := v_xp + 20;
  END IF;

  -- 4. Adicionar XP
  IF v_xp > 0 THEN
    INSERT INTO public.xp_transactions (
      user_id,
      amount,
      source,
      metadata,
      created_at
    ) VALUES (
      v_submission.user_id,
      v_xp,
      'grade_received',
      jsonb_build_object(
        'submission_id', p_submission_id,
        'grade', p_grade,
        'multiplier', v_multiplier
      ),
      NOW()
    );

    UPDATE public.gamification_profiles
    SET xp_total = xp_total + v_xp,
        updated_at = NOW()
    WHERE user_id = v_submission.user_id;
  END IF;

  -- 5. Criar notificação
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    is_read,
    metadata,
    created_at
  ) VALUES (
    v_submission.user_id,
    'activityCorrected',
    'Atividade corrigida! 🎉',
    format('Nota: %s/10 • +%s XP ganho', p_grade::text, v_xp::text),
    false,
    jsonb_build_object('submission_id', p_submission_id, 'grade', p_grade, 'xp', v_xp),
    NOW()
  );

  -- 6. Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'xp_earned', v_xp,
    'multiplier', v_multiplier
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atribuir nota: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."assign_grade_with_transaction"("p_submission_id" "uuid", "p_grade" numeric, "p_feedback" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."assign_grade_with_transaction"("p_submission_id" "uuid", "p_grade" numeric, "p_feedback" "text") IS 'Atribui nota com XP e notificação em transação atômica';



CREATE OR REPLACE FUNCTION "public"."auto_create_school_for_school_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  school_name TEXT;
BEGIN
  IF NEW.role = 'school' THEN
    school_name := COALESCE(NEW.full_name, 'Minha Escola');
    
    INSERT INTO public.schools (
      id,
      name,
      owner_id,
      settings,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      school_name,
      NEW.id,
      '{"initialized": true}'::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Escola criada automaticamente: % (ID: %)', school_name, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_school_for_school_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_badge"("p_user_id" "uuid", "p_badge_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
  VALUES (p_user_id, p_badge_id, NOW(), 100)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."award_badge"("p_user_id" "uuid", "p_badge_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."award_badge"("p_user_id" "uuid", "p_badge_id" "uuid") IS 'Awards a badge to a user (idempotent)';



CREATE OR REPLACE FUNCTION "public"."calculate_age"("birth_date" "date") RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, birth_date));
END;
$$;


ALTER FUNCTION "public"."calculate_age"("birth_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_age"("birth_date" "date") IS 'Calcula idade a partir de birth_date. Retorna NULL se birth_date for NULL.';



CREATE OR REPLACE FUNCTION "public"."can_teacher_create_class"("teacher_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  linked_schools_count INT;
  subscription_record RECORD;
  current_classes INT;
BEGIN
  -- Verificar se professor está vinculado a alguma escola ativa
  SELECT COUNT(*) INTO linked_schools_count
  FROM public.school_teachers
  WHERE user_id = teacher_id
    AND status = 'active';

  -- Se vinculado a escola, pode criar (escola paga)
  IF linked_schools_count > 0 THEN
    RETURN TRUE;
  END IF;

  -- Se não vinculado, verificar plano próprio
  SELECT * INTO subscription_record
  FROM public.teacher_subscriptions
  WHERE user_id = teacher_id
    AND status IN ('active', 'trial')
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  -- Sem plano
  IF subscription_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verificar limite do plano
  SELECT COUNT(*) INTO current_classes
  FROM public.classes
  WHERE created_by = teacher_id;

  IF current_classes >= subscription_record.max_classes THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."can_teacher_create_class"("teacher_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_teacher_create_class"("teacher_id" "uuid") IS 'Verifica se professor pode criar turma: se está em escola OU se tem plano próprio ativo com limite disponível';



CREATE OR REPLACE FUNCTION "public"."check_and_award_xp_badges"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  total_xp INTEGER;
  badge_record RECORD;
BEGIN
  -- Get user's total XP
  SELECT COALESCE(SUM(xp), 0) INTO total_xp
  FROM xp_log
  WHERE user_id = p_user_id;

  -- Check for XP-based badges
  FOR badge_record IN
    SELECT id, requirement_value
    FROM badges
    WHERE requirement_type = 'xp'
      AND requirement_value <= total_xp
  LOOP
    PERFORM award_badge(p_user_id, badge_record.id);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."check_and_award_xp_badges"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_and_award_xp_badges"("p_user_id" "uuid") IS 'Checks and awards XP-based badges automatically';



CREATE OR REPLACE FUNCTION "public"."check_performance_health"() RETURNS TABLE("check_name" "text", "status" "text", "details" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check 1: Índices em class_members
  RETURN QUERY
  SELECT 
    'class_members_indexes'::text,
    CASE 
      WHEN COUNT(*) >= 3 THEN 'OK'
      ELSE 'WARNING'
    END::text,
    'Índices encontrados: ' || COUNT(*)::text
  FROM pg_indexes
  WHERE schemaname = 'public' 
    AND tablename = 'class_members'
    AND indexname LIKE 'idx_%';

  -- Check 2: RLS policies simplificadas
  RETURN QUERY
  SELECT 
    'class_members_policies'::text,
    CASE 
      WHEN COUNT(*) <= 5 THEN 'OK'
      ELSE 'WARNING'
    END::text,
    'Policies ativas: ' || COUNT(*)::text || ' (ideal: 4-5)'
  FROM pg_policies
  WHERE schemaname = 'public' 
    AND tablename = 'class_members';

  -- Check 3: Tamanho das tabelas principais
  RETURN QUERY
  SELECT 
    'table_sizes'::text,
    'INFO'::text,
    tablename || ': ' || pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('class_members', 'classes', 'profiles')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

END;
$$;


ALTER FUNCTION "public"."check_performance_health"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_performance_health"() IS 'Função para verificar saúde da performance do banco. Execute: SELECT * FROM check_performance_health();';



CREATE OR REPLACE FUNCTION "public"."clean_old_logs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.logger
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."clean_old_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."clean_old_logs"() IS 'Deletes logs older than 90 days. Returns number of deleted rows.';



CREATE OR REPLACE FUNCTION "public"."clean_old_notification_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Deletar logs com mais de 30 dias
  DELETE FROM public.notification_logs
  WHERE sent_at < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE 'Cleaned old notification logs';
END;
$$;


ALTER FUNCTION "public"."clean_old_notification_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."clean_old_notification_logs"() IS 'Remove logs de notificações com mais de 30 dias';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_logs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM application_logs
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Logs expirados removidos: %', deleted_count;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"("days_old" integer DEFAULT 90) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.notifications
    WHERE read = true 
    AND created_at < NOW() - (days_old || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_notifications"("days_old" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_notifications"("days_old" integer) IS 'Remove notificações lidas com mais de X dias';



CREATE OR REPLACE FUNCTION "public"."compare_classes"("p_teacher_id" "uuid") RETURNS TABLE("class_id" "uuid", "class_name" "text", "total_students" bigint, "average_grade" numeric, "submission_rate" numeric, "engagement_score" numeric, "performance_rank" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH class_metrics AS (
    SELECT
      cpo.class_id,
      cpo.class_name,
      cpo.total_students,
      cpo.average_grade,
      cpo.submission_rate,
      (cpo.total_posts + cpo.total_comments)::DECIMAL / NULLIF(cpo.total_students, 0) AS engagement
    FROM public.class_performance_overview cpo
    WHERE cpo.teacher_id = p_teacher_id
  )
  SELECT
    cm.class_id,
    cm.class_name,
    cm.total_students,
    cm.average_grade,
    cm.submission_rate,
    cm.engagement,
    ROW_NUMBER() OVER (ORDER BY cm.average_grade DESC NULLS LAST)::INTEGER AS rank
  FROM class_metrics cm
  ORDER BY cm.average_grade DESC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."compare_classes"("p_teacher_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."compare_classes"("p_teacher_id" "uuid") IS 'Compara performance entre turmas de um professor';



CREATE OR REPLACE FUNCTION "public"."compute_leaderboard"() RETURNS TABLE("user_id" "uuid", "score" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  with scores as (
    -- Example: sum scores from quiz_attempts
    select user_id, sum(score)::bigint as score
    from public.quiz_attempts
    group by user_id
  )
  select user_id, score from scores order by score desc;
$$;


ALTER FUNCTION "public"."compute_leaderboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_class_members"("p_class_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM class_members
  WHERE class_id = p_class_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$;


ALTER FUNCTION "public"."count_class_members"("p_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_class_members"("p_class_id" "uuid") IS 'Conta todos os membros de uma turma sem aplicar RLS';



CREATE OR REPLACE FUNCTION "public"."count_class_students"("p_class_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM class_members
  WHERE class_id = p_class_id
    AND role = 'student';
  
  RETURN COALESCE(v_count, 0);
END;
$$;


ALTER FUNCTION "public"."count_class_students"("p_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_class_students"("p_class_id" "uuid") IS 'Conta estudantes de uma turma sem aplicar RLS, evitando recursão';



CREATE OR REPLACE FUNCTION "public"."count_class_students_batch"("p_class_ids" "uuid"[]) RETURNS TABLE("class_id" "uuid", "student_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.class_id,
    COUNT(*)::INTEGER as student_count
  FROM class_members cm
  WHERE cm.class_id = ANY(p_class_ids)
    AND cm.role = 'student'
  GROUP BY cm.class_id;
END;
$$;


ALTER FUNCTION "public"."count_class_students_batch"("p_class_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_class_students_batch"("p_class_ids" "uuid"[]) IS 'Conta estudantes de múltiplas turmas em batch sem aplicar RLS';



CREATE OR REPLACE FUNCTION "public"."count_school_students"("p_school_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT cm.user_id)::INTEGER
  INTO v_count
  FROM school_classes sc
  JOIN class_members cm ON cm.class_id = sc.class_id
  WHERE sc.school_id = p_school_id
    AND cm.role = 'student';
  
  RETURN COALESCE(v_count, 0);
END;
$$;


ALTER FUNCTION "public"."count_school_students"("p_school_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_school_students"("p_school_id" "uuid") IS 'Conta estudantes únicos de uma escola sem aplicar RLS';



CREATE OR REPLACE FUNCTION "public"."create_class_with_transaction"("p_teacher_id" "uuid", "p_name" "text", "p_subject" "text", "p_description" "text" DEFAULT NULL::"text", "p_course" "text" DEFAULT NULL::"text", "p_period" "text" DEFAULT NULL::"text", "p_grade_level" "text" DEFAULT NULL::"text", "p_academic_year" integer DEFAULT NULL::integer, "p_color" "text" DEFAULT '#6366f1'::"text", "p_student_capacity" integer DEFAULT 30, "p_chatbot_enabled" boolean DEFAULT false, "p_school_id" "uuid" DEFAULT NULL::"uuid", "p_is_school_managed" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_class_id UUID;
  v_result JSONB;
BEGIN
  -- Início da transação (implícito)
  
  -- 1. Verificar se professor existe, criar se não
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_teacher_id) THEN
    INSERT INTO public.profiles (id, role, created_at, updated_at)
    VALUES (p_teacher_id, 'teacher', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 2. Criar turma
  INSERT INTO public.classes (
    created_by,
    name,
    description,
    subject,
    course,
    period,
    grade_level,
    academic_year,
    color,
    student_capacity,
    chatbot_enabled,
    school_id,
    is_school_managed,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_teacher_id,
    p_name,
    p_description,
    p_subject,
    p_course,
    p_period,
    p_grade_level,
    COALESCE(p_academic_year, EXTRACT(YEAR FROM NOW())::INTEGER),
    p_color,
    p_student_capacity,
    p_chatbot_enabled,
    p_school_id,
    p_is_school_managed,
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_class_id;

  -- 3. Adicionar professor como membro
  INSERT INTO public.class_members (class_id, user_id, role, joined_at)
  VALUES (v_class_id, p_teacher_id, 'teacher', NOW())
  ON CONFLICT (class_id, user_id) DO NOTHING;

  -- 4. Inicializar chatbot se habilitado
  IF p_chatbot_enabled THEN
    INSERT INTO public.chatbot_configurations (
      class_id,
      enabled,
      keywords,
      themes,
      scope_restrictions,
      created_at,
      updated_at
    ) VALUES (
      v_class_id,
      true,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (class_id) DO NOTHING;
  END IF;

  -- 5. Buscar turma criada com dados completos
  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'created_by', c.created_by,
    'invite_code', c.invite_code,
    'chatbot_enabled', c.chatbot_enabled,
    'school_id', c.school_id,
    'created_at', c.created_at
  )
  INTO v_result
  FROM public.classes c
  WHERE c.id = v_class_id;

  -- Commit implícito no final da função
  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback automático em caso de erro
    RAISE EXCEPTION 'Erro ao criar turma: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_class_with_transaction"("p_teacher_id" "uuid", "p_name" "text", "p_subject" "text", "p_description" "text", "p_course" "text", "p_period" "text", "p_grade_level" "text", "p_academic_year" integer, "p_color" "text", "p_student_capacity" integer, "p_chatbot_enabled" boolean, "p_school_id" "uuid", "p_is_school_managed" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_class_with_transaction"("p_teacher_id" "uuid", "p_name" "text", "p_subject" "text", "p_description" "text", "p_course" "text", "p_period" "text", "p_grade_level" "text", "p_academic_year" integer, "p_color" "text", "p_student_capacity" integer, "p_chatbot_enabled" boolean, "p_school_id" "uuid", "p_is_school_managed" boolean) IS 'Cria turma com todas operações relacionadas em uma transação atômica';



CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" "text", "p_message" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" "text", "p_message" "text", "p_data" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" "text", "p_message" "text", "p_data" "jsonb") IS 'Cria uma notificação para um usuário';



CREATE OR REPLACE FUNCTION "public"."decrypt_cpf"("cpf_encrypted" "text", "encryption_key" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."decrypt_cpf"("cpf_encrypted" "text", "encryption_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."decrypt_cpf"("cpf_encrypted" "text", "encryption_key" "text") IS 'Descriptografa CPF. Apenas para admins com chave de criptografia.';



CREATE OR REPLACE FUNCTION "public"."encrypt_cpf"("cpf_plain" "text", "encryption_key" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."encrypt_cpf"("cpf_plain" "text", "encryption_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."encrypt_cpf"("cpf_plain" "text", "encryption_key" "text") IS 'Criptografa CPF com AES-256. Requer chave de criptografia.';



CREATE OR REPLACE FUNCTION "public"."expire_old_invitations"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.class_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."expire_old_invitations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."expire_old_invitations"() IS 'Marca convites pendentes como expirados após a data limite';



CREATE OR REPLACE FUNCTION "public"."expire_old_teacher_invites"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE teacher_invites
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;


ALTER FUNCTION "public"."expire_old_teacher_invites"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."expire_old_teacher_invites"() IS 'Marks expired pending invites as expired. Should be called periodically.';



CREATE OR REPLACE FUNCTION "public"."gdpr_delete_user_data"("target_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."gdpr_delete_user_data"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."gdpr_delete_user_data"("target_user_id" "uuid") IS 'Implementa direito ao esquecimento (LGPD Art. 18, VI). Anonimiza dados do usuário.';



CREATE OR REPLACE FUNCTION "public"."generate_invite_code"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    prefix VARCHAR(3);
    random_suffix VARCHAR(6);
    new_code VARCHAR(12);
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
BEGIN
    -- Se já tem código, não fazer nada
    IF NEW.invite_code IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Gerar código único
    LOOP
        -- Pegar primeiras 3 letras do nome (uppercase)
        prefix := UPPER(SUBSTRING(REGEXP_REPLACE(NEW.name, '[^a-zA-Z]', '', 'g'), 1, 3));
        IF LENGTH(prefix) < 3 THEN
            prefix := LPAD(prefix, 3, 'A');
        END IF;

        -- Gerar sufixo aleatório
        random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 6));
        
        -- Combinar
        new_code := prefix || '-' || random_suffix;

        -- Verificar se é único
        IF NOT EXISTS (SELECT 1 FROM public.classes WHERE invite_code = new_code) THEN
            NEW.invite_code := new_code;
            EXIT;
        END IF;

        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Não foi possível gerar código único após % tentativas', max_attempts;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_invite_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_class_attendance_rate"("p_class_id" "uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("total_students" integer, "total_classes" integer, "total_attendances" integer, "attendance_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH student_count AS (
    SELECT COUNT(*) as students
    FROM class_members
    WHERE class_id = p_class_id
  ),
  class_dates AS (
    SELECT COUNT(DISTINCT attended_date) as classes
    FROM class_attendance
    WHERE class_id = p_class_id
      AND (p_start_date IS NULL OR attended_date >= p_start_date)
      AND (p_end_date IS NULL OR attended_date <= p_end_date)
  ),
  attendance_count AS (
    SELECT COUNT(*) as attendances
    FROM class_attendance
    WHERE class_id = p_class_id
      AND (p_start_date IS NULL OR attended_date >= p_start_date)
      AND (p_end_date IS NULL OR attended_date <= p_end_date)
  )
  SELECT 
    sc.students::INTEGER,
    cd.classes::INTEGER,
    ac.attendances::INTEGER,
    CASE 
      WHEN sc.students > 0 AND cd.classes > 0 
      THEN ROUND((ac.attendances::NUMERIC / (sc.students * cd.classes) * 100), 2)
      ELSE 0
    END as rate
  FROM student_count sc, class_dates cd, attendance_count ac;
END;
$$;


ALTER FUNCTION "public"."get_class_attendance_rate"("p_class_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_class_attendance_rate"("p_class_id" "uuid", "p_start_date" "date", "p_end_date" "date") IS 'Calcula a taxa de presença de uma turma em um período';



CREATE OR REPLACE FUNCTION "public"."get_class_grade_stats"("p_class_id" "uuid") RETURNS TABLE("total_students" bigint, "total_activities" bigint, "total_submissions" bigint, "graded_submissions" bigint, "pending_submissions" bigint, "average_class_grade" numeric, "highest_student_avg" numeric, "lowest_student_avg" numeric, "submission_rate" numeric, "grading_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT cm.user_id) AS total_students,
    COUNT(DISTINCT a.id) AS total_activities,
    COUNT(DISTINCT s.id) AS total_submissions,
    COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END) AS graded_submissions,
    COUNT(DISTINCT CASE WHEN s.status IN ('submitted', 'pending') THEN s.id END) AS pending_submissions,
    ROUND(AVG(CASE WHEN s.status = 'graded' THEN s.grade END), 2) AS average_class_grade,
    (SELECT MAX(avg_grade) FROM (
      SELECT AVG(grade) AS avg_grade 
      FROM public.submissions s2
      JOIN public.activities a2 ON s2.activity_id = a2.id
      JOIN public.activity_class_assignments aca2 ON aca2.activity_id = a2.id
      WHERE aca2.class_id = p_class_id AND s2.status = 'graded'
      GROUP BY s2.student_id
    ) sub) AS highest_student_avg,
    (SELECT MIN(avg_grade) FROM (
      SELECT AVG(grade) AS avg_grade 
      FROM public.submissions s2
      JOIN public.activities a2 ON s2.activity_id = a2.id
      JOIN public.activity_class_assignments aca2 ON aca2.activity_id = a2.id
      WHERE aca2.class_id = p_class_id AND s2.status = 'graded'
      GROUP BY s2.student_id
    ) sub) AS lowest_student_avg,
    ROUND(
      COUNT(DISTINCT s.id)::DECIMAL / 
      NULLIF(COUNT(DISTINCT cm.user_id) * COUNT(DISTINCT a.id), 0) * 100, 
      2
    ) AS submission_rate,
    ROUND(
      COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.id END)::DECIMAL / 
      NULLIF(COUNT(DISTINCT s.id), 0) * 100, 
      2
    ) AS grading_rate
  FROM public.class_members cm
  LEFT JOIN public.activities a ON EXISTS (
    SELECT 1 FROM public.activity_class_assignments aca 
    WHERE aca.activity_id = a.id AND aca.class_id = p_class_id
  )
  LEFT JOIN public.submissions s ON s.activity_id = a.id AND s.student_id = cm.user_id
  WHERE cm.class_id = p_class_id AND cm.role = 'student';
END;
$$;


ALTER FUNCTION "public"."get_class_grade_stats"("p_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_class_grade_stats"("p_class_id" "uuid") IS 'Retorna estatísticas gerais da turma';



CREATE OR REPLACE FUNCTION "public"."get_class_grades_export"("p_class_id" "uuid") RETURNS TABLE("student_name" "text", "student_email" "text", "activity_title" "text", "activity_type" "text", "grade" numeric, "total_points" integer, "percentage" numeric, "status" "text", "submitted_at" timestamp with time zone, "graded_at" timestamp with time zone, "is_late" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.full_name AS student_name,
    p.email AS student_email,
    a.title AS activity_title,
    a.type AS activity_type,
    s.grade,
    a.max_score AS total_points,
    CASE 
      WHEN s.status = 'graded' THEN ROUND((s.grade / a.max_score) * 100, 2)
      ELSE NULL
    END AS percentage,
    s.status,
    s.submitted_at,
    s.graded_at,
    CASE 
      WHEN s.submitted_at > a.due_date THEN TRUE
      ELSE FALSE
    END AS is_late
  FROM public.class_members cm
  JOIN public.profiles p ON cm.user_id = p.id
  LEFT JOIN public.activities a ON EXISTS (
    SELECT 1 FROM public.activity_class_assignments aca 
    WHERE aca.activity_id = a.id AND aca.class_id = p_class_id
  )
  LEFT JOIN public.submissions s ON s.activity_id = a.id AND s.student_id = cm.user_id
  WHERE cm.class_id = p_class_id AND cm.role = 'student'
  ORDER BY p.full_name, a.title;
END;
$$;


ALTER FUNCTION "public"."get_class_grades_export"("p_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_class_grades_export"("p_class_id" "uuid") IS 'Prepara dados para exportação Excel/PDF';



CREATE OR REPLACE FUNCTION "public"."get_class_insights"("p_class_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_insights JSONB;
  v_avg_grade DECIMAL;
  v_submission_rate DECIMAL;
  v_grading_rate DECIMAL;
  v_engagement_score DECIMAL;
BEGIN
  -- Buscar métricas base
  SELECT 
    average_grade,
    submission_rate,
    grading_rate,
    (total_posts + total_comments)::DECIMAL / NULLIF(total_students, 0) AS engagement
  INTO v_avg_grade, v_submission_rate, v_grading_rate, v_engagement_score
  FROM public.class_performance_overview
  WHERE class_id = p_class_id;
  
  -- Gerar insights
  v_insights := jsonb_build_object(
    'performance_level', 
      CASE 
        WHEN v_avg_grade >= 80 THEN 'excellent'
        WHEN v_avg_grade >= 60 THEN 'good'
        WHEN v_avg_grade >= 40 THEN 'average'
        ELSE 'needs_attention'
      END,
    
    'submission_status',
      CASE
        WHEN v_submission_rate >= 90 THEN 'excellent'
        WHEN v_submission_rate >= 70 THEN 'good'
        WHEN v_submission_rate >= 50 THEN 'average'
        ELSE 'low'
      END,
    
    'grading_status',
      CASE
        WHEN v_grading_rate >= 90 THEN 'up_to_date'
        WHEN v_grading_rate >= 70 THEN 'good'
        WHEN v_grading_rate >= 50 THEN 'delayed'
        ELSE 'very_delayed'
      END,
    
    'engagement_level',
      CASE
        WHEN v_engagement_score >= 5 THEN 'very_high'
        WHEN v_engagement_score >= 3 THEN 'high'
        WHEN v_engagement_score >= 1 THEN 'medium'
        ELSE 'low'
      END,
    
    'recommendations', (
      SELECT jsonb_agg(rec)
      FROM (
        SELECT 'Média da turma está excelente!' AS rec WHERE v_avg_grade >= 80
        UNION ALL
        SELECT 'Considere atividades de reforço' WHERE v_avg_grade < 60
        UNION ALL
        SELECT 'Taxa de entrega baixa - envie lembretes' WHERE v_submission_rate < 70
        UNION ALL
        SELECT 'Correções atrasadas - priorize o painel de correções' WHERE v_grading_rate < 70
        UNION ALL
        SELECT 'Baixo engajamento - incentive participação no mural' WHERE v_engagement_score < 2
      ) AS recommendations
    )
  );
  
  RETURN v_insights;
END;
$$;


ALTER FUNCTION "public"."get_class_insights"("p_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_class_insights"("p_class_id" "uuid") IS 'Gera insights automáticos sobre a performance da turma';



CREATE OR REPLACE FUNCTION "public"."get_class_stats"("p_class_id" "uuid") RETURNS TABLE("total_students" integer, "total_teachers" integer, "total_activities" integer, "total_submissions" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM class_members WHERE class_id = p_class_id AND role = 'student'),
    (SELECT COUNT(*)::INTEGER FROM class_members WHERE class_id = p_class_id AND role = 'teacher'),
    (SELECT COUNT(*)::INTEGER FROM activity_class_assignments WHERE class_id = p_class_id),
    (SELECT COUNT(*)::INTEGER 
     FROM submissions s
     JOIN activity_class_assignments aca ON aca.activity_id = s.activity_id
     WHERE aca.class_id = p_class_id);
END;
$$;


ALTER FUNCTION "public"."get_class_stats"("p_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_class_stats"("p_class_id" "uuid") IS 'Retorna estatísticas completas de uma turma sem aplicar RLS';



CREATE OR REPLACE FUNCTION "public"."get_plagiarism_stats"("p_activity_id" "uuid") RETURNS TABLE("total_checks" bigint, "avg_plagiarism" numeric, "avg_ai_score" numeric, "high_plagiarism_count" bigint, "ai_generated_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(pc.id)::BIGINT as total_checks,
        AVG(pc.plagiarism_percentage)::NUMERIC as avg_plagiarism,
        AVG(pc.ai_score)::NUMERIC as avg_ai_score,
        COUNT(CASE WHEN pc.plagiarism_percentage >= 50 THEN 1 END)::BIGINT as high_plagiarism_count,
        COUNT(CASE WHEN pc.ai_generated THEN 1 END)::BIGINT as ai_generated_count
    FROM public.plagiarism_checks pc
    JOIN public.submissions s ON pc.submission_id = s.id
    WHERE s.activity_id = p_activity_id;
END;
$$;


ALTER FUNCTION "public"."get_plagiarism_stats"("p_activity_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_plagiarism_stats"("p_activity_id" "uuid") IS 'Retorna estatísticas de plágio de uma atividade';



CREATE OR REPLACE FUNCTION "public"."get_school_classes_safe"("school_id" "uuid") RETURNS TABLE("class_id" "uuid", "class_name" "text", "subject" "text", "color" "text", "teacher_name" "text", "student_count" bigint, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify caller is admin of this school
  IF NOT public.is_school_admin(auth.uid(), school_id) THEN
    RAISE EXCEPTION 'Access denied: not an admin of this school';
  END IF;
  
  RETURN QUERY
  SELECT 
    sc.class_id,
    c.name as class_name,
    c.subject,
    c.color,
    p.full_name as teacher_name,
    COALESCE(student_counts.count, 0) as student_count,
    sc.created_at
  FROM public.school_classes sc
  INNER JOIN public.classes c ON sc.class_id = c.id
  INNER JOIN public.profiles p ON c.created_by = p.id
  LEFT JOIN (
    SELECT 
      class_id, 
      COUNT(*) as count
    FROM public.class_members 
    WHERE role = 'student'
    GROUP BY class_id
  ) student_counts ON c.id = student_counts.class_id
  WHERE sc.school_id = get_school_classes_safe.school_id
  ORDER BY sc.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_school_classes_safe"("school_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_school_classes_safe"("school_id" "uuid") IS 'Safely retrieves classes for a school, with admin permission check';



CREATE OR REPLACE FUNCTION "public"."get_school_teachers_safe"("school_id" "uuid") RETURNS TABLE("user_id" "uuid", "full_name" "text", "email" "text", "avatar_url" "text", "status" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify caller is admin of this school
  IF NOT public.is_school_admin(auth.uid(), school_id) THEN
    RAISE EXCEPTION 'Access denied: not an admin of this school';
  END IF;
  
  RETURN QUERY
  SELECT 
    st.user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    st.status::TEXT,
    st.created_at
  FROM public.school_teachers st
  INNER JOIN public.profiles p ON st.user_id = p.id
  WHERE st.school_id = get_school_teachers_safe.school_id
  ORDER BY st.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_school_teachers_safe"("school_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_school_teachers_safe"("school_id" "uuid") IS 'Safely retrieves teachers for a school, with admin permission check';



CREATE OR REPLACE FUNCTION "public"."get_user_class_ids_direct"("p_user_id" "uuid") RETURNS "uuid"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT ARRAY_AGG(class_id) FROM class_members WHERE user_id = p_user_id; $$;


ALTER FUNCTION "public"."get_user_class_ids_direct"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_classes"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT class_id FROM class_members WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_classes"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_classes"() IS 'Retorna IDs das turmas do usuário';



CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_role"() IS 'Retorna o role do usuário autenticado sem causar recursão';



CREATE OR REPLACE FUNCTION "public"."get_user_school_safe"("user_id" "uuid") RETURNS TABLE("school_id" "uuid", "school_name" "text", "logo_url" "text", "settings" "jsonb", "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS policies
  -- This function runs with the privileges of the function owner (postgres)
  
  RETURN QUERY
  SELECT 
    s.id as school_id,
    s.name as school_name,
    s.logo_url,
    s.settings,
    sa.role::TEXT as role
  FROM public.schools s
  INNER JOIN public.school_admins sa ON s.id = sa.school_id
  WHERE sa.user_id = get_user_school_safe.user_id
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_user_school_safe"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_school_safe"("user_id" "uuid") IS 'Safely retrieves school information for a user, bypassing RLS recursion issues';



CREATE OR REPLACE FUNCTION "public"."get_user_total_xp"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(SUM(xp), 0)::INTEGER
  FROM public.xp_log
  WHERE user_id = p_user_id;
$$;


ALTER FUNCTION "public"."get_user_total_xp"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_total_xp"("p_user_id" "uuid") IS 'Retorna o XP total acumulado de um usuário';



CREATE OR REPLACE FUNCTION "public"."get_user_xp_history"("p_user_id" "uuid", "p_days" integer DEFAULT 30) RETURNS TABLE("date" "date", "total_xp" integer, "action_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT 
    created_at::DATE as date,
    SUM(xp)::INTEGER as total_xp,
    COUNT(*) as action_count
  FROM public.xp_log
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  GROUP BY created_at::DATE
  ORDER BY date DESC;
$$;


ALTER FUNCTION "public"."get_user_xp_history"("p_user_id" "uuid", "p_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_xp_history"("p_user_id" "uuid", "p_days" integer) IS 'Retorna histórico diário de XP dos últimos N dias';



CREATE OR REPLACE FUNCTION "public"."get_user_xp_today"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(SUM(xp), 0)::INTEGER
  FROM public.xp_log
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE;
$$;


ALTER FUNCTION "public"."get_user_xp_today"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_xp_today"("p_user_id" "uuid") IS 'Retorna o XP ganho pelo usuário no dia atual';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    cpf,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'cpf',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    -- ✅ FORÇA ATUALIZAÇÃO DO ROLE (não usa COALESCE que mantém o antigo)
    role = EXCLUDED.role,
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf),
    updated_at = NOW();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Cria ou atualiza perfil automaticamente quando um usuário é criado ou atualizado no auth.users';



CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hash_cpf"("cpf_plain" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  IF cpf_plain IS NULL OR cpf_plain = '' THEN
    RETURN NULL;
  END IF;
  
  -- Hash SHA-256 para busca
  RETURN encode(digest(cpf_plain, 'sha256'), 'hex');
END;
$$;


ALTER FUNCTION "public"."hash_cpf"("cpf_plain" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."hash_cpf"("cpf_plain" "text") IS 'Gera hash SHA-256 de CPF para busca sem exposição.';



CREATE OR REPLACE FUNCTION "public"."increment_post_views"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.class_posts
  SET views_count = views_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_post_views"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_template_usage"("template_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.feedback_templates
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = template_id;
END;
$$;


ALTER FUNCTION "public"."increment_template_usage"("template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_student_gamification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  student_role TEXT;
BEGIN
  -- Extrair role do raw_user_meta_data
  student_role := NEW.raw_user_meta_data->>'role';

  -- Apenas processar se for aluno
  IF student_role = 'student' THEN
    -- Criar perfil de gamificação
    INSERT INTO public.gamification_profiles (user_id, xp_total, level, current_streak, longest_streak)
    VALUES (NEW.id, 0, 1, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Inicializar missões
    INSERT INTO public.user_missions (user_id, mission_id, status, progress, reset_at)
    SELECT 
      NEW.id,
      mc.id,
      'active',
      jsonb_build_object('current', 0),
      CASE 
        WHEN mc.type = 'daily' THEN DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
        WHEN mc.type = 'weekly' THEN DATE_TRUNC('week', NOW()) + INTERVAL '1 week'
      END
    FROM public.missions_catalog mc
    ON CONFLICT (user_id, mission_id) DO NOTHING;

    RAISE NOTICE '✅ Gamification initialized for new student: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."initialize_student_gamification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_class_active_on_date"("p_class_id" "uuid", "p_date" "date") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_vacation_start DATE;
  v_vacation_end DATE;
  v_cancelled_dates DATE[];
  v_meeting_days TEXT[];
  v_day_of_week TEXT;
BEGIN
  -- Get class data
  SELECT vacation_start, vacation_end, cancelled_dates, meeting_days
  INTO v_vacation_start, v_vacation_end, v_cancelled_dates, v_meeting_days
  FROM classes
  WHERE id = p_class_id;

  -- Check if date is in vacation period
  IF v_vacation_start IS NOT NULL AND v_vacation_end IS NOT NULL THEN
    IF p_date >= v_vacation_start AND p_date <= v_vacation_end THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check if date is in cancelled dates
  IF v_cancelled_dates IS NOT NULL AND p_date = ANY(v_cancelled_dates) THEN
    RETURN FALSE;
  END IF;

  -- Check if day of week matches meeting_days
  v_day_of_week := LOWER(TO_CHAR(p_date, 'Day'));
  v_day_of_week := TRIM(v_day_of_week);
  
  -- Convert day names to english
  v_day_of_week := CASE v_day_of_week
    WHEN 'domingo' THEN 'sunday'
    WHEN 'segunda-feira' THEN 'monday'
    WHEN 'terça-feira' THEN 'tuesday'
    WHEN 'quarta-feira' THEN 'wednesday'
    WHEN 'quinta-feira' THEN 'thursday'
    WHEN 'sexta-feira' THEN 'friday'
    WHEN 'sábado' THEN 'saturday'
    ELSE TO_CHAR(p_date, 'Day')
  END;
  
  v_day_of_week := LOWER(TRIM(v_day_of_week));

  IF v_meeting_days IS NULL OR NOT (v_day_of_week = ANY(v_meeting_days)) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."is_class_active_on_date"("p_class_id" "uuid", "p_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_class_active_on_date"("p_class_id" "uuid", "p_date" "date") IS 'Verifica se uma aula está ativa em uma data específica (considera férias, cancelamentos e dias da semana)';



CREATE OR REPLACE FUNCTION "public"."is_class_member"("p_class_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM class_members 
    WHERE class_id = p_class_id 
      AND user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."is_class_member"("p_class_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_class_member"("p_class_id" "uuid", "p_user_id" "uuid") IS 'Verifica se usuário é membro de uma turma sem aplicar RLS';



CREATE OR REPLACE FUNCTION "public"."is_class_teacher"("p_class_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM classes 
    WHERE id = p_class_id 
      AND created_by = p_user_id
  ) OR EXISTS(
    SELECT 1 
    FROM class_members 
    WHERE class_id = p_class_id 
      AND user_id = p_user_id
      AND role = 'teacher'
  );
$$;


ALTER FUNCTION "public"."is_class_teacher"("p_class_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_class_teacher"("p_class_id" "uuid", "p_user_id" "uuid") IS 'Verifica se usuário é professor de uma turma sem aplicar RLS';



CREATE OR REPLACE FUNCTION "public"."is_class_teacher_direct"("p_class_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM classes
    WHERE id = p_class_id 
      AND teacher_id = p_user_id
  );
END;
$$;


ALTER FUNCTION "public"."is_class_teacher_direct"("p_class_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_school_active"("school_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  school_status TEXT;
BEGIN
  SELECT status INTO school_status
  FROM public.schools
  WHERE id = school_id_param;

  RETURN (school_status = 'active' OR school_status = 'trial');
END;
$$;


ALTER FUNCTION "public"."is_school_active"("school_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_school_active"("school_id_param" "uuid") IS 'Verifica se uma escola está ativa ou em período trial. Retorna FALSE se suspensa ou inativa.';



CREATE OR REPLACE FUNCTION "public"."is_school_admin"("user_id" "uuid", "school_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  IF school_id IS NULL THEN
    -- Check if user is admin of any school
    SELECT COUNT(*) INTO admin_count
    FROM public.school_admins sa
    WHERE sa.user_id = is_school_admin.user_id;
  ELSE
    -- Check if user is admin of specific school
    SELECT COUNT(*) INTO admin_count
    FROM public.school_admins sa
    WHERE sa.user_id = is_school_admin.user_id
      AND sa.school_id = is_school_admin.school_id;
  END IF;
  
  RETURN admin_count > 0;
END;
$$;


ALTER FUNCTION "public"."is_school_admin"("user_id" "uuid", "school_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_school_admin"("user_id" "uuid", "school_id" "uuid") IS 'Checks if a user is an admin of a school (or any school if school_id is null)';



CREATE OR REPLACE FUNCTION "public"."is_student"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'student'
  );
$$;


ALTER FUNCTION "public"."is_student"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_student"() IS 'Verifica se usuário é aluno';



CREATE OR REPLACE FUNCTION "public"."is_teacher"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'teacher'
  );
$$;


ALTER FUNCTION "public"."is_teacher"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_teacher"() IS 'Verifica se usuário é professor';



CREATE OR REPLACE FUNCTION "public"."is_user_class_teacher_direct"("p_user_id" "uuid", "p_class_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT EXISTS (SELECT 1 FROM classes WHERE id = p_class_id AND created_by = p_user_id); $$;


ALTER FUNCTION "public"."is_user_class_teacher_direct"("p_user_id" "uuid", "p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_in_class_direct"("p_user_id" "uuid", "p_class_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$ SELECT EXISTS (SELECT 1 FROM class_members WHERE user_id = p_user_id AND class_id = p_class_id); $$;


ALTER FUNCTION "public"."is_user_in_class_direct"("p_user_id" "uuid", "p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_class_attendance"("p_class_id" "uuid", "p_user_id" "uuid", "p_joined_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_attendance_id UUID;
  v_meeting_start TIME;
  v_tolerance_minutes INTEGER := 10;
BEGIN
  -- Get class start time
  SELECT meeting_start_time INTO v_meeting_start
  FROM classes
  WHERE id = p_class_id;

  -- Insert or update attendance
  INSERT INTO class_attendance (
    class_id,
    user_id,
    attended_date,
    joined_at,
    was_on_time
  ) VALUES (
    p_class_id,
    p_user_id,
    p_joined_at::DATE,
    p_joined_at,
    CASE 
      WHEN v_meeting_start IS NOT NULL THEN
        p_joined_at::TIME <= (v_meeting_start + (v_tolerance_minutes || ' minutes')::INTERVAL)
      ELSE true
    END
  )
  ON CONFLICT (class_id, user_id, attended_date)
  DO UPDATE SET
    joined_at = LEAST(class_attendance.joined_at, EXCLUDED.joined_at),
    was_on_time = class_attendance.was_on_time OR EXCLUDED.was_on_time
  RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$;


ALTER FUNCTION "public"."log_class_attendance"("p_class_id" "uuid", "p_user_id" "uuid", "p_joined_at" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_class_attendance"("p_class_id" "uuid", "p_user_id" "uuid", "p_joined_at" timestamp with time zone) IS 'Registra presença do aluno quando entra na aula (tolerância de 10 min)';



CREATE OR REPLACE FUNCTION "public"."log_class_member_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.class_member_history (
      class_id,
      user_id,
      action,
      role,
      performed_by,
      metadata
    ) VALUES (
      OLD.class_id,
      OLD.user_id,
      'removed',
      OLD.role,
      COALESCE(current_setting('app.current_user_id', true)::uuid, auth.uid()),
      jsonb_build_object('joined_at', OLD.joined_at, 'nickname', OLD.nickname)
    );
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.class_member_history (
      class_id,
      user_id,
      action,
      role,
      performed_by,
      metadata
    ) VALUES (
      NEW.class_id,
      NEW.user_id,
      'added',
      NEW.role,
      COALESCE(current_setting('app.current_user_id', true)::uuid, auth.uid()),
      jsonb_build_object('joined_at', NEW.joined_at, 'nickname', NEW.nickname)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO public.class_member_history (
      class_id,
      user_id,
      action,
      role,
      performed_by,
      metadata
    ) VALUES (
      NEW.class_id,
      NEW.user_id,
      'role_changed',
      NEW.role,
      COALESCE(current_setting('app.current_user_id', true)::uuid, auth.uid()),
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
    );
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_class_member_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_grade_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Só registra se a nota mudou
  IF (OLD.grade IS DISTINCT FROM NEW.grade) THEN
    INSERT INTO public.grade_history (
      submission_id,
      previous_grade,
      new_grade,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.grade,
      NEW.grade,
      auth.uid(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_grade_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_sensitive_data_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."log_sensitive_data_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_student"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_professor_id UUID;
    v_class_name TEXT;
    v_student_name TEXT;
BEGIN
    -- Buscar dados da turma e aluno
    SELECT c.professor_id, c.name INTO v_professor_id, v_class_name
    FROM public.classes c
    WHERE c.id = NEW.class_id;

    SELECT u.raw_user_meta_data->>'name' INTO v_student_name
    FROM auth.users u
    WHERE u.id = NEW.student_id;

    -- Criar notificação para o professor
    PERFORM public.create_notification(
        v_professor_id,
        'new_student',
        '👋 Novo Aluno na Turma',
        v_student_name || ' entrou na turma ' || v_class_name,
        jsonb_build_object(
            'classId', NEW.class_id,
            'studentId', NEW.student_id
        )
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_student"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_xp_gained"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."notify_xp_gained"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_xp_gained"() IS 'Trigger que cria notificação automática ao ganhar XP';



CREATE OR REPLACE FUNCTION "public"."publish_scheduled_posts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."publish_scheduled_posts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_missions_daily"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- TODO: implement mission state reset when schema defined
  perform 1;
end; $$;


ALTER FUNCTION "public"."reset_missions_daily"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_rag_vectors"("query_embedding" "public"."vector", "class_id_filter" "uuid", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "source_id" "uuid", "content_chunk" "text", "similarity" double precision, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    rv.id,
    rv.source_id,
    rv.content_chunk,
    1 - (rv.embedding <=> query_embedding) AS similarity,
    rv.metadata
  FROM rag_vectors rv
  JOIN rag_training_sources rts ON rts.id = rv.source_id
  WHERE rts.class_id = class_id_filter
    AND rts.is_active = true
    AND rts.embedding_status = 'completed'
    AND 1 - (rv.embedding <=> query_embedding) > match_threshold
  ORDER BY rv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."search_rag_vectors"("query_embedding" "public"."vector", "class_id_filter" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_rag_vectors"("query_embedding" "public"."vector", "class_id_filter" "uuid", "match_threshold" double precision, "match_count" integer) IS 'Busca vectors similares usando cosine similarity para RAG queries';



CREATE OR REPLACE FUNCTION "public"."set_gamification_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_gamification_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_submission_plagiarism_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- When a submission is created, check if plagiarism is enabled for the activity
  IF NEW.plagiarism_check_status IS NULL THEN
    SELECT 
      CASE 
        WHEN a.plagiarism_enabled = true THEN 'pending'
        ELSE 'not_required'
      END INTO NEW.plagiarism_check_status
    FROM public.activities a
    WHERE a.id = NEW.activity_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_submission_plagiarism_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_teacher_subscriptions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_teacher_subscriptions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_activity_with_transaction"("p_activity_id" "uuid", "p_user_id" "uuid", "p_submission_text" "text" DEFAULT NULL::"text", "p_attachments" "jsonb" DEFAULT '[]'::"jsonb", "p_grade" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_submission_id UUID;
  v_activity RECORD;
  v_xp INTEGER;
  v_result JSONB;
BEGIN
  -- 1. Buscar atividade
  SELECT * INTO v_activity
  FROM public.activities
  WHERE id = p_activity_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Atividade não encontrada');
  END IF;

  -- 2. Criar submissão
  INSERT INTO public.activity_submissions (
    activity_id,
    user_id,
    submission_text,
    attachments,
    grade,
    submitted_at,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_activity_id,
    p_user_id,
    p_submission_text,
    p_attachments,
    p_grade,
    NOW(),
    'submitted',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_submission_id;

  -- 3. Calcular XP baseado no prazo
  IF v_activity.due_date IS NOT NULL THEN
    IF NOW() < v_activity.due_date THEN
      -- No prazo ou antecipado
      IF NOW() < v_activity.due_date - INTERVAL '1 day' THEN
        v_xp := 20; -- Antecipado
      ELSE
        v_xp := 15; -- No prazo
      END IF;
      
      -- 4. Adicionar XP
      INSERT INTO public.xp_transactions (
        user_id,
        amount,
        source,
        metadata,
        created_at
      ) VALUES (
        p_user_id,
        v_xp,
        'submission',
        jsonb_build_object(
          'activity_id', p_activity_id,
          'submission_id', v_submission_id,
          'on_time', true
        ),
        NOW()
      );

      -- 5. Atualizar total de XP
      UPDATE public.gamification_profiles
      SET xp_total = xp_total + v_xp,
          updated_at = NOW()
      WHERE user_id = p_user_id;
    END IF;
  END IF;

  -- 6. Tracking de missões
  PERFORM public.track_mission_progress(p_user_id, 'submit', 1);

  -- 7. Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'xp_earned', COALESCE(v_xp, 0)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao submeter atividade: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."submit_activity_with_transaction"("p_activity_id" "uuid", "p_user_id" "uuid", "p_submission_text" "text", "p_attachments" "jsonb", "p_grade" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."submit_activity_with_transaction"("p_activity_id" "uuid", "p_user_id" "uuid", "p_submission_text" "text", "p_attachments" "jsonb", "p_grade" numeric) IS 'Submete atividade com XP e tracking em transação atômica';



CREATE OR REPLACE FUNCTION "public"."update_class_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_class_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_comment_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_comment_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_gamification_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_gamification_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.class_posts 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.class_posts 
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_post_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_post_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_reward_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_reward_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_teacher_invites_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_teacher_invites_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_view_activity"("p_activity_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    -- Usuário criou a atividade
    SELECT 1
    FROM activities a
    WHERE a.id = p_activity_id
      AND a.created_by = p_user_id
    LIMIT 1
  ) OR EXISTS (
    -- Usuário é membro de uma turma que tem essa atividade
    SELECT 1
    FROM activity_class_assignments aca
    INNER JOIN class_members cm ON cm.class_id = aca.class_id
    WHERE aca.activity_id = p_activity_id
      AND cm.user_id = p_user_id
    LIMIT 1
  );
$$;


ALTER FUNCTION "public"."user_can_view_activity"("p_activity_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_can_view_activity"("p_activity_id" "uuid", "p_user_id" "uuid") IS 'Função auxiliar para verificar se usuário pode ver uma atividade. Usada em RLS policies.';



CREATE OR REPLACE FUNCTION "public"."user_has_class_access"("p_class_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM class_members cm
    WHERE cm.class_id = p_class_id
      AND cm.user_id = p_user_id
    LIMIT 1
  );
$$;


ALTER FUNCTION "public"."user_has_class_access"("p_class_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_class_access"("p_class_id" "uuid", "p_user_id" "uuid") IS 'Função auxiliar para verificar se usuário tem acesso a uma turma. Usada em RLS policies.';



CREATE OR REPLACE FUNCTION "public"."user_is_class_teacher"("p_class_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes
    WHERE id = p_class_id
    AND created_by = p_user_id
  );
$$;


ALTER FUNCTION "public"."user_is_class_teacher"("p_class_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_teacher"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND role = 'teacher'
  );
$$;


ALTER FUNCTION "public"."user_is_teacher"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uuid_generate_v4"() RETURNS "uuid"
    LANGUAGE "sql"
    AS $$SELECT gen_random_uuid()$$;


ALTER FUNCTION "public"."uuid_generate_v4"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."uuid_generate_v4"() IS 'Shim mapping to gen_random_uuid() to ensure uuid_generate_v4() is available';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievements_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "rules" "jsonb" NOT NULL,
    "reward_xp" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."achievements_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "content" "jsonb" DEFAULT '{}'::"jsonb",
    "type" "text" DEFAULT 'assignment'::"text" NOT NULL,
    "due_date" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'draft'::"text",
    "max_score" numeric(5,2) DEFAULT 100.00,
    "instructions" "text",
    "plagiarism_enabled" boolean DEFAULT false,
    "is_group_activity" boolean DEFAULT false,
    "group_size" integer DEFAULT 1,
    "plagiarism_threshold" smallint DEFAULT 35,
    "weight" numeric(5,2) DEFAULT 1.0,
    "class_id" "uuid",
    "deleted_at" timestamp with time zone,
    "is_published" boolean DEFAULT false,
    CONSTRAINT "activities_plagiarism_threshold_check" CHECK (("plagiarism_threshold" = ANY (ARRAY[20, 35, 50]))),
    CONSTRAINT "activities_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"]))),
    CONSTRAINT "activities_type_check" CHECK (("type" = ANY (ARRAY['assignment'::"text", 'quiz'::"text", 'project'::"text"]))),
    CONSTRAINT "activities_weight_check" CHECK ((("weight" IS NULL) OR ("weight" > (0)::numeric)))
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


COMMENT ON TABLE "public"."activities" IS 'Atividades criadas por professores. Use status para controlar publicação.';



COMMENT ON COLUMN "public"."activities"."created_by" IS 'FK para profiles(id) - professor que criou a atividade';



COMMENT ON COLUMN "public"."activities"."status" IS 'Status da atividade: draft, published, archived';



COMMENT ON COLUMN "public"."activities"."max_score" IS 'Pontuação máxima da atividade (consolidado - era max_grade/total_points)';



COMMENT ON COLUMN "public"."activities"."plagiarism_enabled" IS 'When true, submissions for this activity will be automatically checked for plagiarism using Winston AI before being delivered to the teacher.';



COMMENT ON COLUMN "public"."activities"."weight" IS 'Peso da atividade para cálculo de média (use ESTE campo, não total_points)';



CREATE TABLE IF NOT EXISTS "public"."activity_class_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activity_class_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'student'::"text" NOT NULL,
    "nickname" "text",
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "class_members_role_check" CHECK (("role" = ANY (ARRAY['student'::"text", 'teacher'::"text"])))
);


ALTER TABLE "public"."class_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_members" IS 'Membros de turmas. RLS policies otimizadas em 2025-10-27 para resolver timeouts.';



COMMENT ON COLUMN "public"."class_members"."role" IS 'Papel do membro: student, monitor, etc.';



CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb",
    "grade" numeric(5,2),
    "feedback" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "submitted_at" timestamp with time zone,
    "graded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plagiarism_check_status" "text" DEFAULT 'pending'::"text",
    "plagiarism_checked_at" timestamp with time zone,
    "rubric_scores" "jsonb" DEFAULT '{}'::"jsonb",
    "late_penalty" numeric(5,2) DEFAULT 0,
    "auto_graded" boolean DEFAULT false,
    CONSTRAINT "submissions_grade_check" CHECK ((("grade" IS NULL) OR (("grade" >= (0)::numeric) AND ("grade" <= (10)::numeric)))),
    CONSTRAINT "submissions_plagiarism_check_status_check" CHECK (("plagiarism_check_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'failed'::"text", 'not_required'::"text"]))),
    CONSTRAINT "submissions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'submitted'::"text", 'graded'::"text"])))
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."submissions"."plagiarism_check_status" IS 'Status of plagiarism check: pending (waiting), in_progress (checking), completed (done), failed (error), not_required (activity has plagiarism disabled)';



COMMENT ON COLUMN "public"."submissions"."plagiarism_checked_at" IS 'Timestamp when plagiarism check was completed. NULL if not yet checked or not required.';



CREATE OR REPLACE VIEW "public"."activity_grades" AS
 SELECT "a"."id" AS "activity_id",
    "a"."title" AS "activity_title",
    "a"."type" AS "activity_type",
    "a"."max_score" AS "total_points",
    "a"."due_date",
    "a"."created_by" AS "teacher_id",
    "aca"."class_id",
    "count"(DISTINCT "s"."id") AS "total_submissions",
    "count"(DISTINCT
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."id"
            ELSE NULL::"uuid"
        END) AS "graded_count",
    "round"("avg"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END), 2) AS "average_grade",
    "max"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END) AS "highest_grade",
    "min"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END) AS "lowest_grade",
    "round"(((("count"(DISTINCT "s"."id"))::numeric / (NULLIF("count"(DISTINCT "cm"."user_id"), 0))::numeric) * (100)::numeric), 2) AS "submission_rate"
   FROM ((("public"."activities" "a"
     JOIN "public"."activity_class_assignments" "aca" ON (("aca"."activity_id" = "a"."id")))
     LEFT JOIN "public"."submissions" "s" ON (("s"."activity_id" = "a"."id")))
     LEFT JOIN "public"."class_members" "cm" ON ((("cm"."class_id" = "aca"."class_id") AND ("cm"."role" = 'student'::"text"))))
  GROUP BY "a"."id", "a"."title", "a"."type", "a"."max_score", "a"."due_date", "a"."created_by", "aca"."class_id";


ALTER VIEW "public"."activity_grades" OWNER TO "postgres";


COMMENT ON VIEW "public"."activity_grades" IS 'Estatísticas de notas por atividade';



CREATE TABLE IF NOT EXISTS "public"."answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "answer_json" "jsonb",
    "points_earned" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."application_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "level" integer DEFAULT 3 NOT NULL,
    "level_name" "text" DEFAULT 'INFO'::"text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "user_id" "uuid",
    "user_email" "text",
    "session_id" "text",
    "user_agent" "text",
    "url" "text",
    "environment" "text" DEFAULT 'production'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '90 days'::interval)
);


ALTER TABLE "public"."application_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."application_logs" IS 'Application logging for errors, warnings, and info messages';



CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "type" "text",
    "requirement_type" "text",
    "requirement_value" integer,
    "color" "text" DEFAULT '#8b5cf6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "badges_requirement_type_check" CHECK (("requirement_type" = ANY (ARRAY['xp'::"text", 'missions'::"text", 'activities'::"text", 'streak'::"text", 'grade'::"text", 'custom'::"text"]))),
    CONSTRAINT "badges_type_check" CHECK (("type" = ANY (ARRAY['level'::"text", 'achievement'::"text", 'special'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


COMMENT ON TABLE "public"."badges" IS 'Predefined badges available in the platform';



CREATE TABLE IF NOT EXISTS "public"."badges_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "icon_url" "text",
    "criteria" "jsonb"
);


ALTER TABLE "public"."badges_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "class_id" "uuid",
    "activity_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "attendees" "uuid"[] DEFAULT '{}'::"uuid"[],
    "location" "text",
    "is_recurring" boolean DEFAULT false,
    "recurrence_pattern" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "text" DEFAULT 'event'::"text",
    "teacher_id" "uuid",
    "participants" "jsonb" DEFAULT '[]'::"jsonb",
    "modality" "text",
    "meeting_link" "text",
    "color" "text" DEFAULT '#3B82F6'::"text",
    "summary" "text",
    "notes" "text",
    "is_registered" boolean DEFAULT false,
    "is_cancelled" boolean DEFAULT false,
    CONSTRAINT "calendar_events_modality_check" CHECK (("modality" = ANY (ARRAY['online'::"text", 'presential'::"text"]))),
    CONSTRAINT "calendar_events_type_check" CHECK (("type" = ANY (ARRAY['event'::"text", 'meeting'::"text", 'activity'::"text", 'deadline'::"text"]))),
    CONSTRAINT "check_end_after_start" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."calendar_events"."type" IS 'Type of calendar event: event, meeting, activity, or deadline';



COMMENT ON COLUMN "public"."calendar_events"."modality" IS 'Modalidade do evento: online ou presencial';



COMMENT ON COLUMN "public"."calendar_events"."meeting_link" IS 'Link da reunião online (Google Meet, Zoom, etc)';



COMMENT ON COLUMN "public"."calendar_events"."summary" IS 'Resumo do conteúdo ministrado na aula (preenchido após o evento)';



COMMENT ON COLUMN "public"."calendar_events"."is_registered" IS 'Indica se já foi feito o registro de presença desta aula';



COMMENT ON COLUMN "public"."calendar_events"."is_cancelled" IS 'Indica se o evento foi cancelado';



CREATE TABLE IF NOT EXISTS "public"."calendar_sync" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "google_calendar_id" "text",
    "google_event_id" "text",
    "sync_enabled" boolean DEFAULT true,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."calendar_sync" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_sync" IS 'Sincronização com Google Calendar por usuário/turma';



CREATE TABLE IF NOT EXISTS "public"."chatbot_config_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "config_snapshot" "jsonb" NOT NULL,
    "version_number" integer NOT NULL,
    "change_description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."chatbot_config_versions" OWNER TO "postgres";


COMMENT ON TABLE "public"."chatbot_config_versions" IS 'Stores version history of chatbot configurations for rollback functionality';



CREATE OR REPLACE VIEW "public"."class_activity_performance" AS
 SELECT "aca"."class_id",
    "a"."id" AS "activity_id",
    "a"."title" AS "activity_title",
    "a"."type" AS "activity_type",
    "a"."max_score" AS "total_points",
    "a"."due_date",
    "a"."created_by" AS "teacher_id",
    "count"(DISTINCT "cm"."user_id") AS "total_students",
    "count"(DISTINCT "s"."id") AS "total_submissions",
    "count"(DISTINCT
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."id"
            ELSE NULL::"uuid"
        END) AS "graded_count",
    "count"(DISTINCT
        CASE
            WHEN ("s"."status" = 'submitted'::"text") THEN "s"."id"
            ELSE NULL::"uuid"
        END) AS "pending_count",
    "round"(((("count"(DISTINCT "s"."id"))::numeric / (NULLIF("count"(DISTINCT "cm"."user_id"), 0))::numeric) * (100)::numeric), 2) AS "submission_rate",
    "round"("avg"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END), 2) AS "average_grade",
    "max"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END) AS "highest_grade",
    "min"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END) AS "lowest_grade",
    "count"(
        CASE
            WHEN ("s"."grade" >= ("a"."max_score" * 0.9)) THEN 1
            ELSE NULL::integer
        END) AS "excellent_count",
    "count"(
        CASE
            WHEN (("s"."grade" >= ("a"."max_score" * 0.7)) AND ("s"."grade" < ("a"."max_score" * 0.9))) THEN 1
            ELSE NULL::integer
        END) AS "good_count",
    "count"(
        CASE
            WHEN (("s"."grade" >= ("a"."max_score" * 0.5)) AND ("s"."grade" < ("a"."max_score" * 0.7))) THEN 1
            ELSE NULL::integer
        END) AS "average_count",
    "count"(
        CASE
            WHEN ("s"."grade" < ("a"."max_score" * 0.5)) THEN 1
            ELSE NULL::integer
        END) AS "below_average_count",
    "count"(
        CASE
            WHEN ("s"."submitted_at" <= "a"."due_date") THEN 1
            ELSE NULL::integer
        END) AS "on_time_count",
    "count"(
        CASE
            WHEN ("s"."submitted_at" > "a"."due_date") THEN 1
            ELSE NULL::integer
        END) AS "late_count",
    "round"("avg"((EXTRACT(epoch FROM ("s"."submitted_at" - "a"."created_at")) / (3600)::numeric)), 2) AS "avg_hours_to_submit"
   FROM ((("public"."activity_class_assignments" "aca"
     JOIN "public"."activities" "a" ON (("a"."id" = "aca"."activity_id")))
     LEFT JOIN "public"."class_members" "cm" ON ((("cm"."class_id" = "aca"."class_id") AND ("cm"."role" = 'student'::"text"))))
     LEFT JOIN "public"."submissions" "s" ON ((("s"."activity_id" = "a"."id") AND ("s"."student_id" = "cm"."user_id"))))
  GROUP BY "aca"."class_id", "a"."id", "a"."title", "a"."type", "a"."max_score", "a"."due_date", "a"."created_by";


ALTER VIEW "public"."class_activity_performance" OWNER TO "postgres";


COMMENT ON VIEW "public"."class_activity_performance" IS 'Performance detalhada por atividade';



CREATE TABLE IF NOT EXISTS "public"."class_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "calendar_event_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'present'::"text" NOT NULL,
    "attendance_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "class_attendance_status_check" CHECK (("status" = ANY (ARRAY['present'::"text", 'absent'::"text", 'late'::"text", 'excused'::"text"])))
);


ALTER TABLE "public"."class_attendance" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_attendance" IS 'Registro de presença dos alunos em aulas';



COMMENT ON COLUMN "public"."class_attendance"."calendar_event_id" IS 'Referência ao evento de calendário (aula) associado';



COMMENT ON COLUMN "public"."class_attendance"."status" IS 'Status da presença: present, absent, late, excused';



COMMENT ON COLUMN "public"."class_attendance"."attendance_date" IS 'Data da presença registrada';



CREATE TABLE IF NOT EXISTS "public"."class_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "file_url" "text",
    "file_type" "text",
    "file_size" bigint,
    "is_public" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category" "text",
    "tags" "text"[],
    "created_by" "uuid" NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."class_materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text",
    "description" "text",
    "color" "text" DEFAULT '#3B82F6'::"text",
    "room_number" "text",
    "student_capacity" integer DEFAULT 30,
    "created_by" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "school_id" "uuid",
    "invite_code" character varying(12),
    "banner_color" character varying(50) DEFAULT 'from-blue-500 to-purple-500'::character varying,
    "academic_year" integer,
    "course" "text",
    "period" "text",
    "grade_level" "text",
    "is_online" boolean DEFAULT false,
    "meeting_link" "text",
    "chatbot_enabled" boolean DEFAULT false,
    "meeting_days" "text"[],
    "meeting_start_time" time without time zone,
    "meeting_end_time" time without time zone,
    "vacation_start" "date",
    "vacation_end" "date",
    "cancelled_dates" "date"[],
    "grading_system" "text" DEFAULT '0-10'::"text" NOT NULL,
    "is_school_managed" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "check_grading_system" CHECK (("grading_system" = ANY (ARRAY['0-10'::"text", '0-100'::"text", 'A-F'::"text", 'pass-fail'::"text", 'excellent-poor'::"text"]))),
    CONSTRAINT "check_school_managed_requires_school_id" CHECK ((("is_school_managed" = false) OR (("is_school_managed" = true) AND ("school_id" IS NOT NULL))))
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


COMMENT ON TABLE "public"."classes" IS 'Turmas do sistema. Índices otimizados para acelerar queries de RLS.';



COMMENT ON COLUMN "public"."classes"."room_number" IS 'Número ou nome da sala física';



COMMENT ON COLUMN "public"."classes"."invite_code" IS 'Código único de convite (ex: MAT-ABC123)';



COMMENT ON COLUMN "public"."classes"."banner_color" IS 'Gradiente de cor do banner (formato Tailwind)';



COMMENT ON COLUMN "public"."classes"."course" IS 'Curso ou área de conhecimento da turma (ex: STEM, Linguagens)';



COMMENT ON COLUMN "public"."classes"."period" IS 'Período da turma (ex: morning, afternoon, night)';



COMMENT ON COLUMN "public"."classes"."grade_level" IS 'Nível/série da turma (ex: 1ano, 2medio, superior, livre)';



COMMENT ON COLUMN "public"."classes"."is_online" IS 'Indica se a turma é online ou presencial';



COMMENT ON COLUMN "public"."classes"."meeting_link" IS 'Link para reuniões online (Google Meet, Zoom, etc.)';



COMMENT ON COLUMN "public"."classes"."chatbot_enabled" IS 'Indica se o chatbot está habilitado para esta turma';



COMMENT ON COLUMN "public"."classes"."meeting_days" IS 'Dias da semana em que a aula ocorre (ex: ["monday", "wednesday"])';



COMMENT ON COLUMN "public"."classes"."meeting_start_time" IS 'Horário de início da aula (ex: 14:00)';



COMMENT ON COLUMN "public"."classes"."meeting_end_time" IS 'Horário de fim da aula (ex: 15:30)';



COMMENT ON COLUMN "public"."classes"."vacation_start" IS 'Data de início das férias da turma';



COMMENT ON COLUMN "public"."classes"."vacation_end" IS 'Data de fim das férias da turma';



COMMENT ON COLUMN "public"."classes"."cancelled_dates" IS 'Array de datas específicas em que a aula foi cancelada';



COMMENT ON COLUMN "public"."classes"."grading_system" IS 'Grading system used for the class: 0-10, 0-100, A-F, pass-fail, excellent-poor';



COMMENT ON COLUMN "public"."classes"."is_school_managed" IS 'Indicates if the class is managed by a school (true) or is an independent teacher class (false)';



COMMENT ON COLUMN "public"."classes"."settings" IS 'Configurações da turma em formato JSONB (chatbot_enabled, notifications_enabled, etc)';



CREATE OR REPLACE VIEW "public"."class_daily_activity" AS
 SELECT "c"."id" AS "class_id",
    "date_series"."date" AS "activity_date",
    "count"(DISTINCT "s"."id") AS "submissions_count",
    "count"(DISTINCT
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."id"
            ELSE NULL::"uuid"
        END) AS "graded_count",
    "round"("avg"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END), 2) AS "daily_average_grade",
    0 AS "posts_count",
    0 AS "comments_count",
    "count"(DISTINCT "cm"."id") AS "materials_count"
   FROM (((("public"."classes" "c"
     CROSS JOIN ( SELECT ("generate_series"((CURRENT_DATE - '30 days'::interval), (CURRENT_DATE)::timestamp without time zone, '1 day'::interval))::"date" AS "date") "date_series")
     LEFT JOIN "public"."activity_class_assignments" "aca" ON (("aca"."class_id" = "c"."id")))
     LEFT JOIN "public"."submissions" "s" ON ((("s"."activity_id" = "aca"."activity_id") AND (("s"."submitted_at")::"date" = "date_series"."date"))))
     LEFT JOIN "public"."class_materials" "cm" ON ((("cm"."class_id" = "c"."id") AND (("cm"."created_at")::"date" = "date_series"."date"))))
  GROUP BY "c"."id", "date_series"."date"
  ORDER BY "c"."id", "date_series"."date";


ALTER VIEW "public"."class_daily_activity" OWNER TO "postgres";


COMMENT ON VIEW "public"."class_daily_activity" IS 'Evolução diária de atividades nos últimos 30 dias';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'student'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cpf" "text",
    "age" integer,
    "email_confirmed" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "birth_date" "date",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['student'::"text", 'teacher'::"text", 'school'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Perfis de usuários. Queries otimizadas para usar user_metadata como fallback.';



COMMENT ON COLUMN "public"."profiles"."role" IS 'Tipo de usuário: student (aluno), teacher (professor), ou school (escola/admin)';



CREATE OR REPLACE VIEW "public"."class_grade_matrix" AS
 SELECT "cm"."class_id",
    "cm"."user_id" AS "student_id",
    "p"."full_name" AS "student_name",
    "a"."id" AS "activity_id",
    "a"."title" AS "activity_title",
    "a"."max_score" AS "total_points",
    "a"."due_date",
    "s"."id" AS "submission_id",
    "s"."grade",
    "s"."status",
    "s"."submitted_at",
    "s"."graded_at",
    "s"."feedback",
        CASE
            WHEN ("s"."submitted_at" > "a"."due_date") THEN true
            ELSE false
        END AS "is_late",
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "round"((("s"."grade" / "a"."max_score") * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "percentage"
   FROM ((("public"."class_members" "cm"
     JOIN "public"."profiles" "p" ON (("cm"."user_id" = "p"."id")))
     CROSS JOIN "public"."activities" "a")
     LEFT JOIN "public"."submissions" "s" ON ((("s"."activity_id" = "a"."id") AND ("s"."student_id" = "cm"."user_id"))))
  WHERE (("cm"."role" = 'student'::"text") AND (EXISTS ( SELECT 1
           FROM "public"."activity_class_assignments" "aca"
          WHERE (("aca"."activity_id" = "a"."id") AND ("aca"."class_id" = "cm"."class_id")))));


ALTER VIEW "public"."class_grade_matrix" OWNER TO "postgres";


COMMENT ON VIEW "public"."class_grade_matrix" IS 'Matriz completa aluno x atividade para tabela de notas';



CREATE TABLE IF NOT EXISTS "public"."class_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "invitee_email" "text" NOT NULL,
    "invitee_id" "uuid",
    "inviter_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "accepted_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    CONSTRAINT "class_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."class_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_invitations" IS 'Convites de professores para alunos entrarem em turmas';



COMMENT ON COLUMN "public"."class_invitations"."invitee_email" IS 'Email do aluno convidado';



COMMENT ON COLUMN "public"."class_invitations"."invitee_id" IS 'ID do aluno (se já tiver conta)';



COMMENT ON COLUMN "public"."class_invitations"."inviter_id" IS 'ID do professor que fez o convite';



COMMENT ON COLUMN "public"."class_invitations"."expires_at" IS 'Data de expiração do convite (7 dias padrão)';



COMMENT ON COLUMN "public"."class_invitations"."created_by" IS 'UUID do usuário que criou o convite';



CREATE TABLE IF NOT EXISTS "public"."class_member_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "role" "text" NOT NULL,
    "performed_by" "uuid" NOT NULL,
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "class_member_history_action_check" CHECK (("action" = ANY (ARRAY['added'::"text", 'removed'::"text", 'role_changed'::"text"]))),
    CONSTRAINT "class_member_history_role_check" CHECK (("role" = ANY (ARRAY['student'::"text", 'teacher'::"text"])))
);


ALTER TABLE "public"."class_member_history" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."class_performance_overview" AS
 SELECT "c"."id" AS "class_id",
    "c"."name" AS "class_name",
    "c"."created_by" AS "teacher_id",
    "count"(DISTINCT
        CASE
            WHEN ("cm"."role" = 'student'::"text") THEN "cm"."user_id"
            ELSE NULL::"uuid"
        END) AS "total_students",
    "count"(DISTINCT
        CASE
            WHEN ("cm"."role" = 'teacher'::"text") THEN "cm"."user_id"
            ELSE NULL::"uuid"
        END) AS "total_teachers",
    "count"(DISTINCT "aca"."activity_id") AS "total_activities",
    "count"(DISTINCT
        CASE
            WHEN ("a"."due_date" < "now"()) THEN "aca"."activity_id"
            ELSE NULL::"uuid"
        END) AS "expired_activities",
    "count"(DISTINCT
        CASE
            WHEN ("a"."due_date" >= "now"()) THEN "aca"."activity_id"
            ELSE NULL::"uuid"
        END) AS "active_activities",
    "count"(DISTINCT "s"."id") AS "total_submissions",
    "count"(DISTINCT
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."id"
            ELSE NULL::"uuid"
        END) AS "graded_submissions",
    "count"(DISTINCT
        CASE
            WHEN ("s"."status" = 'submitted'::"text") THEN "s"."id"
            ELSE NULL::"uuid"
        END) AS "pending_submissions",
    "round"("avg"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END), 2) AS "average_grade",
    "round"("avg"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN (("s"."grade" / "a"."max_score") * (100)::numeric)
            ELSE NULL::numeric
        END), 2) AS "average_percentage",
    "round"(((("count"(DISTINCT "s"."id"))::numeric / (NULLIF(("count"(DISTINCT "cm"."user_id") * "count"(DISTINCT "aca"."activity_id")), 0))::numeric) * (100)::numeric), 2) AS "submission_rate",
    "round"(((("count"(DISTINCT
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."id"
            ELSE NULL::"uuid"
        END))::numeric / (NULLIF("count"(DISTINCT "s"."id"), 0))::numeric) * (100)::numeric), 2) AS "grading_rate",
    0 AS "total_posts",
    0 AS "total_comments",
    "count"(DISTINCT "cm_mat"."id") AS "total_materials",
    "c"."created_at",
    "max"("s"."submitted_at") AS "last_submission_date",
    NULL::timestamp with time zone AS "last_post_date"
   FROM ((((("public"."classes" "c"
     LEFT JOIN "public"."class_members" "cm" ON (("cm"."class_id" = "c"."id")))
     LEFT JOIN "public"."activity_class_assignments" "aca" ON (("aca"."class_id" = "c"."id")))
     LEFT JOIN "public"."activities" "a" ON (("a"."id" = "aca"."activity_id")))
     LEFT JOIN "public"."submissions" "s" ON (("s"."activity_id" = "a"."id")))
     LEFT JOIN "public"."class_materials" "cm_mat" ON (("cm_mat"."class_id" = "c"."id")))
  GROUP BY "c"."id", "c"."name", "c"."created_by", "c"."created_at";


ALTER VIEW "public"."class_performance_overview" OWNER TO "postgres";


COMMENT ON VIEW "public"."class_performance_overview" IS 'Visão geral de performance da turma com todas métricas principais';



CREATE TABLE IF NOT EXISTS "public"."class_posts" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text",
    "content" "text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "is_pinned" boolean DEFAULT false,
    "comments_enabled" boolean DEFAULT true,
    "scheduled_for" timestamp with time zone,
    "published_at" timestamp with time zone,
    "views_count" integer DEFAULT 0,
    "likes_count" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "link_url" "text",
    "is_scheduled" boolean DEFAULT false,
    CONSTRAINT "class_posts_type_check" CHECK (("type" = ANY (ARRAY['announcement'::"text", 'activity'::"text", 'material'::"text", 'link'::"text", 'question'::"text"])))
);


ALTER TABLE "public"."class_posts" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_posts" IS 'Posts do mural de turmas';



CREATE TABLE IF NOT EXISTS "public"."class_rank_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "period" "public"."period_type" NOT NULL,
    "period_start_date" "date" NOT NULL,
    "period_end_date" "date" NOT NULL,
    "rank_data" "jsonb" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."class_rank_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_recordings" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "recorded_date" "date" NOT NULL,
    "recording_url" "text",
    "storage_path" "text",
    "duration_minutes" integer,
    "file_size_mb" numeric(10,2),
    "status" "text" DEFAULT 'processing'::"text",
    "google_drive_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "class_recordings_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'ready'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."class_recordings" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_recordings" IS 'Armazena gravações das aulas online';



CREATE TABLE IF NOT EXISTS "public"."class_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "join_code" character varying(8),
    "join_code_max_uses" integer,
    "join_code_expiration" timestamp with time zone,
    "join_code_uses_count" integer DEFAULT 0,
    "is_join_code_active" boolean DEFAULT true,
    "schedule" "jsonb" DEFAULT '[]'::"jsonb",
    "modality" "text" DEFAULT 'online'::"text",
    "meeting_link" "text",
    "address" "text",
    "chatbot_enabled" boolean DEFAULT false,
    "max_students" integer,
    "banner_color" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "class_settings_modality_check" CHECK (("modality" = ANY (ARRAY['online'::"text", 'presential'::"text"])))
);


ALTER TABLE "public"."class_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_settings" IS 'Configurações avançadas de turmas (código, horários, modalidade, chatbot)';



COMMENT ON COLUMN "public"."class_settings"."join_code" IS 'Código de convite único de 8 caracteres';



COMMENT ON COLUMN "public"."class_settings"."join_code_max_uses" IS 'Número máximo de usos do código (null = ilimitado)';



COMMENT ON COLUMN "public"."class_settings"."join_code_expiration" IS 'Data de expiração do código (null = nunca expira)';



COMMENT ON COLUMN "public"."class_settings"."join_code_uses_count" IS 'Contador de quantas vezes o código foi usado';



COMMENT ON COLUMN "public"."class_settings"."schedule" IS 'Array JSON com horários de aula: [{day, start_time, end_time}]';



COMMENT ON COLUMN "public"."class_settings"."modality" IS 'Modalidade das aulas: online ou presencial';



COMMENT ON COLUMN "public"."class_settings"."chatbot_enabled" IS 'Se o chatbot está ativo para esta turma';



CREATE OR REPLACE VIEW "public"."class_student_ranking" AS
 SELECT "cm"."class_id",
    "cm"."user_id" AS "student_id",
    "p"."full_name" AS "student_name",
    "p"."email" AS "student_email",
    "p"."avatar_url",
    "count"(DISTINCT "s"."id") AS "total_submissions",
    "count"(DISTINCT
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."id"
            ELSE NULL::"uuid"
        END) AS "graded_submissions",
    "round"("avg"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END), 2) AS "average_grade",
    "max"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END) AS "highest_grade",
    "min"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END) AS "lowest_grade",
    "round"("avg"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN (("s"."grade" / "a"."max_score") * (100)::numeric)
            ELSE NULL::numeric
        END), 2) AS "average_percentage",
    "count"(
        CASE
            WHEN ("s"."submitted_at" <= "a"."due_date") THEN 1
            ELSE NULL::integer
        END) AS "on_time_submissions",
    "count"(
        CASE
            WHEN ("s"."submitted_at" > "a"."due_date") THEN 1
            ELSE NULL::integer
        END) AS "late_submissions",
    0 AS "posts_created",
    0 AS "comments_made",
    "row_number"() OVER (PARTITION BY "cm"."class_id" ORDER BY ("avg"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN (("s"."grade" / "a"."max_score") * (100)::numeric)
            ELSE NULL::numeric
        END)) DESC NULLS LAST) AS "rank_position"
   FROM (((("public"."class_members" "cm"
     JOIN "public"."profiles" "p" ON (("p"."id" = "cm"."user_id")))
     LEFT JOIN "public"."activity_class_assignments" "aca" ON (("aca"."class_id" = "cm"."class_id")))
     LEFT JOIN "public"."activities" "a" ON (("a"."id" = "aca"."activity_id")))
     LEFT JOIN "public"."submissions" "s" ON ((("s"."activity_id" = "a"."id") AND ("s"."student_id" = "cm"."user_id"))))
  WHERE ("cm"."role" = 'student'::"text")
  GROUP BY "cm"."class_id", "cm"."user_id", "p"."full_name", "p"."email", "p"."avatar_url";


ALTER VIEW "public"."class_student_ranking" OWNER TO "postgres";


COMMENT ON VIEW "public"."class_student_ranking" IS 'Ranking de alunos por performance na turma';



CREATE TABLE IF NOT EXISTS "public"."comment_likes" (
    "comment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comment_likes" OWNER TO "postgres";


COMMENT ON TABLE "public"."comment_likes" IS 'Curtidas em comentários';



CREATE TABLE IF NOT EXISTS "public"."discussion_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "discussion_id" "uuid" NOT NULL,
    "parent_message_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "deleted_by" "uuid",
    "deleted_at" timestamp with time zone,
    "is_edited" boolean DEFAULT false,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."discussion_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "activity_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "is_pinned" boolean DEFAULT false,
    "is_locked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "content" "text"
);


ALTER TABLE "public"."discussions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_participants" (
    "event_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "score" numeric,
    "rank" integer,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events_competitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "rules" "jsonb",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."events_competitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_templates" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text",
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feedback_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."feedback_templates" IS 'Templates reutilizáveis de feedback';



CREATE TABLE IF NOT EXISTS "public"."focus_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone,
    "duration_min" integer,
    "technique" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "focus_sessions_technique_check" CHECK (("technique" = ANY (ARRAY['pomodoro25'::"text", 'pomodoro50'::"text", 'pomodoro30'::"text"])))
);


ALTER TABLE "public"."focus_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gamification_profiles" (
    "user_id" "uuid" NOT NULL,
    "xp_total" integer DEFAULT 0 NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL,
    "last_activity_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gamification_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."gamification_profiles" IS 'Perfis de gamificação dos usuários com XP, nível e badges';



COMMENT ON COLUMN "public"."gamification_profiles"."level" IS 'Nível atual do usuário';



CREATE TABLE IF NOT EXISTS "public"."grade_history" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "previous_grade" numeric(5,2),
    "new_grade" numeric(5,2) NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "reason" "text",
    "changed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."grade_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."grade_history" IS 'Histórico de alterações de notas';



CREATE OR REPLACE VIEW "public"."grading_queue" AS
 SELECT "s"."id" AS "submission_id",
    "s"."activity_id",
    "s"."student_id",
    "s"."status",
    "s"."submitted_at",
    "s"."grade",
    "s"."graded_at",
    "a"."title" AS "activity_title",
    "a"."due_date",
    "a"."max_score" AS "total_points",
    "a"."created_by" AS "teacher_id",
    "p"."full_name" AS "student_name",
        CASE
            WHEN ("s"."submitted_at" > "a"."due_date") THEN true
            ELSE false
        END AS "is_late",
        CASE
            WHEN ("a"."due_date" < "now"()) THEN 'urgent'::"text"
            WHEN ("a"."due_date" < ("now"() + '2 days'::interval)) THEN 'soon'::"text"
            ELSE 'normal'::"text"
        END AS "priority"
   FROM (("public"."submissions" "s"
     JOIN "public"."activities" "a" ON (("s"."activity_id" = "a"."id")))
     JOIN "public"."profiles" "p" ON (("s"."student_id" = "p"."id")))
  WHERE ("s"."status" = ANY (ARRAY['submitted'::"text", 'pending'::"text"]))
  ORDER BY
        CASE
            WHEN ("a"."due_date" < "now"()) THEN 1
            WHEN ("a"."due_date" < ("now"() + '2 days'::interval)) THEN 2
            ELSE 3
        END, "s"."submitted_at";


ALTER VIEW "public"."grading_queue" OWNER TO "postgres";


COMMENT ON VIEW "public"."grading_queue" IS 'Fila de correções priorizadas';



CREATE TABLE IF NOT EXISTS "public"."grading_rubrics" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "activity_id" "uuid",
    "teacher_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "criteria" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total_weight" integer DEFAULT 100,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."grading_rubrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."grading_rubrics" IS 'Rubricas de avaliação com critérios e pesos';



CREATE TABLE IF NOT EXISTS "public"."invite_code_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "code" character varying(8) NOT NULL,
    "uses_count" integer DEFAULT 0,
    "deactivated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invite_code_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."invite_code_history" IS 'Histórico de códigos de convite desativados';



CREATE TABLE IF NOT EXISTS "public"."logger" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "level" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "user_id" "uuid",
    "error_stack" "text",
    "error_name" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "logger_level_check" CHECK (("level" = ANY (ARRAY['info'::"text", 'warn'::"text", 'error'::"text", 'debug'::"text"])))
);


ALTER TABLE "public"."logger" OWNER TO "postgres";


COMMENT ON TABLE "public"."logger" IS 'Application logs for monitoring and debugging';



CREATE TABLE IF NOT EXISTS "public"."material_class_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."material_class_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "left_at" timestamp with time zone,
    "status" "text" DEFAULT 'invited'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meeting_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "meeting_url" "text",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "is_recurring" boolean DEFAULT false,
    "recurrence_pattern" "jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "external_meeting_url" "text",
    "meeting_type" "text" DEFAULT 'external'::"text",
    CONSTRAINT "meetings_meeting_type_check" CHECK (("meeting_type" = ANY (ARRAY['external'::"text", 'agora'::"text", 'whiteboard'::"text"])))
);


ALTER TABLE "public"."meetings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."meetings"."external_meeting_url" IS 'Link externo para Google Meet, Zoom, Teams, etc';



COMMENT ON COLUMN "public"."meetings"."meeting_type" IS 'Tipo de reunião: external (link), agora (deprecated), whiteboard';



CREATE TABLE IF NOT EXISTS "public"."missions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "class_id" "uuid",
    "created_by" "uuid",
    "xp_reward" integer DEFAULT 0,
    "difficulty" "text",
    "status" "text" DEFAULT 'active'::"text",
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "missions_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"]))),
    CONSTRAINT "missions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."missions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."missions_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."mission_type" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "rules" "jsonb" NOT NULL,
    "reward_xp" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."missions_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "template" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_logs" IS 'Log de notificações enviadas para evitar duplicatas';



COMMENT ON COLUMN "public"."notification_logs"."metadata" IS 'Dados adicionais incluindo reminder_key para identificar lembretes únicos';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "action_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'success'::"text", 'warning'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Notificações do sistema. Use is_read para controlar leitura.';



COMMENT ON COLUMN "public"."notifications"."type" IS 'Tipo: plagiarism_alert, ai_detection, activity_submitted, grade_received, deadline_approaching, class_invitation, new_material, comment_received, system';



COMMENT ON COLUMN "public"."notifications"."is_read" IS 'Status de leitura (consolidado - era read/is_read)';



COMMENT ON COLUMN "public"."notifications"."data" IS 'Dados adicionais em formato JSON';



CREATE TABLE IF NOT EXISTS "public"."plagiarism_checks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "plagiarism_percentage" integer NOT NULL,
    "ai_generated" boolean DEFAULT false,
    "ai_score" integer DEFAULT 0,
    "sources" "jsonb" DEFAULT '[]'::"jsonb",
    "raw_data" "jsonb" DEFAULT '{}'::"jsonb",
    "checked_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "plagiarism_checks_ai_score_check" CHECK ((("ai_score" >= 0) AND ("ai_score" <= 100))),
    CONSTRAINT "plagiarism_checks_plagiarism_percentage_check" CHECK ((("plagiarism_percentage" >= 0) AND ("plagiarism_percentage" <= 100)))
);


ALTER TABLE "public"."plagiarism_checks" OWNER TO "postgres";


COMMENT ON TABLE "public"."plagiarism_checks" IS 'Histórico de verificações de plágio via Winston AI';



COMMENT ON COLUMN "public"."plagiarism_checks"."plagiarism_percentage" IS 'Porcentagem de plágio detectado (0-100)';



COMMENT ON COLUMN "public"."plagiarism_checks"."ai_generated" IS 'Se o texto foi gerado por IA';



COMMENT ON COLUMN "public"."plagiarism_checks"."ai_score" IS 'Pontuação de detecção de IA (0-100)';



COMMENT ON COLUMN "public"."plagiarism_checks"."sources" IS 'Array de fontes encontradas em formato JSON';



CREATE TABLE IF NOT EXISTS "public"."plagiarism_checks_v2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "activity_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "similarity_percentage" numeric(5,2) DEFAULT 0.00 NOT NULL,
    "plagiarism_severity" "text" DEFAULT 'none'::"text" NOT NULL,
    "sources" "jsonb" DEFAULT '[]'::"jsonb",
    "report_url" "text",
    "checked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "plagiarism_checks_v2_plagiarism_severity_check" CHECK (("plagiarism_severity" = ANY (ARRAY['none'::"text", 'low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."plagiarism_checks_v2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plagiarism_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid",
    "error_message" "text",
    "error_stack" "text",
    "request_data" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."plagiarism_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."plagiarism_logs" IS 'Logs de erros e auditoria de verificações de plágio';



CREATE TABLE IF NOT EXISTS "public"."post_comments" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "parent_comment_id" "uuid",
    "likes_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."post_comments" IS 'Comentários em posts';



CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_likes" OWNER TO "postgres";


COMMENT ON TABLE "public"."post_likes" IS 'Curtidas em posts';



CREATE TABLE IF NOT EXISTS "public"."post_views" (
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_views" OWNER TO "postgres";


COMMENT ON TABLE "public"."post_views" IS 'Registro de visualizações de posts';



CREATE OR REPLACE VIEW "public"."profiles_with_age" AS
 SELECT "id",
    "email",
    "full_name",
    "avatar_url",
    "role",
    "created_at",
    "updated_at",
    "cpf",
    "age",
    "email_confirmed",
    "is_active",
    "birth_date",
    "public"."calculate_age"("birth_date") AS "calculated_age"
   FROM "public"."profiles" "p";


ALTER VIEW "public"."profiles_with_age" OWNER TO "postgres";


COMMENT ON VIEW "public"."profiles_with_age" IS 'View com idade calculada dinamicamente. Usar ao invés de profiles.age diretamente.';



CREATE TABLE IF NOT EXISTS "public"."question_bank" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid",
    "school_id" "uuid",
    "question_text" "text" NOT NULL,
    "question_type" "text" NOT NULL,
    "options" "jsonb",
    "correct_answer" "text",
    "difficulty" "text",
    "subject" "text",
    "topic" "text",
    "tags" "text"[],
    "status" "text" DEFAULT 'draft'::"text",
    "uses_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "question_bank_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"]))),
    CONSTRAINT "question_bank_question_type_check" CHECK (("question_type" = ANY (ARRAY['multiple_choice'::"text", 'true_false'::"text", 'short_answer'::"text", 'essay'::"text"]))),
    CONSTRAINT "question_bank_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."question_bank" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_assignments" (
    "quiz_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quiz_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "answers" "jsonb",
    "score" numeric,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "type" "public"."quiz_question_type" NOT NULL,
    "prompt" "text" NOT NULL,
    "options" "jsonb",
    "answer" "jsonb",
    "explanation" "text",
    "position" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_meta" "jsonb",
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "is_public" boolean DEFAULT false NOT NULL,
    CONSTRAINT "quizzes_source_type_check" CHECK (("source_type" = ANY (ARRAY['text'::"text", 'file'::"text", 'url'::"text", 'activity'::"text"])))
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_training_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "material_id" "uuid",
    "file_url" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text",
    "is_active" boolean DEFAULT true,
    "content_extracted" "text",
    "embedding_status" "text" DEFAULT 'pending'::"text",
    "vector_ids" "jsonb",
    "added_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "activity_id" "uuid",
    CONSTRAINT "check_source_type" CHECK (((("material_id" IS NOT NULL) AND ("activity_id" IS NULL)) OR (("material_id" IS NULL) AND ("activity_id" IS NOT NULL))))
);


ALTER TABLE "public"."rag_training_sources" OWNER TO "postgres";


COMMENT ON COLUMN "public"."rag_training_sources"."activity_id" IS 'Reference to activity used as training source. Mutually exclusive with material_id.';



COMMENT ON CONSTRAINT "check_source_type" ON "public"."rag_training_sources" IS 'Ensures exactly one of material_id or activity_id is set, never both or neither.';



CREATE TABLE IF NOT EXISTS "public"."rag_vectors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_id" "uuid" NOT NULL,
    "content_chunk" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "chunk_index" integer DEFAULT 0 NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rag_vectors" OWNER TO "postgres";


COMMENT ON TABLE "public"."rag_vectors" IS 'Armazena embeddings gerados para RAG (Retrieval-Augmented Generation)';



COMMENT ON COLUMN "public"."rag_vectors"."embedding" IS 'Vector embedding de 1536 dimensões (OpenAI text-embedding-3-small)';



CREATE TABLE IF NOT EXISTS "public"."reward_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "scope" "text",
    "scope_id" "uuid",
    "reward_type" "text",
    "reward_name" "text" NOT NULL,
    "reward_description" "text",
    "reward_value" numeric,
    "reward_xp" integer,
    "is_active" boolean DEFAULT true,
    "conditions" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reward_settings_reward_type_check" CHECK (("reward_type" = ANY (ARRAY['top_rank_bonus'::"text", 'streak_bonus'::"text", 'perfect_score'::"text", 'mission_complete'::"text", 'custom'::"text"]))),
    CONSTRAINT "reward_settings_scope_check" CHECK (("scope" = ANY (ARRAY['school'::"text", 'class'::"text"])))
);


ALTER TABLE "public"."reward_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."reward_settings" IS 'Configurable rewards by schools and teachers';



CREATE TABLE IF NOT EXISTS "public"."school_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "school_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "school_admins_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."school_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "audience" "jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "publish_at" timestamp with time zone
);


ALTER TABLE "public"."school_announcements" OWNER TO "postgres";


COMMENT ON COLUMN "public"."school_announcements"."publish_at" IS 'Data e hora programada para publicação do comunicado';



CREATE TABLE IF NOT EXISTS "public"."school_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."school_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_teachers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "monthly_cost" numeric(10,2),
    CONSTRAINT "school_teachers_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'pending'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."school_teachers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "activated_at" timestamp with time zone,
    "suspended_at" timestamp with time zone,
    "suspension_reason" "text",
    CONSTRAINT "schools_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'suspended'::"text", 'trial'::"text"])))
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


COMMENT ON COLUMN "public"."schools"."status" IS 'Status da escola: active (ativa), inactive (inativa), suspended (suspensa por falta de pagamento), trial (período de teste)';



CREATE TABLE IF NOT EXISTS "public"."sensitive_data" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cpf_encrypted" "text",
    "cpf_hash" "text",
    "birth_date" "date",
    "phone_encrypted" "text",
    "address_encrypted" "text",
    "encryption_version" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sensitive_data" OWNER TO "postgres";


COMMENT ON TABLE "public"."sensitive_data" IS 'Dados sensíveis criptografados (LGPD compliance). CPF, telefone e endereço devem sempre ser criptografados.';



COMMENT ON COLUMN "public"."sensitive_data"."cpf_encrypted" IS 'CPF criptografado com AES-256. Use decrypt_cpf() para ler.';



COMMENT ON COLUMN "public"."sensitive_data"."cpf_hash" IS 'Hash SHA-256 do CPF para busca sem descriptografar.';



COMMENT ON COLUMN "public"."sensitive_data"."birth_date" IS 'Data de nascimento. Use calculate_age() para obter idade.';



CREATE TABLE IF NOT EXISTS "public"."sensitive_data_access_log" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "accessed_by" "uuid" NOT NULL,
    "access_type" "text" NOT NULL,
    "field_name" "text",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sensitive_data_access_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_alerts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "alert_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "details" "jsonb",
    "resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "student_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['low_grade'::"text", 'late_submissions'::"text", 'plagiarism'::"text", 'no_submissions'::"text"]))),
    CONSTRAINT "student_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['attention'::"text", 'warning'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."student_alerts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."student_grades" AS
 SELECT "cm"."class_id",
    "cm"."user_id" AS "student_id",
    "p"."full_name" AS "student_name",
    "p"."email" AS "student_email",
    "p"."avatar_url" AS "student_avatar",
    "count"(DISTINCT "s"."id") AS "total_submissions",
    "count"(DISTINCT
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."id"
            ELSE NULL::"uuid"
        END) AS "graded_submissions",
    "round"("avg"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE NULL::numeric
        END), 2) AS "average_grade",
    "round"((("sum"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "s"."grade"
            ELSE (0)::numeric
        END) / NULLIF("sum"(
        CASE
            WHEN ("s"."status" = 'graded'::"text") THEN "a"."max_score"
            ELSE (0)::numeric
        END), (0)::numeric)) * (100)::numeric), 2) AS "overall_percentage",
    "count"(
        CASE
            WHEN ("s"."status" = 'submitted'::"text") THEN 1
            ELSE NULL::integer
        END) AS "pending_count",
    "max"("s"."submitted_at") AS "last_submission_date"
   FROM ((("public"."class_members" "cm"
     JOIN "public"."profiles" "p" ON (("cm"."user_id" = "p"."id")))
     LEFT JOIN "public"."activities" "a" ON ((EXISTS ( SELECT 1
           FROM "public"."activity_class_assignments" "aca"
          WHERE (("aca"."activity_id" = "a"."id") AND ("aca"."class_id" = "cm"."class_id"))))))
     LEFT JOIN "public"."submissions" "s" ON ((("s"."activity_id" = "a"."id") AND ("s"."student_id" = "cm"."user_id"))))
  WHERE ("cm"."role" = 'student'::"text")
  GROUP BY "cm"."class_id", "cm"."user_id", "p"."full_name", "p"."email", "p"."avatar_url";


ALTER VIEW "public"."student_grades" OWNER TO "postgres";


COMMENT ON VIEW "public"."student_grades" IS 'Resumo de notas por aluno em cada turma';



CREATE OR REPLACE VIEW "public"."student_plagiarism_stats" WITH ("security_invoker"='true') AS
 SELECT "s"."student_id",
    "count"("pc"."id") AS "total_checks",
    ("avg"("pc"."plagiarism_percentage"))::numeric(5,2) AS "avg_plagiarism",
    ("avg"("pc"."ai_score"))::numeric(5,2) AS "avg_ai_score",
    "count"(
        CASE
            WHEN ("pc"."plagiarism_percentage" >= 50) THEN 1
            ELSE NULL::integer
        END) AS "high_plagiarism_count",
    "count"(
        CASE
            WHEN "pc"."ai_generated" THEN 1
            ELSE NULL::integer
        END) AS "ai_generated_count"
   FROM ("public"."submissions" "s"
     LEFT JOIN "public"."plagiarism_checks" "pc" ON (("s"."id" = "pc"."submission_id")))
  GROUP BY "s"."student_id";


ALTER VIEW "public"."student_plagiarism_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."student_plagiarism_stats" IS 'Estatísticas de plágio agregadas por aluno';



CREATE OR REPLACE VIEW "public"."submissions_pending_plagiarism" WITH ("security_invoker"='true') AS
 SELECT "s"."id" AS "submission_id",
    "s"."activity_id",
    "s"."student_id",
    "s"."submitted_at",
    "s"."plagiarism_check_status",
    "a"."title" AS "activity_title",
    "a"."plagiarism_enabled",
    "c"."id" AS "class_id",
    "c"."name" AS "class_name"
   FROM ((("public"."submissions" "s"
     JOIN "public"."activities" "a" ON (("s"."activity_id" = "a"."id")))
     JOIN "public"."activity_class_assignments" "aca" ON (("a"."id" = "aca"."activity_id")))
     JOIN "public"."classes" "c" ON (("aca"."class_id" = "c"."id")))
  WHERE (("s"."plagiarism_check_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text"])) AND ("a"."plagiarism_enabled" = true));


ALTER VIEW "public"."submissions_pending_plagiarism" OWNER TO "postgres";


COMMENT ON VIEW "public"."submissions_pending_plagiarism" IS 'View showing all submissions waiting for or currently undergoing plagiarism checks';



CREATE TABLE IF NOT EXISTS "public"."teacher_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "teacher_name" "text" NOT NULL,
    "invite_token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "teacher_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."teacher_invites" OWNER TO "postgres";


COMMENT ON TABLE "public"."teacher_invites" IS 'Stores invitations sent by schools to teachers via email';



CREATE TABLE IF NOT EXISTS "public"."teacher_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "max_classes" integer DEFAULT 3 NOT NULL,
    "max_students_per_class" integer DEFAULT 30 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "teacher_subscriptions_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['free'::"text", 'basic'::"text", 'pro'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "teacher_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'expired'::"text", 'trial'::"text"])))
);


ALTER TABLE "public"."teacher_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."teacher_subscriptions" IS 'Planos de assinatura para professores criarem turmas independentes (fora de escolas)';



CREATE OR REPLACE VIEW "public"."unread_notifications_count" AS
 SELECT "user_id",
    "count"(*) AS "count"
   FROM "public"."notifications"
  WHERE ("is_read" = false)
  GROUP BY "user_id";


ALTER VIEW "public"."unread_notifications_count" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "user_id" "uuid" NOT NULL,
    "achievement_id" "uuid" NOT NULL,
    "progress" "jsonb",
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "user_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_badges" IS 'Badges earned by users';



CREATE TABLE IF NOT EXISTS "public"."user_missions" (
    "user_id" "uuid" NOT NULL,
    "mission_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "progress" "jsonb",
    "reset_at" timestamp with time zone,
    CONSTRAINT "user_missions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."user_missions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_class_membership" WITH ("security_invoker"='true') AS
 SELECT "class_id",
    "user_id",
    "role"
   FROM "public"."class_members" "cm";


ALTER VIEW "public"."v_class_membership" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."xp_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "xp" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "xp_log_xp_check" CHECK (("xp" <> 0))
);


ALTER TABLE "public"."xp_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."xp_log" IS 'Log de XP ganho pelos usuários. Usado para rankings e gamificação.';



COMMENT ON COLUMN "public"."xp_log"."id" IS 'Identificador único do registro de XP';



COMMENT ON COLUMN "public"."xp_log"."user_id" IS 'ID do usuário que recebeu o XP';



COMMENT ON COLUMN "public"."xp_log"."source" IS 'Descrição da ação que gerou o XP (ex: "Atividade submetida")';



COMMENT ON COLUMN "public"."xp_log"."xp" IS 'Quantidade de XP ganha (deve ser positiva)';



COMMENT ON COLUMN "public"."xp_log"."created_at" IS 'Data e hora em que o XP foi ganho';



COMMENT ON COLUMN "public"."xp_log"."metadata" IS 'Metadados JSON (consolidado - era meta/metadata)';



ALTER TABLE ONLY "public"."achievements_catalog"
    ADD CONSTRAINT "achievements_catalog_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."achievements_catalog"
    ADD CONSTRAINT "achievements_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_class_assignments"
    ADD CONSTRAINT "activity_class_assignments_activity_id_class_id_key" UNIQUE ("activity_id", "class_id");



ALTER TABLE ONLY "public"."activity_class_assignments"
    ADD CONSTRAINT "activity_class_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."application_logs"
    ADD CONSTRAINT "application_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badges_catalog"
    ADD CONSTRAINT "badges_catalog_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."badges_catalog"
    ADD CONSTRAINT "badges_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_sync"
    ADD CONSTRAINT "calendar_sync_class_id_user_id_key" UNIQUE ("class_id", "user_id");



ALTER TABLE ONLY "public"."calendar_sync"
    ADD CONSTRAINT "calendar_sync_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_config_versions"
    ADD CONSTRAINT "chatbot_config_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_attendance"
    ADD CONSTRAINT "class_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_invitations"
    ADD CONSTRAINT "class_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_materials"
    ADD CONSTRAINT "class_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_member_history"
    ADD CONSTRAINT "class_member_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_class_id_user_id_key" UNIQUE ("class_id", "user_id");



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_posts"
    ADD CONSTRAINT "class_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_rank_snapshots"
    ADD CONSTRAINT "class_rank_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_recordings"
    ADD CONSTRAINT "class_recordings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_settings"
    ADD CONSTRAINT "class_settings_class_id_key" UNIQUE ("class_id");



ALTER TABLE ONLY "public"."class_settings"
    ADD CONSTRAINT "class_settings_join_code_key" UNIQUE ("join_code");



ALTER TABLE ONLY "public"."class_settings"
    ADD CONSTRAINT "class_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("comment_id", "user_id");



ALTER TABLE ONLY "public"."discussion_messages"
    ADD CONSTRAINT "discussion_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_pkey" PRIMARY KEY ("event_id", "user_id");



ALTER TABLE ONLY "public"."events_competitions"
    ADD CONSTRAINT "events_competitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_templates"
    ADD CONSTRAINT "feedback_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."focus_sessions"
    ADD CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gamification_profiles"
    ADD CONSTRAINT "gamification_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."grade_history"
    ADD CONSTRAINT "grade_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grading_rubrics"
    ADD CONSTRAINT "grading_rubrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invite_code_history"
    ADD CONSTRAINT "invite_code_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logger"
    ADD CONSTRAINT "logger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material_class_assignments"
    ADD CONSTRAINT "material_class_assignments_material_id_class_id_key" UNIQUE ("material_id", "class_id");



ALTER TABLE ONLY "public"."material_class_assignments"
    ADD CONSTRAINT "material_class_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_participants"
    ADD CONSTRAINT "meeting_participants_meeting_id_user_id_key" UNIQUE ("meeting_id", "user_id");



ALTER TABLE ONLY "public"."meeting_participants"
    ADD CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."missions_catalog"
    ADD CONSTRAINT "missions_catalog_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."missions_catalog"
    ADD CONSTRAINT "missions_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."missions"
    ADD CONSTRAINT "missions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plagiarism_checks"
    ADD CONSTRAINT "plagiarism_checks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plagiarism_checks_v2"
    ADD CONSTRAINT "plagiarism_checks_v2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plagiarism_logs"
    ADD CONSTRAINT "plagiarism_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id", "user_id");



ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_pkey" PRIMARY KEY ("post_id", "user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_unique" UNIQUE ("email");



COMMENT ON CONSTRAINT "profiles_email_unique" ON "public"."profiles" IS 'Garante que cada email seja único no sistema';



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_bank"
    ADD CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_assignments"
    ADD CONSTRAINT "quiz_assignments_pkey" PRIMARY KEY ("quiz_id", "class_id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_user_id_started_at_key" UNIQUE ("quiz_id", "user_id", "started_at");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_training_sources"
    ADD CONSTRAINT "rag_training_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_vectors"
    ADD CONSTRAINT "rag_vectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reward_settings"
    ADD CONSTRAINT "reward_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_admins"
    ADD CONSTRAINT "school_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_admins"
    ADD CONSTRAINT "school_admins_user_id_school_id_key" UNIQUE ("user_id", "school_id");



ALTER TABLE ONLY "public"."school_announcements"
    ADD CONSTRAINT "school_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_classes"
    ADD CONSTRAINT "school_classes_class_unique" UNIQUE ("class_id");



COMMENT ON CONSTRAINT "school_classes_class_unique" ON "public"."school_classes" IS 'Garante que uma turma pode pertencer a apenas uma escola.';



ALTER TABLE ONLY "public"."school_classes"
    ADD CONSTRAINT "school_classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_classes"
    ADD CONSTRAINT "school_classes_school_id_class_id_key" UNIQUE ("school_id", "class_id");



ALTER TABLE ONLY "public"."school_teachers"
    ADD CONSTRAINT "school_teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_teachers"
    ADD CONSTRAINT "school_teachers_school_id_user_id_key" UNIQUE ("school_id", "user_id");



ALTER TABLE ONLY "public"."school_teachers"
    ADD CONSTRAINT "school_teachers_unique_link" UNIQUE ("school_id", "user_id");



COMMENT ON CONSTRAINT "school_teachers_unique_link" ON "public"."school_teachers" IS 'Previne duplicação: mesmo professor vinculado 2x à mesma escola. Mas permite professor em múltiplas escolas.';



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sensitive_data_access_log"
    ADD CONSTRAINT "sensitive_data_access_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sensitive_data"
    ADD CONSTRAINT "sensitive_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sensitive_data"
    ADD CONSTRAINT "sensitive_data_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."student_alerts"
    ADD CONSTRAINT "student_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_activity_id_student_id_key" UNIQUE ("activity_id", "student_id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_invites"
    ADD CONSTRAINT "teacher_invites_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."teacher_invites"
    ADD CONSTRAINT "teacher_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_subscriptions"
    ADD CONSTRAINT "teacher_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_config_versions"
    ADD CONSTRAINT "unique_class_version" UNIQUE ("class_id", "version_number");



ALTER TABLE ONLY "public"."class_invitations"
    ADD CONSTRAINT "unique_pending_invitation" UNIQUE ("class_id", "invitee_email", "status");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id", "achievement_id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id", "badge_id");



ALTER TABLE ONLY "public"."user_missions"
    ADD CONSTRAINT "user_missions_pkey" PRIMARY KEY ("user_id", "mission_id");



ALTER TABLE ONLY "public"."xp_log"
    ADD CONSTRAINT "xp_log_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_achievements_catalog_code" ON "public"."achievements_catalog" USING "btree" ("code");



CREATE INDEX "idx_activities_class_status" ON "public"."activities" USING "btree" ("class_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_activities_created_by" ON "public"."activities" USING "btree" ("created_by");



CREATE INDEX "idx_activities_not_deleted" ON "public"."activities" USING "btree" ("class_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_activities_status" ON "public"."activities" USING "btree" ("status") WHERE ("status" = 'active'::"text");



COMMENT ON INDEX "public"."idx_activities_status" IS 'Índice para otimizar queries que filtram atividades por status';



CREATE INDEX "idx_activities_weight" ON "public"."activities" USING "btree" ("weight");



CREATE INDEX "idx_activity_class_assignments_activity_id" ON "public"."activity_class_assignments" USING "btree" ("activity_id");



CREATE INDEX "idx_activity_class_assignments_class_activity" ON "public"."activity_class_assignments" USING "btree" ("class_id", "activity_id");



COMMENT ON INDEX "public"."idx_activity_class_assignments_class_activity" IS 'Índice composto para otimizar queries que filtram atividades por class_id (ex: StudentDashboard)';



CREATE INDEX "idx_activity_class_assignments_class_id" ON "public"."activity_class_assignments" USING "btree" ("class_id");



CREATE INDEX "idx_activity_class_assignments_lookup" ON "public"."activity_class_assignments" USING "btree" ("class_id", "activity_id");



CREATE INDEX "idx_application_logs_expires_at" ON "public"."application_logs" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_application_logs_level" ON "public"."application_logs" USING "btree" ("level");



CREATE INDEX "idx_application_logs_timestamp" ON "public"."application_logs" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_application_logs_user_id" ON "public"."application_logs" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_badges_catalog_code" ON "public"."badges_catalog" USING "btree" ("code");



CREATE INDEX "idx_calendar_events_class_id" ON "public"."calendar_events" USING "btree" ("class_id");



CREATE INDEX "idx_calendar_events_created_by" ON "public"."calendar_events" USING "btree" ("created_by");



CREATE INDEX "idx_calendar_events_participants_gin" ON "public"."calendar_events" USING "gin" ("participants");



CREATE INDEX "idx_calendar_events_start_time" ON "public"."calendar_events" USING "btree" ("start_time");



CREATE INDEX "idx_calendar_events_teacher_id" ON "public"."calendar_events" USING "btree" ("teacher_id");



CREATE INDEX "idx_calendar_sync_class_user" ON "public"."calendar_sync" USING "btree" ("class_id", "user_id");



CREATE INDEX "idx_chatbot_versions_class" ON "public"."chatbot_config_versions" USING "btree" ("class_id");



CREATE INDEX "idx_chatbot_versions_created" ON "public"."chatbot_config_versions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_class_attendance_calendar_event_id" ON "public"."class_attendance" USING "btree" ("calendar_event_id");



CREATE INDEX "idx_class_attendance_class_id" ON "public"."class_attendance" USING "btree" ("class_id");



CREATE INDEX "idx_class_attendance_date" ON "public"."class_attendance" USING "btree" ("attendance_date");



CREATE INDEX "idx_class_attendance_status" ON "public"."class_attendance" USING "btree" ("status");



CREATE INDEX "idx_class_attendance_user_id" ON "public"."class_attendance" USING "btree" ("user_id");



CREATE INDEX "idx_class_invitations_class_id" ON "public"."class_invitations" USING "btree" ("class_id");



CREATE INDEX "idx_class_invitations_expires_at" ON "public"."class_invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_class_invitations_invitee_email" ON "public"."class_invitations" USING "btree" ("invitee_email");



CREATE INDEX "idx_class_invitations_invitee_id" ON "public"."class_invitations" USING "btree" ("invitee_id");



CREATE INDEX "idx_class_invitations_status" ON "public"."class_invitations" USING "btree" ("status");



CREATE INDEX "idx_class_materials_analytics" ON "public"."class_materials" USING "btree" ("class_id", "created_at");



CREATE INDEX "idx_class_materials_category" ON "public"."class_materials" USING "btree" ("category");



CREATE INDEX "idx_class_materials_class_id" ON "public"."class_materials" USING "btree" ("class_id");



CREATE INDEX "idx_class_materials_tags" ON "public"."class_materials" USING "gin" ("tags") WHERE ("tags" IS NOT NULL);



CREATE INDEX "idx_class_materials_tags_gin" ON "public"."class_materials" USING "gin" ("tags");



CREATE INDEX "idx_class_member_history_class_id" ON "public"."class_member_history" USING "btree" ("class_id");



CREATE INDEX "idx_class_member_history_created_at" ON "public"."class_member_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_class_member_history_user_id" ON "public"."class_member_history" USING "btree" ("user_id");



CREATE INDEX "idx_class_members_class_id" ON "public"."class_members" USING "btree" ("class_id");



CREATE INDEX "idx_class_members_class_user" ON "public"."class_members" USING "btree" ("class_id", "user_id");



CREATE INDEX "idx_class_members_not_deleted" ON "public"."class_members" USING "btree" ("class_id", "user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_class_members_user_class" ON "public"."class_members" USING "btree" ("user_id", "class_id");



COMMENT ON INDEX "public"."idx_class_members_user_class" IS 'Índice composto para acelerar RLS policies simplificadas';



CREATE INDEX "idx_class_members_user_id" ON "public"."class_members" USING "btree" ("user_id");



CREATE INDEX "idx_class_members_user_id_active" ON "public"."class_members" USING "btree" ("user_id") WHERE ("role" = 'student'::"text");



CREATE INDEX "idx_class_members_user_role" ON "public"."class_members" USING "btree" ("user_id", "role") WHERE ("role" = 'student'::"text");



COMMENT ON INDEX "public"."idx_class_members_user_role" IS 'Índice para otimizar queries que buscam membros de turma por usuário e role';



CREATE INDEX "idx_class_posts_class_id" ON "public"."class_posts" USING "btree" ("class_id");



CREATE INDEX "idx_class_posts_created_by" ON "public"."class_posts" USING "btree" ("created_by");



CREATE INDEX "idx_class_posts_pinned" ON "public"."class_posts" USING "btree" ("is_pinned") WHERE ("is_pinned" = true);



CREATE INDEX "idx_class_posts_published_at" ON "public"."class_posts" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_class_posts_scheduled" ON "public"."class_posts" USING "btree" ("scheduled_for") WHERE ("scheduled_for" IS NOT NULL);



CREATE INDEX "idx_class_posts_type" ON "public"."class_posts" USING "btree" ("type");



CREATE INDEX "idx_class_settings_class_id" ON "public"."class_settings" USING "btree" ("class_id");



CREATE INDEX "idx_class_settings_join_code" ON "public"."class_settings" USING "btree" ("join_code");



CREATE INDEX "idx_classes_academic_year" ON "public"."classes" USING "btree" ("academic_year");



CREATE INDEX "idx_classes_cancelled_dates" ON "public"."classes" USING "gin" ("cancelled_dates") WHERE ("cancelled_dates" IS NOT NULL);



CREATE INDEX "idx_classes_cancelled_dates_gin" ON "public"."classes" USING "gin" ("cancelled_dates");



CREATE INDEX "idx_classes_chatbot_enabled" ON "public"."classes" USING "btree" ("chatbot_enabled");



CREATE INDEX "idx_classes_created_by" ON "public"."classes" USING "btree" ("created_by");



CREATE INDEX "idx_classes_created_by_active" ON "public"."classes" USING "btree" ("created_by", "id") WHERE ("is_active" = true);



COMMENT ON INDEX "public"."idx_classes_created_by_active" IS 'Índice para otimizar RLS policies que verificam se usuário criou a turma';



CREATE INDEX "idx_classes_created_by_id" ON "public"."classes" USING "btree" ("created_by", "id");



CREATE INDEX "idx_classes_grade_level" ON "public"."classes" USING "btree" ("grade_level");



CREATE INDEX "idx_classes_grading_system" ON "public"."classes" USING "btree" ("grading_system");



CREATE INDEX "idx_classes_invite_code" ON "public"."classes" USING "btree" ("invite_code");



CREATE INDEX "idx_classes_is_active" ON "public"."classes" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_classes_is_online" ON "public"."classes" USING "btree" ("is_online");



CREATE INDEX "idx_classes_is_school_managed" ON "public"."classes" USING "btree" ("is_school_managed");



CREATE INDEX "idx_classes_meeting_days" ON "public"."classes" USING "gin" ("meeting_days");



CREATE INDEX "idx_classes_meeting_days_gin" ON "public"."classes" USING "gin" ("meeting_days");



CREATE INDEX "idx_classes_not_deleted" ON "public"."classes" USING "btree" ("created_by") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_classes_period" ON "public"."classes" USING "btree" ("period");



CREATE INDEX "idx_classes_school_id" ON "public"."classes" USING "btree" ("school_id") WHERE ("school_id" IS NOT NULL);



CREATE INDEX "idx_classes_settings" ON "public"."classes" USING "gin" ("settings");



CREATE INDEX "idx_classes_vacation_end" ON "public"."classes" USING "btree" ("vacation_end") WHERE ("vacation_end" IS NOT NULL);



CREATE INDEX "idx_classes_vacation_start" ON "public"."classes" USING "btree" ("vacation_start") WHERE ("vacation_start" IS NOT NULL);



CREATE INDEX "idx_comment_likes_comment_id" ON "public"."comment_likes" USING "btree" ("comment_id");



CREATE INDEX "idx_comment_likes_user_id" ON "public"."comment_likes" USING "btree" ("user_id");



CREATE INDEX "idx_feedback_templates_category" ON "public"."feedback_templates" USING "btree" ("category");



CREATE INDEX "idx_feedback_templates_teacher" ON "public"."feedback_templates" USING "btree" ("teacher_id");



CREATE INDEX "idx_focus_sessions_user_started" ON "public"."focus_sessions" USING "btree" ("user_id", "started_at" DESC);



CREATE INDEX "idx_gamification_profiles_level" ON "public"."gamification_profiles" USING "btree" ("level" DESC, "xp_total" DESC);



CREATE INDEX "idx_gamification_profiles_user_id" ON "public"."gamification_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_gamification_profiles_xp_total" ON "public"."gamification_profiles" USING "btree" ("xp_total" DESC);



CREATE INDEX "idx_gamification_user_id" ON "public"."gamification_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_grade_history_changed_by" ON "public"."grade_history" USING "btree" ("changed_by");



CREATE INDEX "idx_grade_history_date" ON "public"."grade_history" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_grade_history_submission" ON "public"."grade_history" USING "btree" ("submission_id");



CREATE INDEX "idx_grading_rubrics_active" ON "public"."grading_rubrics" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_grading_rubrics_activity" ON "public"."grading_rubrics" USING "btree" ("activity_id");



CREATE INDEX "idx_grading_rubrics_teacher" ON "public"."grading_rubrics" USING "btree" ("teacher_id");



CREATE INDEX "idx_invite_code_history_class_id" ON "public"."invite_code_history" USING "btree" ("class_id");



CREATE INDEX "idx_logger_created_at" ON "public"."logger" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_logger_level" ON "public"."logger" USING "btree" ("level");



CREATE INDEX "idx_logger_level_created_at" ON "public"."logger" USING "btree" ("level", "created_at" DESC);



CREATE INDEX "idx_logger_user_id" ON "public"."logger" USING "btree" ("user_id");



CREATE INDEX "idx_meeting_participants_meeting_id" ON "public"."meeting_participants" USING "btree" ("meeting_id");



CREATE INDEX "idx_meeting_participants_user_id" ON "public"."meeting_participants" USING "btree" ("user_id");



CREATE INDEX "idx_missions_catalog_type_code" ON "public"."missions_catalog" USING "btree" ("type", "code");



CREATE INDEX "idx_notification_logs_metadata_reminder_key" ON "public"."notification_logs" USING "gin" ((("metadata" -> 'reminder_key'::"text")));



CREATE INDEX "idx_notification_logs_sent_at" ON "public"."notification_logs" USING "btree" ("sent_at");



CREATE INDEX "idx_notification_logs_template" ON "public"."notification_logs" USING "btree" ("template");



CREATE INDEX "idx_notification_logs_user_id" ON "public"."notification_logs" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "idx_plagiarism_ai_score" ON "public"."plagiarism_checks" USING "btree" ("ai_score");



CREATE INDEX "idx_plagiarism_checked_at" ON "public"."plagiarism_checks" USING "btree" ("checked_at" DESC);



CREATE INDEX "idx_plagiarism_checks_v2_activity" ON "public"."plagiarism_checks_v2" USING "btree" ("activity_id");



CREATE INDEX "idx_plagiarism_checks_v2_severity" ON "public"."plagiarism_checks_v2" USING "btree" ("plagiarism_severity");



CREATE INDEX "idx_plagiarism_checks_v2_student" ON "public"."plagiarism_checks_v2" USING "btree" ("student_id");



CREATE INDEX "idx_plagiarism_checks_v2_submission" ON "public"."plagiarism_checks_v2" USING "btree" ("submission_id");



CREATE UNIQUE INDEX "idx_plagiarism_latest" ON "public"."plagiarism_checks" USING "btree" ("submission_id", "checked_at" DESC NULLS LAST);



CREATE INDEX "idx_plagiarism_logs_submission" ON "public"."plagiarism_logs" USING "btree" ("submission_id");



CREATE INDEX "idx_plagiarism_logs_timestamp" ON "public"."plagiarism_logs" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_plagiarism_percentage" ON "public"."plagiarism_checks" USING "btree" ("plagiarism_percentage");



CREATE INDEX "idx_plagiarism_submission_id" ON "public"."plagiarism_checks" USING "btree" ("submission_id");



CREATE INDEX "idx_post_comments_author_id" ON "public"."post_comments" USING "btree" ("author_id");



CREATE INDEX "idx_post_comments_parent" ON "public"."post_comments" USING "btree" ("parent_comment_id") WHERE ("parent_comment_id" IS NOT NULL);



CREATE INDEX "idx_post_comments_post_id" ON "public"."post_comments" USING "btree" ("post_id");



CREATE INDEX "idx_post_likes_post_id" ON "public"."post_likes" USING "btree" ("post_id");



CREATE INDEX "idx_post_likes_user_id" ON "public"."post_likes" USING "btree" ("user_id");



CREATE INDEX "idx_post_views_post_id" ON "public"."post_views" USING "btree" ("post_id");



CREATE INDEX "idx_post_views_user_id" ON "public"."post_views" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_id" ON "public"."profiles" USING "btree" ("id");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_role_active" ON "public"."profiles" USING "btree" ("role", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_quiz_assignments_class" ON "public"."quiz_assignments" USING "btree" ("class_id");



CREATE INDEX "idx_quiz_attempts_quiz" ON "public"."quiz_attempts" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_attempts_quiz_user" ON "public"."quiz_attempts" USING "btree" ("quiz_id", "user_id");



CREATE INDEX "idx_quiz_attempts_user" ON "public"."quiz_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_quiz_questions_quiz" ON "public"."quiz_questions" USING "btree" ("quiz_id", "position");



CREATE INDEX "idx_quizzes_created_by" ON "public"."quizzes" USING "btree" ("created_by");



CREATE INDEX "idx_quizzes_owner" ON "public"."quizzes" USING "btree" ("owner_user_id", "created_at" DESC);



CREATE INDEX "idx_quizzes_public" ON "public"."quizzes" USING "btree" ("is_public");



CREATE INDEX "idx_rag_training_sources_activity_id" ON "public"."rag_training_sources" USING "btree" ("activity_id") WHERE ("activity_id" IS NOT NULL);



CREATE INDEX "idx_rag_training_sources_class_activity" ON "public"."rag_training_sources" USING "btree" ("class_id", "activity_id") WHERE ("activity_id" IS NOT NULL);



CREATE INDEX "idx_rag_training_sources_class_material" ON "public"."rag_training_sources" USING "btree" ("class_id", "material_id") WHERE ("material_id" IS NOT NULL);



CREATE INDEX "idx_rag_vectors_embedding" ON "public"."rag_vectors" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_rag_vectors_source_id" ON "public"."rag_vectors" USING "btree" ("source_id");



CREATE INDEX "idx_rank_snapshots_class_period" ON "public"."class_rank_snapshots" USING "btree" ("class_id", "period", "period_start_date" DESC);



CREATE INDEX "idx_recordings_class_date" ON "public"."class_recordings" USING "btree" ("class_id", "recorded_date");



CREATE INDEX "idx_reward_settings_created_by" ON "public"."reward_settings" USING "btree" ("created_by");



CREATE INDEX "idx_reward_settings_scope" ON "public"."reward_settings" USING "btree" ("scope", "scope_id");



CREATE INDEX "idx_school_admins_school_id" ON "public"."school_admins" USING "btree" ("school_id");



CREATE INDEX "idx_school_admins_user" ON "public"."school_admins" USING "btree" ("user_id");



CREATE INDEX "idx_school_admins_user_id" ON "public"."school_admins" USING "btree" ("user_id");



CREATE INDEX "idx_school_announcements_publish_at" ON "public"."school_announcements" USING "btree" ("publish_at") WHERE ("publish_at" IS NOT NULL);



CREATE INDEX "idx_school_classes_class" ON "public"."school_classes" USING "btree" ("class_id");



CREATE INDEX "idx_school_teachers_user" ON "public"."school_teachers" USING "btree" ("user_id");



CREATE INDEX "idx_schools_status" ON "public"."schools" USING "btree" ("status");



CREATE INDEX "idx_sensitive_access_by" ON "public"."sensitive_data_access_log" USING "btree" ("accessed_by", "created_at" DESC);



CREATE INDEX "idx_sensitive_access_user" ON "public"."sensitive_data_access_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_sensitive_data_cpf_hash" ON "public"."sensitive_data" USING "btree" ("cpf_hash");



CREATE INDEX "idx_sensitive_data_user_id" ON "public"."sensitive_data" USING "btree" ("user_id");



CREATE INDEX "idx_student_alerts_class" ON "public"."student_alerts" USING "btree" ("class_id");



CREATE INDEX "idx_student_alerts_resolved" ON "public"."student_alerts" USING "btree" ("resolved") WHERE (NOT "resolved");



CREATE INDEX "idx_student_alerts_student" ON "public"."student_alerts" USING "btree" ("student_id");



CREATE INDEX "idx_submissions_activity_id" ON "public"."submissions" USING "btree" ("activity_id");



CREATE INDEX "idx_submissions_activity_student" ON "public"."submissions" USING "btree" ("activity_id", "student_id");



CREATE INDEX "idx_submissions_analytics" ON "public"."submissions" USING "btree" ("activity_id", "status", "submitted_at") INCLUDE ("grade", "student_id");



CREATE INDEX "idx_submissions_class_lookup" ON "public"."submissions" USING "btree" ("activity_id", "student_id", "status") INCLUDE ("grade", "submitted_at", "graded_at");



CREATE INDEX "idx_submissions_graded_at" ON "public"."submissions" USING "btree" ("graded_at") WHERE ("graded_at" IS NOT NULL);



CREATE INDEX "idx_submissions_pending" ON "public"."submissions" USING "btree" ("activity_id") WHERE ("status" = ANY (ARRAY['submitted'::"text", 'pending'::"text"]));



CREATE INDEX "idx_submissions_pending_plagiarism" ON "public"."submissions" USING "btree" ("activity_id", "plagiarism_check_status") WHERE ("plagiarism_check_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text"]));



CREATE INDEX "idx_submissions_plagiarism_status" ON "public"."submissions" USING "btree" ("plagiarism_check_status");



CREATE INDEX "idx_submissions_status" ON "public"."submissions" USING "btree" ("status");



CREATE INDEX "idx_submissions_student_id" ON "public"."submissions" USING "btree" ("student_id");



CREATE INDEX "idx_submissions_student_status" ON "public"."submissions" USING "btree" ("student_id", "status");



COMMENT ON INDEX "public"."idx_submissions_student_status" IS 'Índice para otimizar queries que buscam submissões de aluno por status';



CREATE INDEX "idx_teacher_invites_email" ON "public"."teacher_invites" USING "btree" ("email");



CREATE INDEX "idx_teacher_invites_school_id" ON "public"."teacher_invites" USING "btree" ("school_id");



CREATE INDEX "idx_teacher_invites_status" ON "public"."teacher_invites" USING "btree" ("status");



CREATE INDEX "idx_teacher_invites_token" ON "public"."teacher_invites" USING "btree" ("invite_token");



CREATE INDEX "idx_teacher_subscriptions_status" ON "public"."teacher_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_teacher_subscriptions_user" ON "public"."teacher_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_user_achievements_user" ON "public"."user_achievements" USING "btree" ("user_id");



CREATE INDEX "idx_user_badges_badge_id" ON "public"."user_badges" USING "btree" ("badge_id");



CREATE INDEX "idx_user_badges_user" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "idx_user_badges_user_id" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "idx_user_missions_reset" ON "public"."user_missions" USING "btree" ("reset_at") WHERE (("status" = 'active'::"text") AND ("reset_at" IS NOT NULL));



CREATE INDEX "idx_user_missions_status" ON "public"."user_missions" USING "btree" ("user_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_user_missions_user" ON "public"."user_missions" USING "btree" ("user_id");



CREATE INDEX "idx_xp_log_created_at" ON "public"."xp_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_xp_log_user_created" ON "public"."xp_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_xp_log_user_date" ON "public"."xp_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_xp_log_user_id" ON "public"."xp_log" USING "btree" ("user_id");



CREATE UNIQUE INDEX "unique_class_user_active" ON "public"."class_members" USING "btree" ("class_id", "user_id") WHERE ("deleted_at" IS NULL);



CREATE OR REPLACE TRIGGER "class_member_change_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."class_members" FOR EACH ROW EXECUTE FUNCTION "public"."log_class_member_change"();



CREATE OR REPLACE TRIGGER "handle_answers_updated_at" BEFORE UPDATE ON "public"."answers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "reward_settings_updated_at" BEFORE UPDATE ON "public"."reward_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_reward_settings_updated_at"();



CREATE OR REPLACE TRIGGER "set_invite_code" BEFORE INSERT ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."generate_invite_code"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."answers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."class_materials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."class_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."class_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."class_recordings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."discussions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."feedback_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."gamification_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."grading_rubrics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."meetings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."missions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."question_bank" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."quiz_questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."rag_training_sources" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."reward_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."sensitive_data" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."submissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."teacher_invites" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."teacher_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "teacher_invites_updated_at" BEFORE UPDATE ON "public"."teacher_invites" FOR EACH ROW EXECUTE FUNCTION "public"."update_teacher_invites_updated_at"();



CREATE OR REPLACE TRIGGER "trg_activities_updated" BEFORE UPDATE ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_auto_create_school" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_school_for_school_user"();



CREATE OR REPLACE TRIGGER "trg_calendar_events_updated" BEFORE UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_class_attendance_updated" BEFORE UPDATE ON "public"."class_attendance" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_class_materials_updated" BEFORE UPDATE ON "public"."class_materials" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_classes_updated" BEFORE UPDATE ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_gamification_profiles_updated" BEFORE UPDATE ON "public"."gamification_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_gamification_profiles_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_schools_updated" BEFORE UPDATE ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_submissions_updated" BEFORE UPDATE ON "public"."submissions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_teacher_subscriptions_updated" BEFORE UPDATE ON "public"."teacher_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_teacher_subscriptions_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_class_posts_updated_at" BEFORE UPDATE ON "public"."class_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_comment_likes_delete" AFTER DELETE ON "public"."comment_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_comment_likes_count"();



CREATE OR REPLACE TRIGGER "trigger_comment_likes_insert" AFTER INSERT ON "public"."comment_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_comment_likes_count"();



CREATE OR REPLACE TRIGGER "trigger_feedback_templates_updated_at" BEFORE UPDATE ON "public"."feedback_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_grading_rubrics_updated_at" BEFORE UPDATE ON "public"."grading_rubrics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_increment_post_views" AFTER INSERT ON "public"."post_views" FOR EACH ROW EXECUTE FUNCTION "public"."increment_post_views"();



CREATE OR REPLACE TRIGGER "trigger_log_grade_change" AFTER UPDATE OF "grade" ON "public"."submissions" FOR EACH ROW WHEN (("old"."grade" IS DISTINCT FROM "new"."grade")) EXECUTE FUNCTION "public"."log_grade_change"();



CREATE OR REPLACE TRIGGER "trigger_notify_xp_gained" AFTER INSERT ON "public"."xp_log" FOR EACH ROW EXECUTE FUNCTION "public"."notify_xp_gained"();



CREATE OR REPLACE TRIGGER "trigger_post_comments_updated_at" BEFORE UPDATE ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_post_likes_delete" AFTER DELETE ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_post_likes_count"();



CREATE OR REPLACE TRIGGER "trigger_post_likes_insert" AFTER INSERT ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_post_likes_count"();



CREATE OR REPLACE TRIGGER "trigger_set_plagiarism_status" BEFORE INSERT ON "public"."submissions" FOR EACH ROW EXECUTE FUNCTION "public"."set_submission_plagiarism_status"();



CREATE OR REPLACE TRIGGER "trigger_update_comment_likes_count" AFTER INSERT OR DELETE ON "public"."comment_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_comment_likes_count"();



CREATE OR REPLACE TRIGGER "trigger_update_comments_count" AFTER INSERT OR DELETE ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_post_comments_count"();



CREATE OR REPLACE TRIGGER "trigger_update_gamification_profiles_updated_at" BEFORE UPDATE ON "public"."gamification_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_gamification_profiles_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_post_likes_count" AFTER INSERT OR DELETE ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_post_likes_count"();



CREATE OR REPLACE TRIGGER "update_class_settings_timestamp" BEFORE UPDATE ON "public"."class_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_class_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_gamification_profiles_updated_at" BEFORE UPDATE ON "public"."gamification_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_class_assignments"
    ADD CONSTRAINT "activity_class_assignments_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_class_assignments"
    ADD CONSTRAINT "activity_class_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."application_logs"
    ADD CONSTRAINT "application_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync"
    ADD CONSTRAINT "calendar_sync_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync"
    ADD CONSTRAINT "calendar_sync_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_config_versions"
    ADD CONSTRAINT "chatbot_config_versions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_config_versions"
    ADD CONSTRAINT "chatbot_config_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."class_attendance"
    ADD CONSTRAINT "class_attendance_calendar_event_id_fkey" FOREIGN KEY ("calendar_event_id") REFERENCES "public"."calendar_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."class_attendance"
    ADD CONSTRAINT "class_attendance_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_attendance"
    ADD CONSTRAINT "class_attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_invitations"
    ADD CONSTRAINT "class_invitations_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_invitations"
    ADD CONSTRAINT "class_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."class_invitations"
    ADD CONSTRAINT "class_invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."class_invitations"
    ADD CONSTRAINT "class_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_materials"
    ADD CONSTRAINT "class_materials_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_materials"
    ADD CONSTRAINT "class_materials_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_member_history"
    ADD CONSTRAINT "class_member_history_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_member_history"
    ADD CONSTRAINT "class_member_history_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."class_member_history"
    ADD CONSTRAINT "class_member_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_posts"
    ADD CONSTRAINT "class_posts_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_posts"
    ADD CONSTRAINT "class_posts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_rank_snapshots"
    ADD CONSTRAINT "class_rank_snapshots_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_recordings"
    ADD CONSTRAINT "class_recordings_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_settings"
    ADD CONSTRAINT "class_settings_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id");



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_messages"
    ADD CONSTRAINT "discussion_messages_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."discussion_messages"
    ADD CONSTRAINT "discussion_messages_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_messages"
    ADD CONSTRAINT "discussion_messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "public"."discussion_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_messages"
    ADD CONSTRAINT "discussion_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events_competitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_participants"
    ADD CONSTRAINT "event_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events_competitions"
    ADD CONSTRAINT "events_competitions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_templates"
    ADD CONSTRAINT "feedback_templates_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_materials"
    ADD CONSTRAINT "fk_class_materials_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."focus_sessions"
    ADD CONSTRAINT "focus_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gamification_profiles"
    ADD CONSTRAINT "gamification_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grade_history"
    ADD CONSTRAINT "grade_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."grade_history"
    ADD CONSTRAINT "grade_history_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grading_rubrics"
    ADD CONSTRAINT "grading_rubrics_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."grading_rubrics"
    ADD CONSTRAINT "grading_rubrics_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invite_code_history"
    ADD CONSTRAINT "invite_code_history_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logger"
    ADD CONSTRAINT "logger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."material_class_assignments"
    ADD CONSTRAINT "material_class_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."material_class_assignments"
    ADD CONSTRAINT "material_class_assignments_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."class_materials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_participants"
    ADD CONSTRAINT "meeting_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meeting_participants"
    ADD CONSTRAINT "meeting_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."missions"
    ADD CONSTRAINT "missions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plagiarism_checks"
    ADD CONSTRAINT "plagiarism_checks_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plagiarism_checks_v2"
    ADD CONSTRAINT "plagiarism_checks_v2_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plagiarism_checks_v2"
    ADD CONSTRAINT "plagiarism_checks_v2_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plagiarism_checks_v2"
    ADD CONSTRAINT "plagiarism_checks_v2_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plagiarism_logs"
    ADD CONSTRAINT "plagiarism_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."post_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."class_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."class_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."class_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_views"
    ADD CONSTRAINT "post_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_bank"
    ADD CONSTRAINT "question_bank_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."question_bank"
    ADD CONSTRAINT "question_bank_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quiz_assignments"
    ADD CONSTRAINT "quiz_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quiz_assignments"
    ADD CONSTRAINT "quiz_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_assignments"
    ADD CONSTRAINT "quiz_assignments_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_training_sources"
    ADD CONSTRAINT "rag_training_sources_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_training_sources"
    ADD CONSTRAINT "rag_training_sources_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_training_sources"
    ADD CONSTRAINT "rag_training_sources_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_training_sources"
    ADD CONSTRAINT "rag_training_sources_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."class_materials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_vectors"
    ADD CONSTRAINT "rag_vectors_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."rag_training_sources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reward_settings"
    ADD CONSTRAINT "reward_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_admins"
    ADD CONSTRAINT "school_admins_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_admins"
    ADD CONSTRAINT "school_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_announcements"
    ADD CONSTRAINT "school_announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."school_announcements"
    ADD CONSTRAINT "school_announcements_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_classes"
    ADD CONSTRAINT "school_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_classes"
    ADD CONSTRAINT "school_classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_teachers"
    ADD CONSTRAINT "school_teachers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."school_teachers"
    ADD CONSTRAINT "school_teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sensitive_data_access_log"
    ADD CONSTRAINT "sensitive_data_access_log_accessed_by_fkey" FOREIGN KEY ("accessed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."sensitive_data_access_log"
    ADD CONSTRAINT "sensitive_data_access_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."sensitive_data"
    ADD CONSTRAINT "sensitive_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_alerts"
    ADD CONSTRAINT "student_alerts_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_alerts"
    ADD CONSTRAINT "student_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."student_alerts"
    ADD CONSTRAINT "student_alerts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_invites"
    ADD CONSTRAINT "teacher_invites_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_subscriptions"
    ADD CONSTRAINT "teacher_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements_catalog"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges_catalog"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_missions"
    ADD CONSTRAINT "user_missions_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."missions_catalog"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_missions"
    ADD CONSTRAINT "user_missions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."xp_log"
    ADD CONSTRAINT "xp_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Alunos podem ver sua própria presença" ON "public"."class_attendance" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can insert logs" ON "public"."application_logs" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Autores podem deletar próprios posts" ON "public"."class_posts" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Autores podem editar próprios comentários" ON "public"."post_comments" FOR UPDATE USING (("author_id" = "auth"."uid"()));



CREATE POLICY "Autores podem editar próprios posts" ON "public"."class_posts" FOR UPDATE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Comentários visíveis para membros da turma" ON "public"."post_comments" FOR SELECT USING (("post_id" IN ( SELECT "class_posts"."id"
   FROM "public"."class_posts"
  WHERE ("class_posts"."class_id" IN ( SELECT "class_members"."class_id"
           FROM "public"."class_members"
          WHERE ("class_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Membros podem comentar se habilitado" ON "public"."post_comments" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND ("post_id" IN ( SELECT "class_posts"."id"
   FROM "public"."class_posts"
  WHERE (("class_posts"."comments_enabled" = true) AND ("class_posts"."class_id" IN ( SELECT "class_members"."class_id"
           FROM "public"."class_members"
          WHERE ("class_members"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "Only admins can delete XP" ON "public"."xp_log" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'school'::"text")))));



CREATE POLICY "Only admins can view logs" ON "public"."plagiarism_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("auth"."uid"() = "users"."id") AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Posts visíveis para membros da turma" ON "public"."class_posts" FOR SELECT USING ((("published_at" IS NOT NULL) AND (("class_id" IN ( SELECT "class_members"."class_id"
   FROM "public"."class_members"
  WHERE ("class_members"."user_id" = "auth"."uid"()))) OR ("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Professores criam próprias rubricas" ON "public"."grading_rubrics" FOR INSERT WITH CHECK (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Professores criam próprios templates" ON "public"."feedback_templates" FOR INSERT WITH CHECK (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Professores deletam próprias rubricas" ON "public"."grading_rubrics" FOR DELETE USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Professores deletam próprios templates" ON "public"."feedback_templates" FOR DELETE USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Professores editam próprias rubricas" ON "public"."grading_rubrics" FOR UPDATE USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Professores editam próprios templates" ON "public"."feedback_templates" FOR UPDATE USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Professores podem atualizar configurações de suas turmas" ON "public"."class_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_settings"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Professores podem atualizar presença em suas turmas" ON "public"."class_attendance" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_attendance"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Professores podem criar configurações de suas turmas" ON "public"."class_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_settings"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Professores podem criar posts" ON "public"."class_posts" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_posts"."class_id") AND ("classes"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Professores podem deletar configurações de suas turmas" ON "public"."class_settings" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_settings"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Professores podem deletar presença de suas turmas" ON "public"."class_attendance" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_attendance"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Professores podem inserir histórico de suas turmas" ON "public"."invite_code_history" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "invite_code_history"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Professores podem inserir presença em suas turmas" ON "public"."class_attendance" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_attendance"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Professores podem ver presença de suas turmas" ON "public"."class_attendance" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_attendance"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Professores veem configurações de suas turmas" ON "public"."class_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_settings"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Professores veem histórico de suas correções" ON "public"."grade_history" FOR SELECT USING ((("changed_by" = "auth"."uid"()) OR ("submission_id" IN ( SELECT "s"."id"
   FROM ("public"."submissions" "s"
     JOIN "public"."activities" "a" ON (("s"."activity_id" = "a"."id")))
  WHERE ("a"."created_by" = "auth"."uid"())))));



CREATE POLICY "Professores veem histórico de suas turmas" ON "public"."invite_code_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "invite_code_history"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Professores veem próprias rubricas" ON "public"."grading_rubrics" FOR SELECT USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Professores veem próprios templates" ON "public"."feedback_templates" FOR SELECT USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Professors can view plagiarism checks" ON "public"."plagiarism_checks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."submissions" "s"
     JOIN "public"."activities" "a" ON (("s"."activity_id" = "a"."id")))
  WHERE (("s"."id" = "plagiarism_checks"."submission_id") AND ("a"."created_by" = "auth"."uid"())))));



CREATE POLICY "Sistema insere no histórico" ON "public"."grade_history" FOR INSERT WITH CHECK (("changed_by" = "auth"."uid"()));



CREATE POLICY "System can create notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can create plagiarism records" ON "public"."plagiarism_checks_v2" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert plagiarism checks" ON "public"."plagiarism_checks" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert sensitive data" ON "public"."sensitive_data" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Teachers can create chatbot versions" ON "public"."chatbot_config_versions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "chatbot_config_versions"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Teachers can delete their class chatbot versions" ON "public"."chatbot_config_versions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "chatbot_config_versions"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Teachers can view plagiarism results from their classes" ON "public"."plagiarism_checks_v2" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."activities" "a"
     JOIN "public"."activity_class_assignments" "aca" ON (("aca"."activity_id" = "a"."id")))
     JOIN "public"."class_members" "cm" ON (("cm"."class_id" = "aca"."class_id")))
  WHERE (("a"."id" = "plagiarism_checks_v2"."activity_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'teacher'::"text")))));



CREATE POLICY "Teachers can view their class chatbot versions" ON "public"."chatbot_config_versions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "chatbot_config_versions"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own XP" ON "public"."xp_log" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read own logs" ON "public"."application_logs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read own sensitive data" ON "public"."sensitive_data" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own sensitive data" ON "public"."sensitive_data" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can view own access logs" ON "public"."sensitive_data_access_log" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("accessed_by" = "auth"."uid"())));



CREATE POLICY "Users can view public profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view their own XP log" ON "public"."xp_log" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem curtir comentários" ON "public"."comment_likes" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Usuários podem curtir posts" ON "public"."post_likes" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Usuários podem registrar visualizações" ON "public"."post_views" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Usuários podem ver próprias visualizações" ON "public"."post_views" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."achievements_catalog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "achievements_catalog_public_read" ON "public"."achievements_catalog" FOR SELECT USING (true);



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activities_owner" ON "public"."activities" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



COMMENT ON POLICY "activities_owner" ON "public"."activities" IS 'Professores gerenciam atividades';



CREATE POLICY "activities_select_policy" ON "public"."activities" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR ("auth"."uid"() IS NOT NULL)));



ALTER TABLE "public"."activity_class_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_class_assignments_safe" ON "public"."activity_class_assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "activity_class_assignments"."class_id") AND ("c"."created_by" = "auth"."uid"()))
UNION ALL
 SELECT 1
   FROM "public"."activities" "a"
  WHERE (("a"."id" = "activity_class_assignments"."activity_id") AND ("a"."created_by" = "auth"."uid"()))
 LIMIT 1)));



COMMENT ON POLICY "activity_class_assignments_safe" ON "public"."activity_class_assignments" IS 'Otimizado: Usa UNION ALL ao invés de dois EXISTS separados';



CREATE POLICY "admins_delete_logs" ON "public"."logger" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "admins_read_all_logs" ON "public"."logger" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'superadmin'::"text"]))))));



CREATE POLICY "anonymous_insert_logs" ON "public"."logger" FOR INSERT TO "anon" WITH CHECK (true);



ALTER TABLE "public"."answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "answers_student_own" ON "public"."answers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."submissions" "s"
  WHERE (("s"."id" = "answers"."submission_id") AND ("s"."student_id" = "auth"."uid"())))));



ALTER TABLE "public"."application_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assignments_select_policy" ON "public"."activity_class_assignments" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "authenticated_insert_logs" ON "public"."logger" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "authenticated_manage_badges" ON "public"."badges" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."badges_catalog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "badges_catalog_public_read" ON "public"."badges_catalog" FOR SELECT USING (true);



ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendar_owner" ON "public"."calendar_events" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."calendar_sync" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendar_sync_own" ON "public"."calendar_sync" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."chatbot_config_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_materials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "class_materials_safe" ON "public"."class_materials" USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."material_class_assignments" "mca"
     JOIN "public"."classes" "c" ON (("c"."id" = "mca"."class_id")))
  WHERE (("mca"."material_id" = "class_materials"."id") AND ("c"."created_by" = "auth"."uid"()))))));



ALTER TABLE "public"."class_member_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "class_member_history_safe" ON "public"."class_member_history" USING ((("performed_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "class_member_history"."class_id") AND ("c"."created_by" = "auth"."uid"()))))));



CREATE POLICY "class_members_delete_simple" ON "public"."class_members" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "class_members_insert_simple" ON "public"."class_members" FOR INSERT TO "authenticated" WITH CHECK (("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."created_by" = "auth"."uid"()))));



CREATE POLICY "class_members_read_simple" ON "public"."class_members" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."created_by" = "auth"."uid"())))));



COMMENT ON POLICY "class_members_read_simple" ON "public"."class_members" IS 'Policy simplificada - prioriza velocidade sobre granularidade';



CREATE POLICY "class_members_self" ON "public"."class_members" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



COMMENT ON POLICY "class_members_self" ON "public"."class_members" IS 'Usuários veem seus registros';



CREATE POLICY "class_members_update_simple" ON "public"."class_members" FOR UPDATE TO "authenticated" USING (("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."created_by" = "auth"."uid"()))));



ALTER TABLE "public"."class_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_rank_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "class_rank_snapshots_safe" ON "public"."class_rank_snapshots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "class_rank_snapshots"."class_id") AND ("c"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."class_recordings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "classes_owner_all" ON "public"."classes" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



COMMENT ON POLICY "classes_owner_all" ON "public"."classes" IS 'Professores gerenciam suas turmas';



CREATE POLICY "classes_select_policy" ON "public"."classes" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR ("auth"."uid"() IS NOT NULL)));



ALTER TABLE "public"."comment_likes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comment_likes_all_members" ON "public"."comment_likes" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "creators_create_rewards" ON "public"."reward_settings" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "creators_delete_own_rewards" ON "public"."reward_settings" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "creators_read_own_rewards" ON "public"."reward_settings" FOR SELECT USING (("created_by" = "auth"."uid"()));



CREATE POLICY "creators_update_own_rewards" ON "public"."reward_settings" FOR UPDATE USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."discussion_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discussion_messages_delete_safe" ON "public"."discussion_messages" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "discussion_messages_insert_safe" ON "public"."discussion_messages" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "discussion_messages_select_safe" ON "public"."discussion_messages" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."discussions" "d"
     JOIN "public"."classes" "c" ON (("c"."id" = "d"."class_id")))
  WHERE (("d"."id" = "discussion_messages"."discussion_id") AND ("c"."created_by" = "auth"."uid"()))))));



ALTER TABLE "public"."discussions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discussions_delete_owner" ON "public"."discussions" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "discussions_delete_safe" ON "public"."discussions" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "discussions_insert_safe" ON "public"."discussions" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "discussions_insert_teacher" ON "public"."discussions" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "discussions"."class_id") AND ("classes"."created_by" = "auth"."uid"()))))));



CREATE POLICY "discussions_select_members" ON "public"."discussions" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."class_members"
  WHERE (("class_members"."class_id" = "discussions"."class_id") AND ("class_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "discussions_select_safe" ON "public"."discussions" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "discussions"."class_id") AND ("c"."created_by" = "auth"."uid"()))))));



CREATE POLICY "discussions_update_owner" ON "public"."discussions" FOR UPDATE USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."event_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_participants_self_ins" ON "public"."event_participants" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "event_participants_self_read" ON "public"."event_participants" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."events_competitions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_public_read" ON "public"."events_competitions" FOR SELECT USING (true);



ALTER TABLE "public"."feedback_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."focus_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "focus_sessions_self" ON "public"."focus_sessions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "focus_sessions_self_ins" ON "public"."focus_sessions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."gamification_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gamification_profiles_insert_system" ON "public"."gamification_profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "gamification_profiles_own" ON "public"."gamification_profiles" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "gamification_profiles_read" ON "public"."gamification_profiles" FOR SELECT USING (true);



CREATE POLICY "gamification_profiles_read_own" ON "public"."gamification_profiles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "gamification_profiles_update_own" ON "public"."gamification_profiles" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "gamification_self" ON "public"."gamification_profiles" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



COMMENT ON POLICY "gamification_self" ON "public"."gamification_profiles" IS 'Perfil próprio';



ALTER TABLE "public"."grade_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."grading_rubrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitation_student_update" ON "public"."class_invitations" FOR UPDATE USING ((("invitee_email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text") OR ("invitee_id" = "auth"."uid"()))) WITH CHECK ((("invitee_email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text") OR ("invitee_id" = "auth"."uid"())));



CREATE POLICY "invitation_student_view" ON "public"."class_invitations" FOR SELECT USING ((("invitee_email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text") OR ("invitee_id" = "auth"."uid"())));



CREATE POLICY "invitation_teacher_create" ON "public"."class_invitations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_invitations"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "invitation_teacher_delete" ON "public"."class_invitations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_invitations"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



CREATE POLICY "invitation_teacher_view" ON "public"."class_invitations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_invitations"."class_id") AND ("classes"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."invite_code_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."material_class_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "material_class_assignments_safe" ON "public"."material_class_assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "material_class_assignments"."class_id") AND ("c"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."meeting_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meeting_participants_view" ON "public"."meeting_participants" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."meetings"
  WHERE (("meetings"."id" = "meeting_participants"."meeting_id") AND ("meetings"."created_by" = "auth"."uid"())))) OR ("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."meetings" "m"
     JOIN "public"."class_members" "cm" ON (("cm"."class_id" = "m"."class_id")))
  WHERE (("m"."id" = "meeting_participants"."meeting_id") AND ("cm"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."meetings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meetings_insert_safe" ON "public"."meetings" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "meetings_manage_safe" ON "public"."meetings" USING (("created_by" = "auth"."uid"()));



CREATE POLICY "meetings_select_safe" ON "public"."meetings" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR (("class_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "meetings"."class_id") AND ("c"."created_by" = "auth"."uid"())))))));



ALTER TABLE "public"."missions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."missions_catalog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "missions_catalog_public_read" ON "public"."missions_catalog" FOR SELECT USING (true);



CREATE POLICY "missions_owner" ON "public"."missions" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_logs_service_insert" ON "public"."notification_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "notification_logs_view_own" ON "public"."notification_logs" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_self_all" ON "public"."notifications" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."plagiarism_checks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plagiarism_checks_teacher_read" ON "public"."plagiarism_checks_v2" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."activities" "a"
  WHERE (("a"."id" = "plagiarism_checks_v2"."activity_id") AND ("a"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."plagiarism_checks_v2" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plagiarism_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_likes_all_members" ON "public"."post_likes" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."post_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_views_insert_members" ON "public"."post_views" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_public_read" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



COMMENT ON POLICY "profiles_public_read" ON "public"."profiles" IS 'Usuários autenticados podem ver outros perfis (leitura)';



CREATE POLICY "profiles_select_all" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_self" ON "public"."profiles" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



COMMENT ON POLICY "profiles_self" ON "public"."profiles" IS 'Usuários gerenciam seu próprio perfil';



CREATE POLICY "profiles_self_read" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "public_read_badges" ON "public"."badges" FOR SELECT USING (true);



CREATE POLICY "public_read_by_token" ON "public"."teacher_invites" FOR SELECT USING (("invite_token" IS NOT NULL));



ALTER TABLE "public"."question_bank" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_approved_public" ON "public"."question_bank" FOR SELECT USING (("status" = 'approved'::"text"));



CREATE POLICY "questions_owner" ON "public"."question_bank" USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."quiz_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_assignments_safe" ON "public"."quiz_assignments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "quiz_assignments"."class_id") AND ("c"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_attempts_student_own" ON "public"."quiz_attempts" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "quiz_attempts_teacher_view" ON "public"."quiz_attempts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."quiz_assignments" "qa"
     JOIN "public"."classes" "c" ON (("c"."id" = "qa"."class_id")))
  WHERE (("qa"."quiz_id" = "quiz_attempts"."quiz_id") AND ("c"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."quiz_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_questions_by_owner" ON "public"."quiz_questions" USING ((EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_questions"."quiz_id") AND ("q"."owner_user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_questions"."quiz_id") AND ("q"."owner_user_id" = "auth"."uid"())))));



CREATE POLICY "quiz_questions_owner_select" ON "public"."quiz_questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_questions"."quiz_id") AND ("q"."created_by" = "auth"."uid"())))));



CREATE POLICY "quiz_questions_owner_write" ON "public"."quiz_questions" USING ((EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_questions"."quiz_id") AND ("q"."created_by" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_questions"."quiz_id") AND ("q"."created_by" = "auth"."uid"())))));



CREATE POLICY "quiz_questions_public_select" ON "public"."quiz_questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."quizzes" "q"
  WHERE (("q"."id" = "quiz_questions"."quiz_id") AND ("q"."is_public" = true)))));



ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quizzes_owner_crud" ON "public"."quizzes" USING (("owner_user_id" = "auth"."uid"())) WITH CHECK (("owner_user_id" = "auth"."uid"()));



CREATE POLICY "quizzes_owner_select" ON "public"."quizzes" FOR SELECT USING (("created_by" = "auth"."uid"()));



CREATE POLICY "quizzes_owner_write" ON "public"."quizzes" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "quizzes_public_select" ON "public"."quizzes" FOR SELECT USING (("is_public" = true));



ALTER TABLE "public"."rag_training_sources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rag_training_sources_safe" ON "public"."rag_training_sources" USING ((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "rag_training_sources"."class_id") AND ("c"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."rag_vectors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rag_vectors_safe" ON "public"."rag_vectors" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."rag_training_sources" "rts"
     JOIN "public"."classes" "c" ON (("c"."id" = "rts"."class_id")))
  WHERE (("rts"."id" = "rag_vectors"."source_id") AND ("c"."created_by" = "auth"."uid"())))));



CREATE POLICY "recordings_manage_teacher" ON "public"."class_recordings" USING (("class_id" IN ( SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."created_by" = "auth"."uid"()))));



CREATE POLICY "recordings_read" ON "public"."class_recordings" FOR SELECT USING (("class_id" IN ( SELECT "class_members"."class_id"
   FROM "public"."class_members"
  WHERE ("class_members"."user_id" = "auth"."uid"())
UNION
 SELECT "classes"."id"
   FROM "public"."classes"
  WHERE ("classes"."created_by" = "auth"."uid"()))));



ALTER TABLE "public"."reward_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "school_active_read" ON "public"."schools" FOR SELECT USING ((("status" = ANY (ARRAY['active'::"text", 'trial'::"text"])) OR (EXISTS ( SELECT 1
   FROM "public"."school_admins" "sa"
  WHERE (("sa"."school_id" = "schools"."id") AND ("sa"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."school_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "school_admins_self_all" ON "public"."school_admins" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "school_admins_self_delete" ON "public"."school_admins" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "school_admins_self_insert" ON "public"."school_admins" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "school_admins_self_update" ON "public"."school_admins" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "school_admins_simple_read" ON "public"."school_admins" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."school_announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "school_announcements_admins_insert" ON "public"."school_announcements" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE ("school_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "school_announcements_visible_to_admins" ON "public"."school_announcements" FOR SELECT USING (("school_id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE ("school_admins"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."school_classes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "school_classes_admins_delete" ON "public"."school_classes" FOR DELETE USING (("school_id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE ("school_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "school_classes_admins_insert" ON "public"."school_classes" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE ("school_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "school_classes_public_read" ON "public"."school_classes" FOR SELECT USING (true);



CREATE POLICY "school_classes_visible_to_admins" ON "public"."school_classes" FOR SELECT USING (("school_id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE ("school_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "school_create_invites" ON "public"."teacher_invites" FOR INSERT WITH CHECK (("school_id" = "auth"."uid"()));



CREATE POLICY "school_delete_own_invites" ON "public"."teacher_invites" FOR DELETE USING (("school_id" = "auth"."uid"()));



CREATE POLICY "school_read_own_invites" ON "public"."teacher_invites" FOR SELECT USING (("school_id" = "auth"."uid"()));



ALTER TABLE "public"."school_teachers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "school_teachers_admins_delete" ON "public"."school_teachers" FOR DELETE USING (("school_id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE ("school_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "school_teachers_admins_insert" ON "public"."school_teachers" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE ("school_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "school_teachers_admins_update" ON "public"."school_teachers" FOR UPDATE USING (("school_id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE ("school_admins"."user_id" = "auth"."uid"())))) WITH CHECK (("school_id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE ("school_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "school_teachers_self_read" ON "public"."school_teachers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "school_teachers_visible_to_admins" ON "public"."school_teachers" FOR SELECT USING (("school_id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE ("school_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "school_update_own_invites" ON "public"."teacher_invites" FOR UPDATE USING (("school_id" = "auth"."uid"())) WITH CHECK (("school_id" = "auth"."uid"()));



ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schools_admins_insert" ON "public"."schools" FOR INSERT WITH CHECK (true);



CREATE POLICY "schools_admins_read" ON "public"."schools" FOR SELECT USING (("id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE ("school_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "schools_admins_update" ON "public"."schools" FOR UPDATE USING (("id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE (("school_admins"."user_id" = "auth"."uid"()) AND ("school_admins"."role" = 'owner'::"text"))))) WITH CHECK (("id" IN ( SELECT "school_admins"."school_id"
   FROM "public"."school_admins"
  WHERE (("school_admins"."user_id" = "auth"."uid"()) AND ("school_admins"."role" = 'owner'::"text")))));



CREATE POLICY "schools_owner_all" ON "public"."schools" USING (("auth"."uid"() = "owner_id"));



ALTER TABLE "public"."sensitive_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sensitive_data_access_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_alerts_safe" ON "public"."student_alerts" USING ((("student_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "student_alerts"."class_id") AND ("c"."created_by" = "auth"."uid"()))))));



ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "submissions_select_own_or_teacher" ON "public"."submissions" FOR SELECT TO "authenticated" USING ((("student_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."activities" "a"
  WHERE (("a"."id" = "submissions"."activity_id") AND ("a"."created_by" = "auth"."uid"()))
 LIMIT 1)) OR (EXISTS ( SELECT 1
   FROM ("public"."activity_class_assignments" "aca"
     JOIN "public"."class_members" "cm" ON (("cm"."class_id" = "aca"."class_id")))
  WHERE (("aca"."activity_id" = "submissions"."activity_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'teacher'::"text"))
 LIMIT 1))));



COMMENT ON POLICY "submissions_select_own_or_teacher" ON "public"."submissions" IS 'Otimizado: Usa LIMIT 1 em subqueries para parar assim que encontrar match';



CREATE POLICY "submissions_student" ON "public"."submissions" USING (("student_id" = "auth"."uid"())) WITH CHECK (("student_id" = "auth"."uid"()));



COMMENT ON POLICY "submissions_student" ON "public"."submissions" IS 'Alunos veem suas submissões';



CREATE POLICY "submissions_teacher" ON "public"."submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."activities" "a"
  WHERE (("a"."id" = "submissions"."activity_id") AND ("a"."created_by" = "auth"."uid"())))));



COMMENT ON POLICY "submissions_teacher" ON "public"."submissions" IS 'Professores veem submissões';



CREATE POLICY "system_insert_badges" ON "public"."user_badges" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."teacher_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teacher_subscriptions_delete_self" ON "public"."teacher_subscriptions" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "teacher_subscriptions_insert_self" ON "public"."teacher_subscriptions" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "teacher_subscriptions_select_self" ON "public"."teacher_subscriptions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "teacher_subscriptions_update_self" ON "public"."teacher_subscriptions" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("user_id" = "auth"."uid"()) OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_achievements_self_read" ON "public"."user_achievements" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_achievements_self_write" ON "public"."user_achievements" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_badges_self_insert" ON "public"."user_badges" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_badges_self_read" ON "public"."user_badges" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_missions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_missions_insert_policy" ON "public"."user_missions" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"text", 'school_admin'::"text"])))))));



CREATE POLICY "user_missions_select_policy" ON "public"."user_missions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"text", 'school_admin'::"text"])))))));



CREATE POLICY "user_missions_self" ON "public"."user_missions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_missions_self_ins_upd" ON "public"."user_missions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_missions_self_read" ON "public"."user_missions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_missions_update_policy" ON "public"."user_missions" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"text", 'school_admin'::"text"])))))));



CREATE POLICY "users_read_own_badges" ON "public"."user_badges" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_read_own_logs" ON "public"."logger" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."xp_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "xp_log_insert_self" ON "public"."xp_log" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "xp_log_self" ON "public"."xp_log" FOR SELECT USING (("user_id" = "auth"."uid"()));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_class_invitation"("invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_class_invitation"("invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_class_invitation"("invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_invitation_with_transaction"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invitation_with_transaction"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation_with_transaction"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_audit_columns"("p_table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_audit_columns"("p_table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_audit_columns"("p_table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."anonymize_old_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."anonymize_old_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."anonymize_old_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_grade_with_transaction"("p_submission_id" "uuid", "p_grade" numeric, "p_feedback" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_grade_with_transaction"("p_submission_id" "uuid", "p_grade" numeric, "p_feedback" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_grade_with_transaction"("p_submission_id" "uuid", "p_grade" numeric, "p_feedback" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_create_school_for_school_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_school_for_school_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_school_for_school_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."award_badge"("p_user_id" "uuid", "p_badge_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."award_badge"("p_user_id" "uuid", "p_badge_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_badge"("p_user_id" "uuid", "p_badge_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_age"("birth_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_age"("birth_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_age"("birth_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_teacher_create_class"("teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_teacher_create_class"("teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_teacher_create_class"("teacher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_award_xp_badges"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_award_xp_badges"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_award_xp_badges"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_performance_health"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_performance_health"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_performance_health"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_old_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_old_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_old_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_old_notification_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_old_notification_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_old_notification_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"("days_old" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"("days_old" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_notifications"("days_old" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."compare_classes"("p_teacher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."compare_classes"("p_teacher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compare_classes"("p_teacher_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."compute_leaderboard"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."compute_leaderboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."compute_leaderboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_leaderboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."count_class_members"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_class_members"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_class_members"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_class_students"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_class_students"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_class_students"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_class_students_batch"("p_class_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."count_class_students_batch"("p_class_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_class_students_batch"("p_class_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."count_school_students"("p_school_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_school_students"("p_school_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_school_students"("p_school_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_class_with_transaction"("p_teacher_id" "uuid", "p_name" "text", "p_subject" "text", "p_description" "text", "p_course" "text", "p_period" "text", "p_grade_level" "text", "p_academic_year" integer, "p_color" "text", "p_student_capacity" integer, "p_chatbot_enabled" boolean, "p_school_id" "uuid", "p_is_school_managed" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_class_with_transaction"("p_teacher_id" "uuid", "p_name" "text", "p_subject" "text", "p_description" "text", "p_course" "text", "p_period" "text", "p_grade_level" "text", "p_academic_year" integer, "p_color" "text", "p_student_capacity" integer, "p_chatbot_enabled" boolean, "p_school_id" "uuid", "p_is_school_managed" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_class_with_transaction"("p_teacher_id" "uuid", "p_name" "text", "p_subject" "text", "p_description" "text", "p_course" "text", "p_period" "text", "p_grade_level" "text", "p_academic_year" integer, "p_color" "text", "p_student_capacity" integer, "p_chatbot_enabled" boolean, "p_school_id" "uuid", "p_is_school_managed" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" "text", "p_message" "text", "p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" "text", "p_message" "text", "p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" character varying, "p_title" "text", "p_message" "text", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_cpf"("cpf_encrypted" "text", "encryption_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_cpf"("cpf_encrypted" "text", "encryption_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_cpf"("cpf_encrypted" "text", "encryption_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_cpf"("cpf_plain" "text", "encryption_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_cpf"("cpf_plain" "text", "encryption_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_cpf"("cpf_plain" "text", "encryption_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_teacher_invites"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_teacher_invites"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_teacher_invites"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gdpr_delete_user_data"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."gdpr_delete_user_data"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gdpr_delete_user_data"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_class_attendance_rate"("p_class_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_class_attendance_rate"("p_class_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_attendance_rate"("p_class_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_class_grade_stats"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_class_grade_stats"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_grade_stats"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_class_grades_export"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_class_grades_export"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_grades_export"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_class_insights"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_class_insights"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_insights"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_class_stats"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_class_stats"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_stats"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_plagiarism_stats"("p_activity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_plagiarism_stats"("p_activity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_plagiarism_stats"("p_activity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_school_classes_safe"("school_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_school_classes_safe"("school_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_school_classes_safe"("school_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_school_teachers_safe"("school_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_school_teachers_safe"("school_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_school_teachers_safe"("school_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_class_ids_direct"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_class_ids_direct"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_class_ids_direct"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_classes"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_classes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_classes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_school_safe"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_school_safe"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_school_safe"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_total_xp"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_total_xp"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_total_xp"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_xp_history"("p_user_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_xp_history"("p_user_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_xp_history"("p_user_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_xp_today"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_xp_today"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_xp_today"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_cpf"("cpf_plain" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hash_cpf"("cpf_plain" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_cpf"("cpf_plain" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_post_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_post_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_post_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_template_usage"("template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_template_usage"("template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_template_usage"("template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_student_gamification"() TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_student_gamification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_student_gamification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_class_active_on_date"("p_class_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."is_class_active_on_date"("p_class_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_class_active_on_date"("p_class_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_class_member"("p_class_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_class_member"("p_class_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_class_member"("p_class_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_class_teacher"("p_class_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_class_teacher"("p_class_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_class_teacher"("p_class_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_class_teacher_direct"("p_class_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_class_teacher_direct"("p_class_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_class_teacher_direct"("p_class_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_school_active"("school_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_school_active"("school_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_school_active"("school_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_school_admin"("user_id" "uuid", "school_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_school_admin"("user_id" "uuid", "school_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_school_admin"("user_id" "uuid", "school_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_student"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_student"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_student"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_teacher"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_teacher"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_teacher"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_class_teacher_direct"("p_user_id" "uuid", "p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_class_teacher_direct"("p_user_id" "uuid", "p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_class_teacher_direct"("p_user_id" "uuid", "p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_in_class_direct"("p_user_id" "uuid", "p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_in_class_direct"("p_user_id" "uuid", "p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_in_class_direct"("p_user_id" "uuid", "p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_class_attendance"("p_class_id" "uuid", "p_user_id" "uuid", "p_joined_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."log_class_attendance"("p_class_id" "uuid", "p_user_id" "uuid", "p_joined_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_class_attendance"("p_class_id" "uuid", "p_user_id" "uuid", "p_joined_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."log_class_member_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_class_member_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_class_member_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_grade_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_grade_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_grade_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_sensitive_data_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_sensitive_data_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_sensitive_data_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_student"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_student"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_student"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_xp_gained"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_xp_gained"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_xp_gained"() TO "service_role";



GRANT ALL ON FUNCTION "public"."publish_scheduled_posts"() TO "anon";
GRANT ALL ON FUNCTION "public"."publish_scheduled_posts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_scheduled_posts"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_missions_daily"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_missions_daily"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_missions_daily"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_missions_daily"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_rag_vectors"("query_embedding" "public"."vector", "class_id_filter" "uuid", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_rag_vectors"("query_embedding" "public"."vector", "class_id_filter" "uuid", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_rag_vectors"("query_embedding" "public"."vector", "class_id_filter" "uuid", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_gamification_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_gamification_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_gamification_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_submission_plagiarism_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_submission_plagiarism_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_submission_plagiarism_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_teacher_subscriptions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_teacher_subscriptions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_teacher_subscriptions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."submit_activity_with_transaction"("p_activity_id" "uuid", "p_user_id" "uuid", "p_submission_text" "text", "p_attachments" "jsonb", "p_grade" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_activity_with_transaction"("p_activity_id" "uuid", "p_user_id" "uuid", "p_submission_text" "text", "p_attachments" "jsonb", "p_grade" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_activity_with_transaction"("p_activity_id" "uuid", "p_user_id" "uuid", "p_submission_text" "text", "p_attachments" "jsonb", "p_grade" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_class_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_class_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_class_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_gamification_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_gamification_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_gamification_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_reward_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_reward_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_reward_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_teacher_invites_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_teacher_invites_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_teacher_invites_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_view_activity"("p_activity_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_view_activity"("p_activity_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_view_activity"("p_activity_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_class_access"("p_class_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_class_access"("p_class_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_class_access"("p_class_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_class_teacher"("p_class_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_class_teacher"("p_class_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_class_teacher"("p_class_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_teacher"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_teacher"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_teacher"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."uuid_generate_v4"() TO "anon";
GRANT ALL ON FUNCTION "public"."uuid_generate_v4"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."uuid_generate_v4"() TO "service_role";



GRANT ALL ON TABLE "public"."achievements_catalog" TO "anon";
GRANT ALL ON TABLE "public"."achievements_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."activity_class_assignments" TO "anon";
GRANT ALL ON TABLE "public"."activity_class_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_class_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."class_members" TO "anon";
GRANT ALL ON TABLE "public"."class_members" TO "authenticated";
GRANT ALL ON TABLE "public"."class_members" TO "service_role";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON TABLE "public"."activity_grades" TO "anon";
GRANT ALL ON TABLE "public"."activity_grades" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_grades" TO "service_role";



GRANT ALL ON TABLE "public"."answers" TO "anon";
GRANT ALL ON TABLE "public"."answers" TO "authenticated";
GRANT ALL ON TABLE "public"."answers" TO "service_role";



GRANT ALL ON TABLE "public"."application_logs" TO "anon";
GRANT ALL ON TABLE "public"."application_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."application_logs" TO "service_role";



GRANT ALL ON TABLE "public"."badges" TO "anon";
GRANT ALL ON TABLE "public"."badges" TO "authenticated";
GRANT ALL ON TABLE "public"."badges" TO "service_role";



GRANT ALL ON TABLE "public"."badges_catalog" TO "anon";
GRANT ALL ON TABLE "public"."badges_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."badges_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_sync" TO "anon";
GRANT ALL ON TABLE "public"."calendar_sync" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_sync" TO "service_role";



GRANT ALL ON TABLE "public"."chatbot_config_versions" TO "anon";
GRANT ALL ON TABLE "public"."chatbot_config_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbot_config_versions" TO "service_role";



GRANT ALL ON TABLE "public"."class_activity_performance" TO "anon";
GRANT ALL ON TABLE "public"."class_activity_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."class_activity_performance" TO "service_role";



GRANT ALL ON TABLE "public"."class_attendance" TO "anon";
GRANT ALL ON TABLE "public"."class_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."class_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."class_materials" TO "anon";
GRANT ALL ON TABLE "public"."class_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."class_materials" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."class_daily_activity" TO "anon";
GRANT ALL ON TABLE "public"."class_daily_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."class_daily_activity" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."class_grade_matrix" TO "anon";
GRANT ALL ON TABLE "public"."class_grade_matrix" TO "authenticated";
GRANT ALL ON TABLE "public"."class_grade_matrix" TO "service_role";



GRANT ALL ON TABLE "public"."class_invitations" TO "anon";
GRANT ALL ON TABLE "public"."class_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."class_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."class_member_history" TO "anon";
GRANT ALL ON TABLE "public"."class_member_history" TO "authenticated";
GRANT ALL ON TABLE "public"."class_member_history" TO "service_role";



GRANT ALL ON TABLE "public"."class_performance_overview" TO "anon";
GRANT ALL ON TABLE "public"."class_performance_overview" TO "authenticated";
GRANT ALL ON TABLE "public"."class_performance_overview" TO "service_role";



GRANT ALL ON TABLE "public"."class_posts" TO "anon";
GRANT ALL ON TABLE "public"."class_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."class_posts" TO "service_role";



GRANT ALL ON TABLE "public"."class_rank_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."class_rank_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."class_rank_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."class_recordings" TO "anon";
GRANT ALL ON TABLE "public"."class_recordings" TO "authenticated";
GRANT ALL ON TABLE "public"."class_recordings" TO "service_role";



GRANT ALL ON TABLE "public"."class_settings" TO "anon";
GRANT ALL ON TABLE "public"."class_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."class_settings" TO "service_role";



GRANT ALL ON TABLE "public"."class_student_ranking" TO "anon";
GRANT ALL ON TABLE "public"."class_student_ranking" TO "authenticated";
GRANT ALL ON TABLE "public"."class_student_ranking" TO "service_role";



GRANT ALL ON TABLE "public"."comment_likes" TO "anon";
GRANT ALL ON TABLE "public"."comment_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_likes" TO "service_role";



GRANT ALL ON TABLE "public"."discussion_messages" TO "anon";
GRANT ALL ON TABLE "public"."discussion_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."discussion_messages" TO "service_role";



GRANT ALL ON TABLE "public"."discussions" TO "anon";
GRANT ALL ON TABLE "public"."discussions" TO "authenticated";
GRANT ALL ON TABLE "public"."discussions" TO "service_role";



GRANT ALL ON TABLE "public"."event_participants" TO "anon";
GRANT ALL ON TABLE "public"."event_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."event_participants" TO "service_role";



GRANT ALL ON TABLE "public"."events_competitions" TO "anon";
GRANT ALL ON TABLE "public"."events_competitions" TO "authenticated";
GRANT ALL ON TABLE "public"."events_competitions" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_templates" TO "anon";
GRANT ALL ON TABLE "public"."feedback_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_templates" TO "service_role";



GRANT ALL ON TABLE "public"."focus_sessions" TO "anon";
GRANT ALL ON TABLE "public"."focus_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."focus_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."gamification_profiles" TO "anon";
GRANT ALL ON TABLE "public"."gamification_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."gamification_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."grade_history" TO "anon";
GRANT ALL ON TABLE "public"."grade_history" TO "authenticated";
GRANT ALL ON TABLE "public"."grade_history" TO "service_role";



GRANT ALL ON TABLE "public"."grading_queue" TO "anon";
GRANT ALL ON TABLE "public"."grading_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."grading_queue" TO "service_role";



GRANT ALL ON TABLE "public"."grading_rubrics" TO "anon";
GRANT ALL ON TABLE "public"."grading_rubrics" TO "authenticated";
GRANT ALL ON TABLE "public"."grading_rubrics" TO "service_role";



GRANT ALL ON TABLE "public"."invite_code_history" TO "anon";
GRANT ALL ON TABLE "public"."invite_code_history" TO "authenticated";
GRANT ALL ON TABLE "public"."invite_code_history" TO "service_role";



GRANT ALL ON TABLE "public"."logger" TO "anon";
GRANT ALL ON TABLE "public"."logger" TO "authenticated";
GRANT ALL ON TABLE "public"."logger" TO "service_role";



GRANT ALL ON TABLE "public"."material_class_assignments" TO "anon";
GRANT ALL ON TABLE "public"."material_class_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."material_class_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_participants" TO "anon";
GRANT ALL ON TABLE "public"."meeting_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_participants" TO "service_role";



GRANT ALL ON TABLE "public"."meetings" TO "anon";
GRANT ALL ON TABLE "public"."meetings" TO "authenticated";
GRANT ALL ON TABLE "public"."meetings" TO "service_role";



GRANT ALL ON TABLE "public"."missions" TO "anon";
GRANT ALL ON TABLE "public"."missions" TO "authenticated";
GRANT ALL ON TABLE "public"."missions" TO "service_role";



GRANT ALL ON TABLE "public"."missions_catalog" TO "anon";
GRANT ALL ON TABLE "public"."missions_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."missions_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."notification_logs" TO "anon";
GRANT ALL ON TABLE "public"."notification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."plagiarism_checks" TO "anon";
GRANT ALL ON TABLE "public"."plagiarism_checks" TO "authenticated";
GRANT ALL ON TABLE "public"."plagiarism_checks" TO "service_role";



GRANT ALL ON TABLE "public"."plagiarism_checks_v2" TO "anon";
GRANT ALL ON TABLE "public"."plagiarism_checks_v2" TO "authenticated";
GRANT ALL ON TABLE "public"."plagiarism_checks_v2" TO "service_role";



GRANT ALL ON TABLE "public"."plagiarism_logs" TO "anon";
GRANT ALL ON TABLE "public"."plagiarism_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."plagiarism_logs" TO "service_role";



GRANT ALL ON TABLE "public"."post_comments" TO "anon";
GRANT ALL ON TABLE "public"."post_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."post_comments" TO "service_role";



GRANT ALL ON TABLE "public"."post_likes" TO "anon";
GRANT ALL ON TABLE "public"."post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_likes" TO "service_role";



GRANT ALL ON TABLE "public"."post_views" TO "anon";
GRANT ALL ON TABLE "public"."post_views" TO "authenticated";
GRANT ALL ON TABLE "public"."post_views" TO "service_role";



GRANT ALL ON TABLE "public"."profiles_with_age" TO "anon";
GRANT ALL ON TABLE "public"."profiles_with_age" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles_with_age" TO "service_role";



GRANT ALL ON TABLE "public"."question_bank" TO "anon";
GRANT ALL ON TABLE "public"."question_bank" TO "authenticated";
GRANT ALL ON TABLE "public"."question_bank" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_assignments" TO "anon";
GRANT ALL ON TABLE "public"."quiz_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_questions" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."rag_training_sources" TO "anon";
GRANT ALL ON TABLE "public"."rag_training_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_training_sources" TO "service_role";



GRANT ALL ON TABLE "public"."rag_vectors" TO "anon";
GRANT ALL ON TABLE "public"."rag_vectors" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_vectors" TO "service_role";



GRANT ALL ON TABLE "public"."reward_settings" TO "anon";
GRANT ALL ON TABLE "public"."reward_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_settings" TO "service_role";



GRANT ALL ON TABLE "public"."school_admins" TO "anon";
GRANT ALL ON TABLE "public"."school_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."school_admins" TO "service_role";



GRANT ALL ON TABLE "public"."school_announcements" TO "anon";
GRANT ALL ON TABLE "public"."school_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."school_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."school_classes" TO "anon";
GRANT ALL ON TABLE "public"."school_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."school_classes" TO "service_role";



GRANT ALL ON TABLE "public"."school_teachers" TO "anon";
GRANT ALL ON TABLE "public"."school_teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."school_teachers" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."sensitive_data" TO "anon";
GRANT ALL ON TABLE "public"."sensitive_data" TO "authenticated";
GRANT ALL ON TABLE "public"."sensitive_data" TO "service_role";



GRANT ALL ON TABLE "public"."sensitive_data_access_log" TO "anon";
GRANT ALL ON TABLE "public"."sensitive_data_access_log" TO "authenticated";
GRANT ALL ON TABLE "public"."sensitive_data_access_log" TO "service_role";



GRANT ALL ON TABLE "public"."student_alerts" TO "anon";
GRANT ALL ON TABLE "public"."student_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."student_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."student_grades" TO "anon";
GRANT ALL ON TABLE "public"."student_grades" TO "authenticated";
GRANT ALL ON TABLE "public"."student_grades" TO "service_role";



GRANT ALL ON TABLE "public"."student_plagiarism_stats" TO "anon";
GRANT ALL ON TABLE "public"."student_plagiarism_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."student_plagiarism_stats" TO "service_role";



GRANT ALL ON TABLE "public"."submissions_pending_plagiarism" TO "anon";
GRANT ALL ON TABLE "public"."submissions_pending_plagiarism" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions_pending_plagiarism" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_invites" TO "anon";
GRANT ALL ON TABLE "public"."teacher_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_invites" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."teacher_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."unread_notifications_count" TO "anon";
GRANT ALL ON TABLE "public"."unread_notifications_count" TO "authenticated";
GRANT ALL ON TABLE "public"."unread_notifications_count" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT ALL ON TABLE "public"."user_missions" TO "anon";
GRANT ALL ON TABLE "public"."user_missions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_missions" TO "service_role";



GRANT ALL ON TABLE "public"."v_class_membership" TO "anon";
GRANT ALL ON TABLE "public"."v_class_membership" TO "authenticated";
GRANT ALL ON TABLE "public"."v_class_membership" TO "service_role";



GRANT ALL ON TABLE "public"."xp_log" TO "anon";
GRANT ALL ON TABLE "public"."xp_log" TO "authenticated";
GRANT ALL ON TABLE "public"."xp_log" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







