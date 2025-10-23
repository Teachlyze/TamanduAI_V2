-- ============================================
-- FIX: Infinite Recursion in RLS Policies
-- ============================================

-- 1. CREATE SECURITY DEFINER FUNCTIONS (bypass RLS)
-- These functions run with elevated privileges and don't trigger RLS checks

CREATE OR REPLACE FUNCTION public.is_user_in_class_direct(p_user_id UUID, p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _exists BOOLEAN := FALSE;
BEGIN
  IF to_regclass('public.class_members') IS NULL THEN
    RETURN FALSE;
  END IF;

  EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.class_members WHERE user_id = $1 AND class_id = $2)'
    INTO _exists
    USING p_user_id, p_class_id;

  RETURN COALESCE(_exists, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_class_teacher_direct(p_user_id UUID, p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _exists BOOLEAN := FALSE;
BEGIN
  IF to_regclass('public.classes') IS NULL THEN
    RETURN FALSE;
  END IF;

  EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.classes WHERE id = $1 AND created_by = $2)'
    INTO _exists
    USING p_class_id, p_user_id;

  RETURN COALESCE(_exists, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_class_ids_direct(p_user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  ids UUID[] := ARRAY[]::uuid[];
BEGIN
  IF to_regclass('public.class_members') IS NULL THEN
    RETURN ids;
  END IF;

  EXECUTE 'SELECT ARRAY_AGG(class_id) FROM public.class_members WHERE user_id = $1'
    INTO ids
    USING p_user_id;

  RETURN COALESCE(ids, ARRAY[]::uuid[]);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_created_class_ids_direct(p_user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  ids UUID[] := ARRAY[]::uuid[];
BEGIN
  IF to_regclass('public.classes') IS NULL THEN
    RETURN ids;
  END IF;

  EXECUTE 'SELECT ARRAY_AGG(id) FROM public.classes WHERE created_by = $1'
    INTO ids
    USING p_user_id;

  RETURN COALESCE(ids, ARRAY[]::uuid[]);
END;
$$;

-- 2. DROP OLD PROBLEMATIC POLICIES

-- Drop classes policies (only if table exists)
DO $$
BEGIN
  IF to_regclass('public.classes') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "classes_select_teacher_or_member" ON public.classes';
    EXECUTE 'DROP POLICY IF EXISTS "classes_insert_authenticated" ON public.classes';
    EXECUTE 'DROP POLICY IF EXISTS "classes_update_teacher" ON public.classes';
    EXECUTE 'DROP POLICY IF EXISTS "classes_delete_teacher" ON public.classes';
    EXECUTE 'DROP POLICY IF EXISTS "classes_read_safe" ON public.classes';
    EXECUTE 'DROP POLICY IF EXISTS "classes_write_teacher" ON public.classes';
  END IF;
END $$;

-- Drop class_members policies (only if table exists)
DO $$
BEGIN
  IF to_regclass('public.class_members') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "class_members_read_safe" ON public.class_members';
    EXECUTE 'DROP POLICY IF EXISTS "class_members_insert_safe" ON public.class_members';
    EXECUTE 'DROP POLICY IF EXISTS "class_members_update_safe" ON public.class_members';
    EXECUTE 'DROP POLICY IF EXISTS "class_members_delete_safe" ON public.class_members';
    EXECUTE 'DROP POLICY IF EXISTS "class_members_select" ON public.class_members';
    EXECUTE 'DROP POLICY IF EXISTS "class_members_insert" ON public.class_members';
    EXECUTE 'DROP POLICY IF EXISTS "class_members_update" ON public.class_members';
    EXECUTE 'DROP POLICY IF EXISTS "class_members_delete" ON public.class_members';
  END IF;
END $$;

-- 3. CREATE NEW NON-RECURSIVE POLICIES

-- CLASSES policies (create only if table exists)
DO $$
BEGIN
  IF to_regclass('public.classes') IS NOT NULL THEN
    EXECUTE $qp$
      CREATE POLICY "classes_select_by_creator_or_member"
      ON public.classes
      FOR SELECT
      USING (
        created_by = auth.uid() 
        OR id = ANY(get_user_class_ids_direct(auth.uid()))
      )
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "classes_insert_by_creator"
      ON public.classes
      FOR INSERT
      WITH CHECK (created_by = auth.uid())
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "classes_update_by_creator"
      ON public.classes
      FOR UPDATE
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid())
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "classes_delete_by_creator"
      ON public.classes
      FOR DELETE
      USING (created_by = auth.uid())
    $qp$;
  END IF;
END $$;

-- CLASS_MEMBERS policies (only create if table exists)
DO $$
BEGIN
  IF to_regclass('public.class_members') IS NOT NULL THEN
    EXECUTE $qp$
      CREATE POLICY "class_members_select_own_or_teacher"
      ON public.class_members
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR class_id = ANY(get_user_created_class_ids_direct(auth.uid()))
      )
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "class_members_insert_by_teacher"
      ON public.class_members
      FOR INSERT
      WITH CHECK (
        class_id = ANY(get_user_created_class_ids_direct(auth.uid()))
      )
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "class_members_update_by_teacher"
      ON public.class_members
      FOR UPDATE
      USING (
        class_id = ANY(get_user_created_class_ids_direct(auth.uid()))
      )
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "class_members_delete_by_teacher_or_self"
      ON public.class_members
      FOR DELETE
      USING (
        user_id = auth.uid()
        OR class_id = ANY(get_user_created_class_ids_direct(auth.uid()))
      )
    $qp$;
  END IF;
END $$;

-- 4. FIX CALENDAR_EVENTS policies (guard if table exists)
DO $$
BEGIN
  IF to_regclass('public.calendar_events') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "calendar_events_update" ON public.calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events';

    EXECUTE $qp$
      CREATE POLICY "calendar_events_select_member_or_creator"
      ON public.calendar_events
      FOR SELECT
      USING (
        created_by = auth.uid()
        OR class_id = ANY(get_user_class_ids_direct(auth.uid()))
      )
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "calendar_events_insert_creator"
      ON public.calendar_events
      FOR INSERT
      WITH CHECK (
        created_by = auth.uid()
        AND (class_id IS NULL OR class_id = ANY(get_user_created_class_ids_direct(auth.uid())))
      )
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "calendar_events_update_creator"
      ON public.calendar_events
      FOR UPDATE
      USING (created_by = auth.uid())
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "calendar_events_delete_creator"
      ON public.calendar_events
      FOR DELETE
      USING (created_by = auth.uid())
    $qp$;
  END IF;
END $$;

-- 5. FIX SUBMISSIONS policies (guard if table exists)
DO $$
BEGIN
  IF to_regclass('public.submissions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "submissions_select" ON public.submissions';
    EXECUTE 'DROP POLICY IF EXISTS "submissions_insert" ON public.submissions';
    EXECUTE 'DROP POLICY IF EXISTS "submissions_update" ON public.submissions';
    EXECUTE 'DROP POLICY IF EXISTS "submissions_read_safe" ON public.submissions';
    EXECUTE 'DROP POLICY IF EXISTS "submissions_write_student" ON public.submissions';
    EXECUTE 'DROP POLICY IF EXISTS "submissions_select_student_or_teacher" ON public.submissions';
    EXECUTE 'DROP POLICY IF EXISTS "submissions_insert_student" ON public.submissions';
    EXECUTE 'DROP POLICY IF EXISTS "submissions_update_student_or_teacher" ON public.submissions';

    EXECUTE $qp$
      CREATE POLICY "submissions_select_student_or_teacher" ON public.submissions FOR SELECT
      USING (
        student_id = auth.uid()
        OR activity_id IN (
          SELECT a.id FROM activities a
          WHERE a.created_by = auth.uid()
        )
      )
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "submissions_insert_student"
      ON public.submissions
      FOR INSERT
      WITH CHECK (student_id = auth.uid())
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "submissions_update_student_or_teacher"
      ON public.submissions
      FOR UPDATE
      USING (
        student_id = auth.uid()
        OR activity_id IN (
          SELECT a.id FROM activities a
          WHERE a.created_by = auth.uid()
        )
      )
    $qp$;
  END IF;
END $$;

-- 6. FIX ACTIVITIES policies (guard if table exists)
DO $$
BEGIN
  IF to_regclass('public.activities') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "activities_select_creator_or_student" ON public.activities';
    EXECUTE 'DROP POLICY IF EXISTS "activities_insert_creator" ON public.activities';
    EXECUTE 'DROP POLICY IF EXISTS "activities_update_creator" ON public.activities';
    EXECUTE 'DROP POLICY IF EXISTS "activities_delete_creator" ON public.activities';
    EXECUTE 'DROP POLICY IF EXISTS "activities_select_creator_or_assigned" ON public.activities';

    EXECUTE $qp$
      CREATE POLICY "activities_select_creator_or_assigned"
      ON public.activities
      FOR SELECT
      USING (
        created_by = auth.uid()
        OR id IN (
          SELECT aca.activity_id 
          FROM activity_class_assignments aca
          WHERE aca.class_id = ANY(get_user_class_ids_direct(auth.uid()))
        )
      )
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "activities_insert_creator"
      ON public.activities
      FOR INSERT
      WITH CHECK (created_by = auth.uid())
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "activities_update_creator"
      ON public.activities
      FOR UPDATE
      USING (created_by = auth.uid())
    $qp$;

    EXECUTE $qp$
      CREATE POLICY "activities_delete_creator"
      ON public.activities
      FOR DELETE
      USING (created_by = auth.uid())
    $qp$;
  END IF;
END $$;

-- 7. GRANT EXECUTE on new functions
GRANT EXECUTE ON FUNCTION public.is_user_in_class_direct TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_class_teacher_direct TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_class_ids_direct TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_created_class_ids_direct TO authenticated;

-- 8. ADD COMMENTS
COMMENT ON FUNCTION public.is_user_in_class_direct IS 'SECURITY DEFINER - Check if user is in class without triggering RLS';
COMMENT ON FUNCTION public.is_user_class_teacher_direct IS 'SECURITY DEFINER - Check if user created class without triggering RLS';
COMMENT ON FUNCTION public.get_user_class_ids_direct IS 'SECURITY DEFINER - Get user class IDs without triggering RLS';
COMMENT ON FUNCTION public.get_user_created_class_ids_direct IS 'SECURITY DEFINER - Get user created class IDs without triggering RLS';
