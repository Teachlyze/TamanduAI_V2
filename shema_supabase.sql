-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.achievements_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  rules jsonb NOT NULL,
  reward_xp integer NOT NULL DEFAULT 0,
  CONSTRAINT achievements_catalog_pkey PRIMARY KEY (id)
);
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content jsonb DEFAULT '{}'::jsonb,
  type text NOT NULL DEFAULT 'assignment'::text CHECK (type = ANY (ARRAY['assignment'::text, 'quiz'::text, 'project'::text])),
  due_date timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])),
  max_score numeric DEFAULT 100.00,
  instructions text,
  plagiarism_enabled boolean DEFAULT false,
  is_group_activity boolean DEFAULT false,
  group_size integer DEFAULT 1,
  plagiarism_threshold smallint DEFAULT 35 CHECK (plagiarism_threshold = ANY (ARRAY[20, 35, 50])),
  weight numeric DEFAULT 1.0 CHECK (weight IS NULL OR weight > 0::numeric),
  class_id uuid,
  deleted_at timestamp with time zone,
  is_published boolean DEFAULT false,
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT activities_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.activity_class_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL,
  class_id uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_class_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT activity_class_assignments_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id),
  CONSTRAINT activity_class_assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  question_id text NOT NULL,
  answer_json jsonb,
  points_earned numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT answers_pkey PRIMARY KEY (id),
  CONSTRAINT answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id)
);
CREATE TABLE public.application_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  level integer NOT NULL DEFAULT 3,
  level_name text NOT NULL DEFAULT 'INFO'::text,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  user_email text,
  session_id text,
  user_agent text,
  url text,
  environment text DEFAULT 'production'::text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '90 days'::interval),
  CONSTRAINT application_logs_pkey PRIMARY KEY (id),
  CONSTRAINT application_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.badges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  type text CHECK (type = ANY (ARRAY['level'::text, 'achievement'::text, 'special'::text, 'custom'::text])),
  requirement_type text CHECK (requirement_type = ANY (ARRAY['xp'::text, 'missions'::text, 'activities'::text, 'streak'::text, 'grade'::text, 'custom'::text])),
  requirement_value integer,
  color text DEFAULT '#8b5cf6'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT badges_pkey PRIMARY KEY (id)
);
CREATE TABLE public.badges_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  icon_url text,
  criteria jsonb,
  CONSTRAINT badges_catalog_pkey PRIMARY KEY (id)
);
CREATE TABLE public.calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  class_id uuid,
  activity_id uuid,
  created_by uuid NOT NULL,
  attendees ARRAY DEFAULT '{}'::uuid[],
  location text,
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  type text DEFAULT 'event'::text CHECK (type = ANY (ARRAY['event'::text, 'meeting'::text, 'activity'::text, 'deadline'::text])),
  teacher_id uuid,
  participants jsonb DEFAULT '[]'::jsonb,
  modality text CHECK (modality = ANY (ARRAY['online'::text, 'presential'::text])),
  meeting_link text,
  color text DEFAULT '#3B82F6'::text,
  summary text,
  notes text,
  is_registered boolean DEFAULT false,
  is_cancelled boolean DEFAULT false,
  CONSTRAINT calendar_events_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_events_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT calendar_events_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id),
  CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.calendar_sync (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL,
  user_id uuid NOT NULL,
  google_calendar_id text,
  google_event_id text,
  sync_enabled boolean DEFAULT true,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calendar_sync_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_sync_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT calendar_sync_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.chatbot_config_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  config_snapshot jsonb NOT NULL,
  version_number integer NOT NULL,
  change_description text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chatbot_config_versions_pkey PRIMARY KEY (id),
  CONSTRAINT chatbot_config_versions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT chatbot_config_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.class_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  calendar_event_id uuid,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'present'::text CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'excused'::text])),
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT class_attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_attendance_calendar_event_id_fkey FOREIGN KEY (calendar_event_id) REFERENCES public.calendar_events(id),
  CONSTRAINT class_attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.class_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  invitee_email text NOT NULL,
  invitee_id uuid,
  inviter_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text])),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  declined_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  CONSTRAINT class_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT class_invitations_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_invitations_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES auth.users(id),
  CONSTRAINT class_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES auth.users(id),
  CONSTRAINT class_invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.class_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  file_url text,
  file_type text,
  file_size bigint,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  category text,
  tags ARRAY,
  created_by uuid NOT NULL,
  deleted_at timestamp with time zone,
  CONSTRAINT class_materials_pkey PRIMARY KEY (id),
  CONSTRAINT class_materials_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_materials_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT fk_class_materials_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.class_member_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action = ANY (ARRAY['added'::text, 'removed'::text, 'role_changed'::text])),
  role text NOT NULL CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text])),
  performed_by uuid NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_member_history_pkey PRIMARY KEY (id),
  CONSTRAINT class_member_history_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_member_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT class_member_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.class_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'student'::text CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text])),
  nickname text,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT class_members_pkey PRIMARY KEY (id),
  CONSTRAINT class_members_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.class_posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['announcement'::text, 'activity'::text, 'material'::text, 'link'::text, 'question'::text])),
  title text,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_pinned boolean DEFAULT false,
  comments_enabled boolean DEFAULT true,
  scheduled_for timestamp with time zone,
  published_at timestamp with time zone,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  link_url text,
  is_scheduled boolean DEFAULT false,
  CONSTRAINT class_posts_pkey PRIMARY KEY (id),
  CONSTRAINT class_posts_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_posts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.class_rank_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  period USER-DEFINED NOT NULL,
  period_start_date date NOT NULL,
  period_end_date date NOT NULL,
  rank_data jsonb NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_rank_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT class_rank_snapshots_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.class_recordings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL,
  recorded_date date NOT NULL,
  recording_url text,
  storage_path text,
  duration_minutes integer,
  file_size_mb numeric,
  status text DEFAULT 'processing'::text CHECK (status = ANY (ARRAY['processing'::text, 'ready'::text, 'failed'::text])),
  google_drive_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_recordings_pkey PRIMARY KEY (id),
  CONSTRAINT class_recordings_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.class_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL UNIQUE,
  join_code character varying UNIQUE,
  join_code_max_uses integer,
  join_code_expiration timestamp with time zone,
  join_code_uses_count integer DEFAULT 0,
  is_join_code_active boolean DEFAULT true,
  schedule jsonb DEFAULT '[]'::jsonb,
  modality text DEFAULT 'online'::text CHECK (modality = ANY (ARRAY['online'::text, 'presential'::text])),
  meeting_link text,
  address text,
  chatbot_enabled boolean DEFAULT false,
  max_students integer,
  banner_color text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_settings_pkey PRIMARY KEY (id),
  CONSTRAINT class_settings_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text,
  description text,
  color text DEFAULT '#3B82F6'::text,
  room_number text,
  student_capacity integer DEFAULT 30,
  created_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  school_id uuid,
  invite_code character varying UNIQUE,
  banner_color character varying DEFAULT 'from-blue-500 to-purple-500'::character varying,
  academic_year integer,
  course text,
  period text,
  grade_level text,
  is_online boolean DEFAULT false,
  meeting_link text,
  chatbot_enabled boolean DEFAULT false,
  meeting_days ARRAY,
  meeting_start_time time without time zone,
  meeting_end_time time without time zone,
  vacation_start date,
  vacation_end date,
  cancelled_dates ARRAY,
  grading_system text NOT NULL DEFAULT '0-10'::text CHECK (grading_system = ANY (ARRAY['0-10'::text, '0-100'::text, 'A-F'::text, 'pass-fail'::text, 'excellent-poor'::text])),
  is_school_managed boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  settings jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT classes_pkey PRIMARY KEY (id),
  CONSTRAINT classes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.comment_likes (
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_likes_pkey PRIMARY KEY (comment_id, user_id),
  CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.post_comments(id),
  CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.discussion_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL,
  parent_message_id uuid,
  user_id uuid NOT NULL,
  content text NOT NULL,
  is_deleted boolean DEFAULT false,
  deleted_by uuid,
  deleted_at timestamp with time zone,
  is_edited boolean DEFAULT false,
  edited_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discussion_messages_pkey PRIMARY KEY (id),
  CONSTRAINT discussion_messages_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id),
  CONSTRAINT discussion_messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.discussion_messages(id),
  CONSTRAINT discussion_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT discussion_messages_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id)
);
CREATE TABLE public.discussions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  activity_id uuid,
  title text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  content text,
  CONSTRAINT discussions_pkey PRIMARY KEY (id),
  CONSTRAINT discussions_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id),
  CONSTRAINT discussions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT discussions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.event_participants (
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  score numeric,
  rank integer,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_participants_pkey PRIMARY KEY (event_id, user_id),
  CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events_competitions(id),
  CONSTRAINT event_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.events_competitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  rules jsonb,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT events_competitions_pkey PRIMARY KEY (id),
  CONSTRAINT events_competitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.feedback_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text,
  tags ARRAY DEFAULT ARRAY[]::text[],
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feedback_templates_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_templates_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.focus_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  started_at timestamp with time zone NOT NULL,
  ended_at timestamp with time zone,
  duration_min integer,
  technique text CHECK (technique = ANY (ARRAY['pomodoro25'::text, 'pomodoro50'::text, 'pomodoro30'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT focus_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT focus_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.gamification_profiles (
  user_id uuid NOT NULL,
  xp_total integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gamification_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT gamification_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.grade_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid NOT NULL,
  previous_grade numeric,
  new_grade numeric NOT NULL,
  changed_by uuid NOT NULL,
  reason text,
  changed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT grade_history_pkey PRIMARY KEY (id),
  CONSTRAINT grade_history_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT grade_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.grading_rubrics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  activity_id uuid,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_weight integer DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT grading_rubrics_pkey PRIMARY KEY (id),
  CONSTRAINT grading_rubrics_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id),
  CONSTRAINT grading_rubrics_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.invite_code_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  code character varying NOT NULL,
  uses_count integer DEFAULT 0,
  deactivated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invite_code_history_pkey PRIMARY KEY (id),
  CONSTRAINT invite_code_history_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.logger (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  level text NOT NULL CHECK (level = ANY (ARRAY['info'::text, 'warn'::text, 'error'::text, 'debug'::text])),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  error_stack text,
  error_name text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT logger_pkey PRIMARY KEY (id),
  CONSTRAINT logger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.material_class_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL,
  class_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT material_class_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT material_class_assignments_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.class_materials(id),
  CONSTRAINT material_class_assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.meeting_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  left_at timestamp with time zone,
  status text DEFAULT 'invited'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meeting_participants_pkey PRIMARY KEY (id),
  CONSTRAINT meeting_participants_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id),
  CONSTRAINT meeting_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  meeting_url text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  external_meeting_url text,
  meeting_type text DEFAULT 'external'::text CHECK (meeting_type = ANY (ARRAY['external'::text, 'agora'::text, 'whiteboard'::text])),
  CONSTRAINT meetings_pkey PRIMARY KEY (id),
  CONSTRAINT meetings_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.missions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  class_id uuid,
  created_by uuid,
  xp_reward integer DEFAULT 0,
  difficulty text CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'expired'::text])),
  due_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT missions_pkey PRIMARY KEY (id),
  CONSTRAINT missions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.missions_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type USER-DEFINED NOT NULL,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  rules jsonb NOT NULL,
  reward_xp integer NOT NULL DEFAULT 0,
  CONSTRAINT missions_catalog_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT notification_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info'::text CHECK (type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text])),
  is_read boolean DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  data jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.plagiarism_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  plagiarism_percentage integer NOT NULL CHECK (plagiarism_percentage >= 0 AND plagiarism_percentage <= 100),
  ai_generated boolean DEFAULT false,
  ai_score integer DEFAULT 0 CHECK (ai_score >= 0 AND ai_score <= 100),
  sources jsonb DEFAULT '[]'::jsonb,
  raw_data jsonb DEFAULT '{}'::jsonb,
  checked_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT plagiarism_checks_pkey PRIMARY KEY (id),
  CONSTRAINT plagiarism_checks_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id)
);
CREATE TABLE public.plagiarism_checks_v2 (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  student_id uuid NOT NULL,
  similarity_percentage numeric NOT NULL DEFAULT 0.00,
  plagiarism_severity text NOT NULL DEFAULT 'none'::text CHECK (plagiarism_severity = ANY (ARRAY['none'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  sources jsonb DEFAULT '[]'::jsonb,
  report_url text,
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT plagiarism_checks_v2_pkey PRIMARY KEY (id),
  CONSTRAINT plagiarism_checks_v2_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT plagiarism_checks_v2_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id),
  CONSTRAINT plagiarism_checks_v2_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.plagiarism_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid,
  error_message text,
  error_stack text,
  request_data jsonb,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT plagiarism_logs_pkey PRIMARY KEY (id),
  CONSTRAINT plagiarism_logs_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id)
);
CREATE TABLE public.post_comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid,
  likes_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_comments_pkey PRIMARY KEY (id),
  CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.class_posts(id),
  CONSTRAINT post_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id),
  CONSTRAINT post_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.post_comments(id)
);
CREATE TABLE public.post_likes (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_likes_pkey PRIMARY KEY (post_id, user_id),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.class_posts(id),
  CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.post_views (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  viewed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_views_pkey PRIMARY KEY (post_id, user_id),
  CONSTRAINT post_views_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.class_posts(id),
  CONSTRAINT post_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'student'::text CHECK (role = ANY (ARRAY['student'::text, 'teacher'::text, 'school'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  cpf text,
  age integer,
  email_confirmed boolean DEFAULT false,
  is_active boolean DEFAULT true,
  birth_date date,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.question_bank (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  author_id uuid,
  school_id uuid,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type = ANY (ARRAY['multiple_choice'::text, 'true_false'::text, 'short_answer'::text, 'essay'::text])),
  options jsonb,
  correct_answer text,
  difficulty text CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
  subject text,
  topic text,
  tags ARRAY,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'approved'::text, 'rejected'::text])),
  uses_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT question_bank_pkey PRIMARY KEY (id),
  CONSTRAINT question_bank_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id),
  CONSTRAINT question_bank_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.quiz_assignments (
  quiz_id uuid NOT NULL,
  class_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT quiz_assignments_pkey PRIMARY KEY (quiz_id, class_id),
  CONSTRAINT quiz_assignments_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id),
  CONSTRAINT quiz_assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT quiz_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id)
);
CREATE TABLE public.quiz_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  user_id uuid NOT NULL,
  answers jsonb,
  score numeric,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id),
  CONSTRAINT quiz_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.quiz_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  prompt text NOT NULL,
  options jsonb,
  answer jsonb,
  explanation text,
  position integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT quiz_questions_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id)
);
CREATE TABLE public.quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  title text NOT NULL,
  source_type text NOT NULL CHECK (source_type = ANY (ARRAY['text'::text, 'file'::text, 'url'::text, 'activity'::text])),
  source_meta jsonb,
  meta jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  is_public boolean NOT NULL DEFAULT false,
  CONSTRAINT quizzes_pkey PRIMARY KEY (id),
  CONSTRAINT quizzes_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id),
  CONSTRAINT quizzes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.rag_training_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  material_id uuid,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  is_active boolean DEFAULT true,
  content_extracted text,
  embedding_status text DEFAULT 'pending'::text,
  vector_ids jsonb,
  added_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  activity_id uuid,
  CONSTRAINT rag_training_sources_pkey PRIMARY KEY (id),
  CONSTRAINT rag_training_sources_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT rag_training_sources_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.class_materials(id),
  CONSTRAINT rag_training_sources_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id),
  CONSTRAINT rag_training_sources_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id)
);
CREATE TABLE public.rag_vectors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL,
  content_chunk text NOT NULL,
  embedding USER-DEFINED,
  chunk_index integer NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rag_vectors_pkey PRIMARY KEY (id),
  CONSTRAINT rag_vectors_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.rag_training_sources(id)
);
CREATE TABLE public.reward_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  scope text CHECK (scope = ANY (ARRAY['school'::text, 'class'::text])),
  scope_id uuid,
  reward_type text CHECK (reward_type = ANY (ARRAY['top_rank_bonus'::text, 'streak_bonus'::text, 'perfect_score'::text, 'mission_complete'::text, 'custom'::text])),
  reward_name text NOT NULL,
  reward_description text,
  reward_value numeric,
  reward_xp integer,
  is_active boolean DEFAULT true,
  conditions jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reward_settings_pkey PRIMARY KEY (id),
  CONSTRAINT reward_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.school_admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  school_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT school_admins_pkey PRIMARY KEY (id),
  CONSTRAINT school_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT school_admins_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.school_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  audience jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  publish_at timestamp with time zone,
  CONSTRAINT school_announcements_pkey PRIMARY KEY (id),
  CONSTRAINT school_announcements_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
  CONSTRAINT school_announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.school_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT school_classes_pkey PRIMARY KEY (id),
  CONSTRAINT school_classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
  CONSTRAINT school_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.school_teachers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'pending'::text, 'removed'::text])),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  monthly_cost numeric,
  CONSTRAINT school_teachers_pkey PRIMARY KEY (id),
  CONSTRAINT school_teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
  CONSTRAINT school_teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.schools (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  owner_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'trial'::text])),
  activated_at timestamp with time zone,
  suspended_at timestamp with time zone,
  suspension_reason text,
  CONSTRAINT schools_pkey PRIMARY KEY (id),
  CONSTRAINT schools_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.sensitive_data (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  cpf_encrypted text,
  cpf_hash text,
  birth_date date,
  phone_encrypted text,
  address_encrypted text,
  encryption_version integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sensitive_data_pkey PRIMARY KEY (id),
  CONSTRAINT sensitive_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.sensitive_data_access_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  accessed_by uuid NOT NULL,
  access_type text NOT NULL,
  field_name text,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sensitive_data_access_log_pkey PRIMARY KEY (id),
  CONSTRAINT sensitive_data_access_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT sensitive_data_access_log_accessed_by_fkey FOREIGN KEY (accessed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.student_alerts (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  alert_type text NOT NULL CHECK (alert_type = ANY (ARRAY['low_grade'::text, 'late_submissions'::text, 'plagiarism'::text, 'no_submissions'::text])),
  severity text NOT NULL CHECK (severity = ANY (ARRAY['attention'::text, 'warning'::text, 'critical'::text])),
  details jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT student_alerts_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id),
  CONSTRAINT student_alerts_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT student_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL,
  student_id uuid NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  grade numeric CHECK (grade IS NULL OR grade >= 0::numeric AND grade <= 10::numeric),
  feedback text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'graded'::text])),
  submitted_at timestamp with time zone,
  graded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  plagiarism_check_status text DEFAULT 'pending'::text CHECK (plagiarism_check_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'failed'::text, 'not_required'::text])),
  plagiarism_checked_at timestamp with time zone,
  rubric_scores jsonb DEFAULT '{}'::jsonb,
  late_penalty numeric DEFAULT 0,
  auto_graded boolean DEFAULT false,
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id),
  CONSTRAINT submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.teacher_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  email text NOT NULL,
  teacher_name text NOT NULL,
  invite_token text NOT NULL UNIQUE,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text])),
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_invites_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_invites_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.teacher_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type text NOT NULL CHECK (plan_type = ANY (ARRAY['free'::text, 'basic'::text, 'pro'::text, 'enterprise'::text])),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text, 'trial'::text])),
  max_classes integer NOT NULL DEFAULT 3,
  max_students_per_class integer NOT NULL DEFAULT 30,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT teacher_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_achievements (
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  progress jsonb,
  completed_at timestamp with time zone,
  CONSTRAINT user_achievements_pkey PRIMARY KEY (user_id, achievement_id),
  CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements_catalog(id)
);
CREATE TABLE public.user_badges (
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_badges_pkey PRIMARY KEY (user_id, badge_id),
  CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges_catalog(id)
);
CREATE TABLE public.user_missions (
  user_id uuid NOT NULL,
  mission_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'expired'::text])),
  progress jsonb,
  reset_at timestamp with time zone,
  CONSTRAINT user_missions_pkey PRIMARY KEY (user_id, mission_id),
  CONSTRAINT user_missions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_missions_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions_catalog(id)
);
CREATE TABLE public.xp_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  xp integer NOT NULL CHECK (xp <> 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT xp_log_pkey PRIMARY KEY (id),
  CONSTRAINT xp_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);