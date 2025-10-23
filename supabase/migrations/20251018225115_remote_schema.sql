create extension if not exists "vector" with schema "public" version '0.8.0';

create type "public"."mission_type" as enum ('daily', 'weekly');

create type "public"."period_type" as enum ('weekly', 'monthly');

create type "public"."quiz_question_type" as enum ('mcq', 'truefalse', 'open');

create type "public"."school_admin_role" as enum ('owner', 'admin');

create type "public"."school_teacher_status" as enum ('active', 'pending', 'removed');

create table "public"."achievements_catalog" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "name" text not null,
    "rules" jsonb not null,
    "reward_xp" integer not null default 0
);


alter table "public"."achievements_catalog" enable row level security;

create table "public"."activities" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "content" jsonb default '{}'::jsonb,
    "type" text not null default 'assignment'::text,
    "max_grade" numeric(5,2) default 100.00,
    "due_date" timestamp with time zone,
    "created_by" uuid not null,
    "is_published" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "teacher_id" uuid,
    "status" text default 'draft'::text,
    "is_draft" boolean default true,
    "max_score" numeric(5,2) default 100.00,
    "instructions" text,
    "plagiarism_enabled" boolean default false,
    "is_group_activity" boolean default false,
    "group_size" integer default 1,
    "plagiarism_threshold" smallint default 35,
    "weight" numeric(5,2) default 1.0
);


alter table "public"."activities" enable row level security;

create table "public"."activity_class_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "activity_id" uuid not null,
    "class_id" uuid not null,
    "assigned_at" timestamp with time zone not null default now()
);


alter table "public"."activity_class_assignments" enable row level security;

create table "public"."answers" (
    "id" uuid not null default gen_random_uuid(),
    "submission_id" uuid not null,
    "question_id" text not null,
    "answer_json" jsonb,
    "points_earned" numeric(5,2),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."answers" enable row level security;

create table "public"."application_logs" (
    "id" uuid not null default gen_random_uuid(),
    "timestamp" timestamp with time zone not null default now(),
    "level" integer not null default 3,
    "level_name" text not null default 'INFO'::text,
    "message" text not null,
    "data" jsonb default '{}'::jsonb,
    "user_id" uuid,
    "user_email" text,
    "session_id" text,
    "user_agent" text,
    "url" text,
    "environment" text default 'production'::text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."application_logs" enable row level security;

create table "public"."badges" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "icon" text,
    "type" text,
    "requirement_type" text,
    "requirement_value" integer,
    "color" text default '#8b5cf6'::text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."badges" enable row level security;

create table "public"."badges_catalog" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "name" text not null,
    "icon_url" text,
    "criteria" jsonb
);


alter table "public"."badges_catalog" enable row level security;

create table "public"."calendar_events" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "start_time" timestamp with time zone not null,
    "end_time" timestamp with time zone not null,
    "event_type" text not null default 'meeting'::text,
    "class_id" uuid,
    "activity_id" uuid,
    "created_by" uuid not null,
    "attendees" uuid[] default '{}'::uuid[],
    "location" text,
    "is_recurring" boolean default false,
    "recurrence_pattern" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "type" text default 'event'::text,
    "teacher_id" uuid,
    "participants" jsonb default '[]'::jsonb
);


alter table "public"."calendar_events" enable row level security;

create table "public"."class_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "class_id" uuid not null,
    "invitee_email" text not null,
    "invitee_id" uuid,
    "inviter_id" uuid not null,
    "status" text not null,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "accepted_at" timestamp with time zone,
    "declined_at" timestamp with time zone,
    "metadata" jsonb default '{}'::jsonb
);


alter table "public"."class_invitations" enable row level security;

create table "public"."class_materials" (
    "id" uuid not null default gen_random_uuid(),
    "class_id" uuid not null,
    "title" text not null,
    "description" text,
    "file_url" text,
    "file_type" text,
    "file_size" bigint,
    "uploaded_by" uuid not null,
    "is_public" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "category" text,
    "tags" text[],
    "created_by" uuid not null
);


alter table "public"."class_materials" enable row level security;

create table "public"."class_member_history" (
    "id" uuid not null default gen_random_uuid(),
    "class_id" uuid not null,
    "user_id" uuid not null,
    "action" text not null,
    "role" text not null,
    "performed_by" uuid not null,
    "reason" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."class_member_history" enable row level security;

create table "public"."class_members" (
    "id" uuid not null default gen_random_uuid(),
    "class_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null default 'student'::text,
    "nickname" text,
    "joined_at" timestamp with time zone not null default now()
);


alter table "public"."class_members" enable row level security;

create table "public"."class_rank_snapshots" (
    "id" uuid not null default gen_random_uuid(),
    "class_id" uuid not null,
    "period" period_type not null,
    "period_start_date" date not null,
    "period_end_date" date not null,
    "rank_data" jsonb not null,
    "generated_at" timestamp with time zone not null default now()
);


alter table "public"."class_rank_snapshots" enable row level security;

create table "public"."class_students" (
    "id" uuid not null default gen_random_uuid(),
    "class_id" uuid not null,
    "student_id" uuid not null,
    "joined_at" timestamp with time zone default now(),
    "status" character varying(20) default 'active'::character varying
);


alter table "public"."class_students" enable row level security;

create table "public"."classes" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "subject" text,
    "description" text,
    "color" text default '#3B82F6'::text,
    "room_number" text,
    "student_capacity" integer default 30,
    "created_by" uuid not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "professor_id" uuid,
    "school_id" uuid,
    "invite_code" character varying(12),
    "banner_color" character varying(50) default 'from-blue-500 to-purple-500'::character varying
);


alter table "public"."classes" enable row level security;

create table "public"."discussion_messages" (
    "id" uuid not null default gen_random_uuid(),
    "discussion_id" uuid not null,
    "parent_message_id" uuid,
    "user_id" uuid not null,
    "content" text not null,
    "is_deleted" boolean default false,
    "deleted_by" uuid,
    "deleted_at" timestamp with time zone,
    "is_edited" boolean default false,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone default now()
);


alter table "public"."discussion_messages" enable row level security;

create table "public"."discussions" (
    "id" uuid not null default gen_random_uuid(),
    "class_id" uuid not null,
    "activity_id" uuid,
    "title" text not null,
    "description" text,
    "created_by" uuid not null,
    "is_pinned" boolean default false,
    "is_locked" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."discussions" enable row level security;

create table "public"."event_participants" (
    "event_id" uuid not null,
    "user_id" uuid not null,
    "score" numeric,
    "rank" integer,
    "joined_at" timestamp with time zone not null default now()
);


alter table "public"."event_participants" enable row level security;

create table "public"."events_competitions" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "rules" jsonb,
    "starts_at" timestamp with time zone not null,
    "ends_at" timestamp with time zone not null,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."events_competitions" enable row level security;

create table "public"."focus_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "started_at" timestamp with time zone not null,
    "ended_at" timestamp with time zone,
    "duration_min" integer,
    "technique" text,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."focus_sessions" enable row level security;

create table "public"."gamification_profiles" (
    "user_id" uuid not null,
    "xp_total" integer not null default 0,
    "level" integer not null default 1,
    "current_streak" integer not null default 0,
    "longest_streak" integer not null default 0,
    "last_activity_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."gamification_profiles" enable row level security;

create table "public"."material_class_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "material_id" uuid not null,
    "class_id" uuid not null,
    "assigned_at" timestamp with time zone default now()
);


alter table "public"."material_class_assignments" enable row level security;

create table "public"."meetings" (
    "id" uuid not null default gen_random_uuid(),
    "class_id" uuid not null,
    "title" text not null,
    "description" text,
    "meeting_url" text,
    "start_time" timestamp with time zone not null,
    "end_time" timestamp with time zone,
    "is_recurring" boolean default false,
    "recurrence_pattern" jsonb,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "external_meeting_url" text,
    "meeting_type" text default 'external'::text
);


alter table "public"."meetings" enable row level security;

create table "public"."missions_catalog" (
    "id" uuid not null default gen_random_uuid(),
    "type" mission_type not null,
    "code" text not null,
    "name" text not null,
    "rules" jsonb not null,
    "reward_xp" integer not null default 0
);


alter table "public"."missions_catalog" enable row level security;

create table "public"."notification_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "template" text not null,
    "sent_at" timestamp with time zone not null default now(),
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."notification_logs" enable row level security;

create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "message" text not null,
    "type" text not null default 'info'::text,
    "is_read" boolean default false,
    "action_url" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "data" jsonb default '{}'::jsonb,
    "updated_at" timestamp with time zone default now(),
    "read_at" timestamp with time zone,
    "read" boolean default false
);


alter table "public"."notifications" enable row level security;

create table "public"."plagiarism_checks" (
    "id" uuid not null default gen_random_uuid(),
    "submission_id" uuid not null,
    "plagiarism_percentage" integer not null,
    "ai_generated" boolean default false,
    "ai_score" integer default 0,
    "sources" jsonb default '[]'::jsonb,
    "raw_data" jsonb default '{}'::jsonb,
    "checked_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
);


alter table "public"."plagiarism_checks" enable row level security;

create table "public"."plagiarism_checks_v2" (
    "id" uuid not null default gen_random_uuid(),
    "submission_id" uuid not null,
    "activity_id" uuid not null,
    "student_id" uuid not null,
    "similarity_percentage" numeric(5,2) not null default 0.00,
    "plagiarism_severity" text not null default 'none'::text,
    "sources" jsonb default '[]'::jsonb,
    "report_url" text,
    "checked_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."plagiarism_checks_v2" enable row level security;

create table "public"."plagiarism_logs" (
    "id" uuid not null default gen_random_uuid(),
    "submission_id" uuid,
    "error_message" text,
    "error_stack" text,
    "request_data" jsonb,
    "timestamp" timestamp with time zone default now()
);


alter table "public"."plagiarism_logs" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "email" text not null,
    "full_name" text,
    "avatar_url" text,
    "role" text not null default 'student'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "cpf" text,
    "age" integer,
    "email_confirmed" boolean default false,
    "is_active" boolean default true
);


alter table "public"."profiles" enable row level security;

create table "public"."quiz_assignments" (
    "quiz_id" uuid not null,
    "class_id" uuid not null,
    "assigned_by" uuid not null,
    "assigned_at" timestamp with time zone not null default now()
);


alter table "public"."quiz_assignments" enable row level security;

create table "public"."quiz_attempts" (
    "id" uuid not null default gen_random_uuid(),
    "quiz_id" uuid not null,
    "user_id" uuid not null,
    "answers" jsonb,
    "score" numeric,
    "started_at" timestamp with time zone not null default now(),
    "completed_at" timestamp with time zone
);


alter table "public"."quiz_attempts" enable row level security;

create table "public"."quiz_questions" (
    "id" uuid not null default gen_random_uuid(),
    "quiz_id" uuid not null,
    "type" quiz_question_type not null,
    "prompt" text not null,
    "options" jsonb,
    "answer" jsonb,
    "explanation" text,
    "position" integer
);


alter table "public"."quiz_questions" enable row level security;

create table "public"."quizzes" (
    "id" uuid not null default gen_random_uuid(),
    "owner_user_id" uuid not null,
    "title" text not null,
    "source_type" text not null,
    "source_meta" jsonb,
    "meta" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "is_public" boolean not null default false
);


alter table "public"."quizzes" enable row level security;

create table "public"."rag_training_sources" (
    "id" uuid not null default gen_random_uuid(),
    "class_id" uuid not null,
    "material_id" uuid,
    "file_url" text not null,
    "file_name" text not null,
    "file_type" text,
    "is_active" boolean default true,
    "content_extracted" text,
    "embedding_status" text default 'pending'::text,
    "vector_ids" jsonb,
    "added_by" uuid not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "activity_id" uuid
);


alter table "public"."rag_training_sources" enable row level security;

create table "public"."rag_vectors" (
    "id" uuid not null default gen_random_uuid(),
    "source_id" uuid not null,
    "content_chunk" text not null,
    "embedding" vector(1536),
    "chunk_index" integer not null default 0,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."rag_vectors" enable row level security;

create table "public"."reward_settings" (
    "id" uuid not null default gen_random_uuid(),
    "created_by" uuid not null,
    "scope" text,
    "scope_id" uuid,
    "reward_type" text,
    "reward_name" text not null,
    "reward_description" text,
    "reward_value" numeric,
    "reward_xp" integer,
    "is_active" boolean default true,
    "conditions" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."reward_settings" enable row level security;

create table "public"."school_admins" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "school_id" uuid not null,
    "role" text not null default 'admin'::text,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."school_admins" enable row level security;

create table "public"."school_announcements" (
    "id" uuid not null default gen_random_uuid(),
    "school_id" uuid not null,
    "title" text not null,
    "body" text not null,
    "audience" jsonb,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "publish_at" timestamp with time zone
);


alter table "public"."school_announcements" enable row level security;

create table "public"."school_classes" (
    "id" uuid not null default gen_random_uuid(),
    "school_id" uuid not null,
    "class_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."school_classes" enable row level security;

create table "public"."school_teachers" (
    "id" uuid not null default gen_random_uuid(),
    "school_id" uuid not null,
    "user_id" uuid not null,
    "status" text not null default 'active'::text,
    "joined_at" timestamp with time zone not null default now(),
    "started_at" timestamp with time zone default now(),
    "ended_at" timestamp with time zone,
    "monthly_cost" numeric(10,2)
);


alter table "public"."school_teachers" enable row level security;

create table "public"."schools" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "logo_url" text,
    "settings" jsonb default '{}'::jsonb,
    "owner_id" uuid,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "status" text default 'active'::text,
    "activated_at" timestamp with time zone,
    "suspended_at" timestamp with time zone,
    "suspension_reason" text
);


alter table "public"."schools" enable row level security;

create table "public"."student_alerts" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "student_id" uuid not null,
    "class_id" uuid not null,
    "alert_type" text not null,
    "severity" text not null,
    "details" jsonb,
    "resolved" boolean default false,
    "resolved_at" timestamp with time zone,
    "resolved_by" uuid,
    "created_at" timestamp with time zone default now()
);


alter table "public"."student_alerts" enable row level security;

create table "public"."submissions" (
    "id" uuid not null default gen_random_uuid(),
    "activity_id" uuid not null,
    "student_id" uuid not null,
    "content" jsonb default '{}'::jsonb,
    "grade" numeric(5,2),
    "feedback" text,
    "status" text not null default 'draft'::text,
    "submitted_at" timestamp with time zone,
    "graded_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "plagiarism_check_status" text default 'pending'::text,
    "plagiarism_checked_at" timestamp with time zone
);


alter table "public"."submissions" enable row level security;

create table "public"."teacher_invites" (
    "id" uuid not null default gen_random_uuid(),
    "school_id" uuid not null,
    "email" text not null,
    "teacher_name" text not null,
    "invite_token" text not null,
    "status" text default 'pending'::text,
    "expires_at" timestamp with time zone not null,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."teacher_invites" enable row level security;

create table "public"."teacher_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "plan_type" text not null,
    "status" text not null default 'active'::text,
    "max_classes" integer not null default 3,
    "max_students_per_class" integer not null default 30,
    "started_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "metadata" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."teacher_subscriptions" enable row level security;

create table "public"."user_achievements" (
    "user_id" uuid not null,
    "achievement_id" uuid not null,
    "progress" jsonb,
    "completed_at" timestamp with time zone
);


alter table "public"."user_achievements" enable row level security;

create table "public"."user_badges" (
    "user_id" uuid not null,
    "badge_id" uuid not null,
    "granted_at" timestamp with time zone not null default now()
);


alter table "public"."user_badges" enable row level security;

create table "public"."user_missions" (
    "user_id" uuid not null,
    "mission_id" uuid not null,
    "status" text not null default 'active'::text,
    "progress" jsonb,
    "reset_at" timestamp with time zone
);


alter table "public"."user_missions" enable row level security;

create table "public"."xp_log" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "source" text not null,
    "xp" integer not null,
    "meta" jsonb,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."xp_log" enable row level security;

CREATE UNIQUE INDEX achievements_catalog_code_key ON public.achievements_catalog USING btree (code);

CREATE UNIQUE INDEX achievements_catalog_pkey ON public.achievements_catalog USING btree (id);

CREATE UNIQUE INDEX activities_pkey ON public.activities USING btree (id);

CREATE UNIQUE INDEX activity_class_assignments_activity_id_class_id_key ON public.activity_class_assignments USING btree (activity_id, class_id);

CREATE UNIQUE INDEX activity_class_assignments_pkey ON public.activity_class_assignments USING btree (id);

CREATE UNIQUE INDEX answers_pkey ON public.answers USING btree (id);

CREATE UNIQUE INDEX application_logs_pkey ON public.application_logs USING btree (id);

CREATE UNIQUE INDEX badges_catalog_code_key ON public.badges_catalog USING btree (code);

CREATE UNIQUE INDEX badges_catalog_pkey ON public.badges_catalog USING btree (id);

CREATE UNIQUE INDEX badges_pkey ON public.badges USING btree (id);

CREATE UNIQUE INDEX calendar_events_pkey ON public.calendar_events USING btree (id);

CREATE UNIQUE INDEX class_invitations_pkey ON public.class_invitations USING btree (id);

CREATE UNIQUE INDEX class_materials_pkey ON public.class_materials USING btree (id);

CREATE UNIQUE INDEX class_member_history_pkey ON public.class_member_history USING btree (id);

CREATE UNIQUE INDEX class_members_class_id_user_id_key ON public.class_members USING btree (class_id, user_id);

CREATE UNIQUE INDEX class_members_pkey ON public.class_members USING btree (id);

CREATE UNIQUE INDEX class_rank_snapshots_pkey ON public.class_rank_snapshots USING btree (id);

CREATE UNIQUE INDEX class_students_class_id_student_id_key ON public.class_students USING btree (class_id, student_id);

CREATE UNIQUE INDEX class_students_pkey ON public.class_students USING btree (id);

CREATE UNIQUE INDEX classes_invite_code_key ON public.classes USING btree (invite_code);

CREATE UNIQUE INDEX classes_pkey ON public.classes USING btree (id);

CREATE UNIQUE INDEX discussion_messages_pkey ON public.discussion_messages USING btree (id);

CREATE UNIQUE INDEX discussions_pkey ON public.discussions USING btree (id);

CREATE UNIQUE INDEX event_participants_pkey ON public.event_participants USING btree (event_id, user_id);

CREATE UNIQUE INDEX events_competitions_pkey ON public.events_competitions USING btree (id);

CREATE UNIQUE INDEX focus_sessions_pkey ON public.focus_sessions USING btree (id);

CREATE UNIQUE INDEX gamification_profiles_pkey ON public.gamification_profiles USING btree (user_id);

CREATE INDEX idx_achievements_catalog_code ON public.achievements_catalog USING btree (code);

CREATE INDEX idx_activities_created_by ON public.activities USING btree (created_by);

CREATE INDEX idx_activities_is_published ON public.activities USING btree (is_published) WHERE (is_published = true);

CREATE INDEX idx_activities_weight ON public.activities USING btree (weight);

CREATE INDEX idx_application_logs_level ON public.application_logs USING btree (level);

CREATE INDEX idx_application_logs_timestamp ON public.application_logs USING btree ("timestamp" DESC);

CREATE INDEX idx_application_logs_user_id ON public.application_logs USING btree (user_id) WHERE (user_id IS NOT NULL);

CREATE INDEX idx_badges_catalog_code ON public.badges_catalog USING btree (code);

CREATE INDEX idx_calendar_events_class_id ON public.calendar_events USING btree (class_id);

CREATE INDEX idx_calendar_events_created_by ON public.calendar_events USING btree (created_by);

CREATE INDEX idx_calendar_events_participants_gin ON public.calendar_events USING gin (participants);

CREATE INDEX idx_calendar_events_start_time ON public.calendar_events USING btree (start_time);

CREATE INDEX idx_calendar_events_teacher_id ON public.calendar_events USING btree (teacher_id);

CREATE INDEX idx_calendar_events_type ON public.calendar_events USING btree (event_type);

CREATE INDEX idx_class_invitations_class_id ON public.class_invitations USING btree (class_id);

CREATE INDEX idx_class_invitations_expires_at ON public.class_invitations USING btree (expires_at);

CREATE INDEX idx_class_invitations_invitee_email ON public.class_invitations USING btree (invitee_email);

CREATE INDEX idx_class_invitations_invitee_id ON public.class_invitations USING btree (invitee_id);

CREATE INDEX idx_class_invitations_status ON public.class_invitations USING btree (status);

CREATE INDEX idx_class_materials_category ON public.class_materials USING btree (category);

CREATE INDEX idx_class_materials_class_id ON public.class_materials USING btree (class_id);

CREATE INDEX idx_class_materials_uploaded_by ON public.class_materials USING btree (uploaded_by);

CREATE INDEX idx_class_member_history_class_id ON public.class_member_history USING btree (class_id);

CREATE INDEX idx_class_member_history_created_at ON public.class_member_history USING btree (created_at DESC);

CREATE INDEX idx_class_member_history_user_id ON public.class_member_history USING btree (user_id);

CREATE INDEX idx_class_members_class_id ON public.class_members USING btree (class_id);

CREATE INDEX idx_class_members_user_id ON public.class_members USING btree (user_id);

CREATE INDEX idx_class_students_class ON public.class_students USING btree (class_id);

CREATE INDEX idx_class_students_student ON public.class_students USING btree (student_id);

CREATE INDEX idx_classes_created_by ON public.classes USING btree (created_by);

CREATE INDEX idx_classes_invite_code ON public.classes USING btree (invite_code);

CREATE INDEX idx_classes_is_active ON public.classes USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_classes_professor_id ON public.classes USING btree (professor_id);

CREATE INDEX idx_focus_sessions_user_started ON public.focus_sessions USING btree (user_id, started_at DESC);

CREATE INDEX idx_gamification_profiles_level ON public.gamification_profiles USING btree (level DESC, xp_total DESC);

CREATE INDEX idx_missions_catalog_type_code ON public.missions_catalog USING btree (type, code);

CREATE INDEX idx_notification_logs_metadata_reminder_key ON public.notification_logs USING gin (((metadata -> 'reminder_key'::text)));

CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs USING btree (sent_at);

CREATE INDEX idx_notification_logs_template ON public.notification_logs USING btree (template);

CREATE INDEX idx_notification_logs_user_id ON public.notification_logs USING btree (user_id);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, read);

CREATE INDEX idx_plagiarism_ai_score ON public.plagiarism_checks USING btree (ai_score);

CREATE INDEX idx_plagiarism_checked_at ON public.plagiarism_checks USING btree (checked_at DESC);

CREATE INDEX idx_plagiarism_checks_v2_activity ON public.plagiarism_checks_v2 USING btree (activity_id);

CREATE INDEX idx_plagiarism_checks_v2_severity ON public.plagiarism_checks_v2 USING btree (plagiarism_severity);

CREATE INDEX idx_plagiarism_checks_v2_student ON public.plagiarism_checks_v2 USING btree (student_id);

CREATE INDEX idx_plagiarism_checks_v2_submission ON public.plagiarism_checks_v2 USING btree (submission_id);

CREATE UNIQUE INDEX idx_plagiarism_latest ON public.plagiarism_checks USING btree (submission_id, checked_at DESC NULLS LAST);

CREATE INDEX idx_plagiarism_logs_submission ON public.plagiarism_logs USING btree (submission_id);

CREATE INDEX idx_plagiarism_logs_timestamp ON public.plagiarism_logs USING btree ("timestamp" DESC);

CREATE INDEX idx_plagiarism_percentage ON public.plagiarism_checks USING btree (plagiarism_percentage);

CREATE INDEX idx_plagiarism_submission_id ON public.plagiarism_checks USING btree (submission_id);

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);

CREATE INDEX idx_profiles_role_active ON public.profiles USING btree (role, is_active) WHERE (is_active = true);

CREATE INDEX idx_quiz_assignments_class ON public.quiz_assignments USING btree (class_id);

CREATE INDEX idx_quiz_attempts_quiz ON public.quiz_attempts USING btree (quiz_id);

CREATE INDEX idx_quiz_attempts_quiz_user ON public.quiz_attempts USING btree (quiz_id, user_id);

CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts USING btree (user_id);

CREATE INDEX idx_quiz_questions_quiz ON public.quiz_questions USING btree (quiz_id, "position");

CREATE INDEX idx_quizzes_created_by ON public.quizzes USING btree (created_by);

CREATE INDEX idx_quizzes_owner ON public.quizzes USING btree (owner_user_id, created_at DESC);

CREATE INDEX idx_quizzes_public ON public.quizzes USING btree (is_public);

CREATE INDEX idx_rag_training_sources_activity_id ON public.rag_training_sources USING btree (activity_id) WHERE (activity_id IS NOT NULL);

CREATE INDEX idx_rag_training_sources_class_activity ON public.rag_training_sources USING btree (class_id, activity_id) WHERE (activity_id IS NOT NULL);

CREATE INDEX idx_rag_training_sources_class_material ON public.rag_training_sources USING btree (class_id, material_id) WHERE (material_id IS NOT NULL);

CREATE INDEX idx_rag_vectors_embedding ON public.rag_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

CREATE INDEX idx_rag_vectors_source_id ON public.rag_vectors USING btree (source_id);

CREATE INDEX idx_rank_snapshots_class_period ON public.class_rank_snapshots USING btree (class_id, period, period_start_date DESC);

CREATE INDEX idx_reward_settings_created_by ON public.reward_settings USING btree (created_by);

CREATE INDEX idx_reward_settings_scope ON public.reward_settings USING btree (scope, scope_id);

CREATE INDEX idx_school_admins_school_id ON public.school_admins USING btree (school_id);

CREATE INDEX idx_school_admins_user ON public.school_admins USING btree (user_id);

CREATE INDEX idx_school_admins_user_id ON public.school_admins USING btree (user_id);

CREATE INDEX idx_school_announcements_publish_at ON public.school_announcements USING btree (publish_at) WHERE (publish_at IS NOT NULL);

CREATE INDEX idx_school_classes_class ON public.school_classes USING btree (class_id);

CREATE INDEX idx_school_teachers_user ON public.school_teachers USING btree (user_id);

CREATE INDEX idx_schools_status ON public.schools USING btree (status);

CREATE INDEX idx_student_alerts_class ON public.student_alerts USING btree (class_id);

CREATE INDEX idx_student_alerts_resolved ON public.student_alerts USING btree (resolved) WHERE (NOT resolved);

CREATE INDEX idx_student_alerts_student ON public.student_alerts USING btree (student_id);

CREATE INDEX idx_submissions_activity_id ON public.submissions USING btree (activity_id);

CREATE INDEX idx_submissions_pending_plagiarism ON public.submissions USING btree (activity_id, plagiarism_check_status) WHERE (plagiarism_check_status = ANY (ARRAY['pending'::text, 'in_progress'::text]));

CREATE INDEX idx_submissions_plagiarism_status ON public.submissions USING btree (plagiarism_check_status);

CREATE INDEX idx_submissions_student_id ON public.submissions USING btree (student_id);

CREATE INDEX idx_teacher_invites_email ON public.teacher_invites USING btree (email);

CREATE INDEX idx_teacher_invites_school_id ON public.teacher_invites USING btree (school_id);

CREATE INDEX idx_teacher_invites_status ON public.teacher_invites USING btree (status);

CREATE INDEX idx_teacher_invites_token ON public.teacher_invites USING btree (invite_token);

CREATE INDEX idx_teacher_subscriptions_status ON public.teacher_subscriptions USING btree (status);

CREATE INDEX idx_teacher_subscriptions_user ON public.teacher_subscriptions USING btree (user_id);

CREATE INDEX idx_user_achievements_user ON public.user_achievements USING btree (user_id);

CREATE INDEX idx_user_badges_badge_id ON public.user_badges USING btree (badge_id);

CREATE INDEX idx_user_badges_user ON public.user_badges USING btree (user_id);

CREATE INDEX idx_user_badges_user_id ON public.user_badges USING btree (user_id);

CREATE INDEX idx_user_missions_reset ON public.user_missions USING btree (reset_at) WHERE ((status = 'active'::text) AND (reset_at IS NOT NULL));

CREATE INDEX idx_user_missions_status ON public.user_missions USING btree (user_id, status) WHERE (status = 'active'::text);

CREATE INDEX idx_user_missions_user ON public.user_missions USING btree (user_id);

CREATE INDEX idx_xp_log_user_created ON public.xp_log USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX material_class_assignments_material_id_class_id_key ON public.material_class_assignments USING btree (material_id, class_id);

CREATE UNIQUE INDEX material_class_assignments_pkey ON public.material_class_assignments USING btree (id);

CREATE UNIQUE INDEX meetings_pkey ON public.meetings USING btree (id);

CREATE UNIQUE INDEX missions_catalog_code_key ON public.missions_catalog USING btree (code);

CREATE UNIQUE INDEX missions_catalog_pkey ON public.missions_catalog USING btree (id);

CREATE UNIQUE INDEX notification_logs_pkey ON public.notification_logs USING btree (id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX plagiarism_checks_pkey ON public.plagiarism_checks USING btree (id);

CREATE UNIQUE INDEX plagiarism_checks_v2_pkey ON public.plagiarism_checks_v2 USING btree (id);

CREATE UNIQUE INDEX plagiarism_logs_pkey ON public.plagiarism_logs USING btree (id);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_email_unique ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX quiz_assignments_pkey ON public.quiz_assignments USING btree (quiz_id, class_id);

CREATE UNIQUE INDEX quiz_attempts_pkey ON public.quiz_attempts USING btree (id);

CREATE UNIQUE INDEX quiz_attempts_quiz_id_user_id_started_at_key ON public.quiz_attempts USING btree (quiz_id, user_id, started_at);

CREATE UNIQUE INDEX quiz_questions_pkey ON public.quiz_questions USING btree (id);

CREATE UNIQUE INDEX quizzes_pkey ON public.quizzes USING btree (id);

CREATE UNIQUE INDEX rag_training_sources_pkey ON public.rag_training_sources USING btree (id);

CREATE UNIQUE INDEX rag_vectors_pkey ON public.rag_vectors USING btree (id);

CREATE UNIQUE INDEX reward_settings_pkey ON public.reward_settings USING btree (id);

CREATE UNIQUE INDEX school_admins_pkey ON public.school_admins USING btree (id);

CREATE UNIQUE INDEX school_admins_user_id_school_id_key ON public.school_admins USING btree (user_id, school_id);

CREATE UNIQUE INDEX school_announcements_pkey ON public.school_announcements USING btree (id);

CREATE UNIQUE INDEX school_classes_class_unique ON public.school_classes USING btree (class_id);

CREATE UNIQUE INDEX school_classes_pkey ON public.school_classes USING btree (id);

CREATE UNIQUE INDEX school_classes_school_id_class_id_key ON public.school_classes USING btree (school_id, class_id);

CREATE UNIQUE INDEX school_teachers_pkey ON public.school_teachers USING btree (id);

CREATE UNIQUE INDEX school_teachers_school_id_user_id_key ON public.school_teachers USING btree (school_id, user_id);

CREATE UNIQUE INDEX school_teachers_unique_link ON public.school_teachers USING btree (school_id, user_id);

CREATE UNIQUE INDEX schools_pkey ON public.schools USING btree (id);

CREATE UNIQUE INDEX student_alerts_pkey ON public.student_alerts USING btree (id);

CREATE UNIQUE INDEX submissions_activity_id_student_id_key ON public.submissions USING btree (activity_id, student_id);

CREATE UNIQUE INDEX submissions_pkey ON public.submissions USING btree (id);

CREATE UNIQUE INDEX teacher_invites_invite_token_key ON public.teacher_invites USING btree (invite_token);

CREATE UNIQUE INDEX teacher_invites_pkey ON public.teacher_invites USING btree (id);

CREATE UNIQUE INDEX teacher_subscriptions_pkey ON public.teacher_subscriptions USING btree (id);

CREATE UNIQUE INDEX unique_pending_invitation ON public.class_invitations USING btree (class_id, invitee_email, status);

CREATE UNIQUE INDEX user_achievements_pkey ON public.user_achievements USING btree (user_id, achievement_id);

CREATE UNIQUE INDEX user_badges_pkey ON public.user_badges USING btree (user_id, badge_id);

CREATE UNIQUE INDEX user_missions_pkey ON public.user_missions USING btree (user_id, mission_id);

CREATE UNIQUE INDEX xp_log_pkey ON public.xp_log USING btree (id);

alter table "public"."achievements_catalog" add constraint "achievements_catalog_pkey" PRIMARY KEY using index "achievements_catalog_pkey";

alter table "public"."activities" add constraint "activities_pkey" PRIMARY KEY using index "activities_pkey";

alter table "public"."activity_class_assignments" add constraint "activity_class_assignments_pkey" PRIMARY KEY using index "activity_class_assignments_pkey";

alter table "public"."answers" add constraint "answers_pkey" PRIMARY KEY using index "answers_pkey";

alter table "public"."application_logs" add constraint "application_logs_pkey" PRIMARY KEY using index "application_logs_pkey";

alter table "public"."badges" add constraint "badges_pkey" PRIMARY KEY using index "badges_pkey";

alter table "public"."badges_catalog" add constraint "badges_catalog_pkey" PRIMARY KEY using index "badges_catalog_pkey";

alter table "public"."calendar_events" add constraint "calendar_events_pkey" PRIMARY KEY using index "calendar_events_pkey";

alter table "public"."class_invitations" add constraint "class_invitations_pkey" PRIMARY KEY using index "class_invitations_pkey";

alter table "public"."class_materials" add constraint "class_materials_pkey" PRIMARY KEY using index "class_materials_pkey";

alter table "public"."class_member_history" add constraint "class_member_history_pkey" PRIMARY KEY using index "class_member_history_pkey";

alter table "public"."class_members" add constraint "class_members_pkey" PRIMARY KEY using index "class_members_pkey";

alter table "public"."class_rank_snapshots" add constraint "class_rank_snapshots_pkey" PRIMARY KEY using index "class_rank_snapshots_pkey";

alter table "public"."class_students" add constraint "class_students_pkey" PRIMARY KEY using index "class_students_pkey";

alter table "public"."classes" add constraint "classes_pkey" PRIMARY KEY using index "classes_pkey";

alter table "public"."discussion_messages" add constraint "discussion_messages_pkey" PRIMARY KEY using index "discussion_messages_pkey";

alter table "public"."discussions" add constraint "discussions_pkey" PRIMARY KEY using index "discussions_pkey";

alter table "public"."event_participants" add constraint "event_participants_pkey" PRIMARY KEY using index "event_participants_pkey";

alter table "public"."events_competitions" add constraint "events_competitions_pkey" PRIMARY KEY using index "events_competitions_pkey";

alter table "public"."focus_sessions" add constraint "focus_sessions_pkey" PRIMARY KEY using index "focus_sessions_pkey";

alter table "public"."gamification_profiles" add constraint "gamification_profiles_pkey" PRIMARY KEY using index "gamification_profiles_pkey";

alter table "public"."material_class_assignments" add constraint "material_class_assignments_pkey" PRIMARY KEY using index "material_class_assignments_pkey";

alter table "public"."meetings" add constraint "meetings_pkey" PRIMARY KEY using index "meetings_pkey";

alter table "public"."missions_catalog" add constraint "missions_catalog_pkey" PRIMARY KEY using index "missions_catalog_pkey";

alter table "public"."notification_logs" add constraint "notification_logs_pkey" PRIMARY KEY using index "notification_logs_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."plagiarism_checks" add constraint "plagiarism_checks_pkey" PRIMARY KEY using index "plagiarism_checks_pkey";

alter table "public"."plagiarism_checks_v2" add constraint "plagiarism_checks_v2_pkey" PRIMARY KEY using index "plagiarism_checks_v2_pkey";

alter table "public"."plagiarism_logs" add constraint "plagiarism_logs_pkey" PRIMARY KEY using index "plagiarism_logs_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."quiz_assignments" add constraint "quiz_assignments_pkey" PRIMARY KEY using index "quiz_assignments_pkey";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_pkey" PRIMARY KEY using index "quiz_attempts_pkey";

alter table "public"."quiz_questions" add constraint "quiz_questions_pkey" PRIMARY KEY using index "quiz_questions_pkey";

alter table "public"."quizzes" add constraint "quizzes_pkey" PRIMARY KEY using index "quizzes_pkey";

alter table "public"."rag_training_sources" add constraint "rag_training_sources_pkey" PRIMARY KEY using index "rag_training_sources_pkey";

alter table "public"."rag_vectors" add constraint "rag_vectors_pkey" PRIMARY KEY using index "rag_vectors_pkey";

alter table "public"."reward_settings" add constraint "reward_settings_pkey" PRIMARY KEY using index "reward_settings_pkey";

alter table "public"."school_admins" add constraint "school_admins_pkey" PRIMARY KEY using index "school_admins_pkey";

alter table "public"."school_announcements" add constraint "school_announcements_pkey" PRIMARY KEY using index "school_announcements_pkey";

alter table "public"."school_classes" add constraint "school_classes_pkey" PRIMARY KEY using index "school_classes_pkey";

alter table "public"."school_teachers" add constraint "school_teachers_pkey" PRIMARY KEY using index "school_teachers_pkey";

alter table "public"."schools" add constraint "schools_pkey" PRIMARY KEY using index "schools_pkey";

alter table "public"."student_alerts" add constraint "student_alerts_pkey" PRIMARY KEY using index "student_alerts_pkey";

alter table "public"."submissions" add constraint "submissions_pkey" PRIMARY KEY using index "submissions_pkey";

alter table "public"."teacher_invites" add constraint "teacher_invites_pkey" PRIMARY KEY using index "teacher_invites_pkey";

alter table "public"."teacher_subscriptions" add constraint "teacher_subscriptions_pkey" PRIMARY KEY using index "teacher_subscriptions_pkey";

alter table "public"."user_achievements" add constraint "user_achievements_pkey" PRIMARY KEY using index "user_achievements_pkey";

alter table "public"."user_badges" add constraint "user_badges_pkey" PRIMARY KEY using index "user_badges_pkey";

alter table "public"."user_missions" add constraint "user_missions_pkey" PRIMARY KEY using index "user_missions_pkey";

alter table "public"."xp_log" add constraint "xp_log_pkey" PRIMARY KEY using index "xp_log_pkey";

alter table "public"."achievements_catalog" add constraint "achievements_catalog_code_key" UNIQUE using index "achievements_catalog_code_key";

alter table "public"."activities" add constraint "activities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."activities" validate constraint "activities_created_by_fkey";

alter table "public"."activities" add constraint "activities_plagiarism_threshold_check" CHECK ((plagiarism_threshold = ANY (ARRAY[20, 35, 50]))) not valid;

alter table "public"."activities" validate constraint "activities_plagiarism_threshold_check";

alter table "public"."activities" add constraint "activities_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))) not valid;

alter table "public"."activities" validate constraint "activities_status_check";

alter table "public"."activities" add constraint "activities_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES profiles(id) not valid;

alter table "public"."activities" validate constraint "activities_teacher_id_fkey";

alter table "public"."activities" add constraint "activities_type_check" CHECK ((type = ANY (ARRAY['assignment'::text, 'quiz'::text, 'project'::text]))) not valid;

alter table "public"."activities" validate constraint "activities_type_check";

alter table "public"."activity_class_assignments" add constraint "activity_class_assignments_activity_id_class_id_key" UNIQUE using index "activity_class_assignments_activity_id_class_id_key";

alter table "public"."activity_class_assignments" add constraint "activity_class_assignments_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE not valid;

alter table "public"."activity_class_assignments" validate constraint "activity_class_assignments_activity_id_fkey";

alter table "public"."activity_class_assignments" add constraint "activity_class_assignments_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."activity_class_assignments" validate constraint "activity_class_assignments_class_id_fkey";

alter table "public"."answers" add constraint "answers_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE not valid;

alter table "public"."answers" validate constraint "answers_submission_id_fkey";

alter table "public"."application_logs" add constraint "application_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."application_logs" validate constraint "application_logs_user_id_fkey";

alter table "public"."badges" add constraint "badges_requirement_type_check" CHECK ((requirement_type = ANY (ARRAY['xp'::text, 'missions'::text, 'activities'::text, 'streak'::text, 'grade'::text, 'custom'::text]))) not valid;

alter table "public"."badges" validate constraint "badges_requirement_type_check";

alter table "public"."badges" add constraint "badges_type_check" CHECK ((type = ANY (ARRAY['level'::text, 'achievement'::text, 'special'::text, 'custom'::text]))) not valid;

alter table "public"."badges" validate constraint "badges_type_check";

alter table "public"."badges_catalog" add constraint "badges_catalog_code_key" UNIQUE using index "badges_catalog_code_key";

alter table "public"."calendar_events" add constraint "calendar_events_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_activity_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_class_id_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_created_by_fkey";

alter table "public"."calendar_events" add constraint "calendar_events_event_type_check" CHECK ((event_type = ANY (ARRAY['meeting'::text, 'class'::text, 'assignment'::text, 'exam'::text, 'other'::text]))) not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_event_type_check";

alter table "public"."calendar_events" add constraint "calendar_events_type_check" CHECK ((type = ANY (ARRAY['event'::text, 'meeting'::text, 'activity'::text, 'deadline'::text]))) not valid;

alter table "public"."calendar_events" validate constraint "calendar_events_type_check";

alter table "public"."class_invitations" add constraint "class_invitations_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."class_invitations" validate constraint "class_invitations_class_id_fkey";

alter table "public"."class_invitations" add constraint "class_invitations_invitee_id_fkey" FOREIGN KEY (invitee_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."class_invitations" validate constraint "class_invitations_invitee_id_fkey";

alter table "public"."class_invitations" add constraint "class_invitations_inviter_id_fkey" FOREIGN KEY (inviter_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."class_invitations" validate constraint "class_invitations_inviter_id_fkey";

alter table "public"."class_invitations" add constraint "class_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text]))) not valid;

alter table "public"."class_invitations" validate constraint "class_invitations_status_check";

alter table "public"."class_invitations" add constraint "unique_pending_invitation" UNIQUE using index "unique_pending_invitation";

alter table "public"."class_materials" add constraint "class_materials_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."class_materials" validate constraint "class_materials_class_id_fkey";

alter table "public"."class_materials" add constraint "class_materials_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."class_materials" validate constraint "class_materials_created_by_fkey";

alter table "public"."class_materials" add constraint "class_materials_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."class_materials" validate constraint "class_materials_uploaded_by_fkey";

alter table "public"."class_member_history" add constraint "class_member_history_action_check" CHECK ((action = ANY (ARRAY['added'::text, 'removed'::text, 'role_changed'::text]))) not valid;

alter table "public"."class_member_history" validate constraint "class_member_history_action_check";

alter table "public"."class_member_history" add constraint "class_member_history_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."class_member_history" validate constraint "class_member_history_class_id_fkey";

alter table "public"."class_member_history" add constraint "class_member_history_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES profiles(id) not valid;

alter table "public"."class_member_history" validate constraint "class_member_history_performed_by_fkey";

alter table "public"."class_member_history" add constraint "class_member_history_role_check" CHECK ((role = ANY (ARRAY['student'::text, 'teacher'::text]))) not valid;

alter table "public"."class_member_history" validate constraint "class_member_history_role_check";

alter table "public"."class_member_history" add constraint "class_member_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."class_member_history" validate constraint "class_member_history_user_id_fkey";

alter table "public"."class_members" add constraint "class_members_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."class_members" validate constraint "class_members_class_id_fkey";

alter table "public"."class_members" add constraint "class_members_class_id_user_id_key" UNIQUE using index "class_members_class_id_user_id_key";

alter table "public"."class_members" add constraint "class_members_role_check" CHECK ((role = ANY (ARRAY['student'::text, 'teacher'::text]))) not valid;

alter table "public"."class_members" validate constraint "class_members_role_check";

alter table "public"."class_members" add constraint "class_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."class_members" validate constraint "class_members_user_id_fkey";

alter table "public"."class_rank_snapshots" add constraint "class_rank_snapshots_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."class_rank_snapshots" validate constraint "class_rank_snapshots_class_id_fkey";

alter table "public"."class_students" add constraint "class_students_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."class_students" validate constraint "class_students_class_id_fkey";

alter table "public"."class_students" add constraint "class_students_class_id_student_id_key" UNIQUE using index "class_students_class_id_student_id_key";

alter table "public"."class_students" add constraint "class_students_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."class_students" validate constraint "class_students_student_id_fkey";

alter table "public"."classes" add constraint "classes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."classes" validate constraint "classes_created_by_fkey";

alter table "public"."classes" add constraint "classes_invite_code_key" UNIQUE using index "classes_invite_code_key";

alter table "public"."classes" add constraint "classes_professor_id_fkey" FOREIGN KEY (professor_id) REFERENCES profiles(id) not valid;

alter table "public"."classes" validate constraint "classes_professor_id_fkey";

alter table "public"."classes" add constraint "classes_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) not valid;

alter table "public"."classes" validate constraint "classes_school_id_fkey";

alter table "public"."discussion_messages" add constraint "discussion_messages_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES auth.users(id) not valid;

alter table "public"."discussion_messages" validate constraint "discussion_messages_deleted_by_fkey";

alter table "public"."discussion_messages" add constraint "discussion_messages_discussion_id_fkey" FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE not valid;

alter table "public"."discussion_messages" validate constraint "discussion_messages_discussion_id_fkey";

alter table "public"."discussion_messages" add constraint "discussion_messages_parent_message_id_fkey" FOREIGN KEY (parent_message_id) REFERENCES discussion_messages(id) ON DELETE CASCADE not valid;

alter table "public"."discussion_messages" validate constraint "discussion_messages_parent_message_id_fkey";

alter table "public"."discussion_messages" add constraint "discussion_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."discussion_messages" validate constraint "discussion_messages_user_id_fkey";

alter table "public"."discussions" add constraint "discussions_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE not valid;

alter table "public"."discussions" validate constraint "discussions_activity_id_fkey";

alter table "public"."discussions" add constraint "discussions_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."discussions" validate constraint "discussions_class_id_fkey";

alter table "public"."discussions" add constraint "discussions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."discussions" validate constraint "discussions_created_by_fkey";

alter table "public"."event_participants" add constraint "event_participants_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events_competitions(id) ON DELETE CASCADE not valid;

alter table "public"."event_participants" validate constraint "event_participants_event_id_fkey";

alter table "public"."event_participants" add constraint "event_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."event_participants" validate constraint "event_participants_user_id_fkey";

alter table "public"."events_competitions" add constraint "events_competitions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."events_competitions" validate constraint "events_competitions_created_by_fkey";

alter table "public"."focus_sessions" add constraint "focus_sessions_technique_check" CHECK ((technique = ANY (ARRAY['pomodoro25'::text, 'pomodoro50'::text, 'pomodoro30'::text]))) not valid;

alter table "public"."focus_sessions" validate constraint "focus_sessions_technique_check";

alter table "public"."focus_sessions" add constraint "focus_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."focus_sessions" validate constraint "focus_sessions_user_id_fkey";

alter table "public"."gamification_profiles" add constraint "gamification_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."gamification_profiles" validate constraint "gamification_profiles_user_id_fkey";

alter table "public"."material_class_assignments" add constraint "material_class_assignments_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."material_class_assignments" validate constraint "material_class_assignments_class_id_fkey";

alter table "public"."material_class_assignments" add constraint "material_class_assignments_material_id_class_id_key" UNIQUE using index "material_class_assignments_material_id_class_id_key";

alter table "public"."material_class_assignments" add constraint "material_class_assignments_material_id_fkey" FOREIGN KEY (material_id) REFERENCES class_materials(id) ON DELETE CASCADE not valid;

alter table "public"."material_class_assignments" validate constraint "material_class_assignments_material_id_fkey";

alter table "public"."meetings" add constraint "meetings_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."meetings" validate constraint "meetings_class_id_fkey";

alter table "public"."meetings" add constraint "meetings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."meetings" validate constraint "meetings_created_by_fkey";

alter table "public"."meetings" add constraint "meetings_meeting_type_check" CHECK ((meeting_type = ANY (ARRAY['external'::text, 'agora'::text, 'whiteboard'::text]))) not valid;

alter table "public"."meetings" validate constraint "meetings_meeting_type_check";

alter table "public"."missions_catalog" add constraint "missions_catalog_code_key" UNIQUE using index "missions_catalog_code_key";

alter table "public"."notification_logs" add constraint "notification_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notification_logs" validate constraint "notification_logs_user_id_fkey";

alter table "public"."notifications" add constraint "notifications_type_check" CHECK ((type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_type_check";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."plagiarism_checks" add constraint "plagiarism_checks_ai_score_check" CHECK (((ai_score >= 0) AND (ai_score <= 100))) not valid;

alter table "public"."plagiarism_checks" validate constraint "plagiarism_checks_ai_score_check";

alter table "public"."plagiarism_checks" add constraint "plagiarism_checks_plagiarism_percentage_check" CHECK (((plagiarism_percentage >= 0) AND (plagiarism_percentage <= 100))) not valid;

alter table "public"."plagiarism_checks" validate constraint "plagiarism_checks_plagiarism_percentage_check";

alter table "public"."plagiarism_checks" add constraint "plagiarism_checks_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE not valid;

alter table "public"."plagiarism_checks" validate constraint "plagiarism_checks_submission_id_fkey";

alter table "public"."plagiarism_checks_v2" add constraint "plagiarism_checks_v2_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE not valid;

alter table "public"."plagiarism_checks_v2" validate constraint "plagiarism_checks_v2_activity_id_fkey";

alter table "public"."plagiarism_checks_v2" add constraint "plagiarism_checks_v2_plagiarism_severity_check" CHECK ((plagiarism_severity = ANY (ARRAY['none'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text]))) not valid;

alter table "public"."plagiarism_checks_v2" validate constraint "plagiarism_checks_v2_plagiarism_severity_check";

alter table "public"."plagiarism_checks_v2" add constraint "plagiarism_checks_v2_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."plagiarism_checks_v2" validate constraint "plagiarism_checks_v2_student_id_fkey";

alter table "public"."plagiarism_checks_v2" add constraint "plagiarism_checks_v2_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE not valid;

alter table "public"."plagiarism_checks_v2" validate constraint "plagiarism_checks_v2_submission_id_fkey";

alter table "public"."plagiarism_logs" add constraint "plagiarism_logs_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE SET NULL not valid;

alter table "public"."plagiarism_logs" validate constraint "plagiarism_logs_submission_id_fkey";

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

alter table "public"."profiles" add constraint "profiles_email_unique" UNIQUE using index "profiles_email_unique";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['student'::text, 'teacher'::text, 'school'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."quiz_assignments" add constraint "quiz_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."quiz_assignments" validate constraint "quiz_assignments_assigned_by_fkey";

alter table "public"."quiz_assignments" add constraint "quiz_assignments_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_assignments" validate constraint "quiz_assignments_class_id_fkey";

alter table "public"."quiz_assignments" add constraint "quiz_assignments_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_assignments" validate constraint "quiz_assignments_quiz_id_fkey";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempts" validate constraint "quiz_attempts_quiz_id_fkey";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_quiz_id_user_id_started_at_key" UNIQUE using index "quiz_attempts_quiz_id_user_id_started_at_key";

alter table "public"."quiz_attempts" add constraint "quiz_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_attempts" validate constraint "quiz_attempts_user_id_fkey";

alter table "public"."quiz_questions" add constraint "quiz_questions_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE not valid;

alter table "public"."quiz_questions" validate constraint "quiz_questions_quiz_id_fkey";

alter table "public"."quizzes" add constraint "quizzes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."quizzes" validate constraint "quizzes_created_by_fkey";

alter table "public"."quizzes" add constraint "quizzes_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."quizzes" validate constraint "quizzes_owner_user_id_fkey";

alter table "public"."quizzes" add constraint "quizzes_source_type_check" CHECK ((source_type = ANY (ARRAY['text'::text, 'file'::text, 'url'::text, 'activity'::text]))) not valid;

alter table "public"."quizzes" validate constraint "quizzes_source_type_check";

alter table "public"."rag_training_sources" add constraint "check_source_type" CHECK ((((material_id IS NOT NULL) AND (activity_id IS NULL)) OR ((material_id IS NULL) AND (activity_id IS NOT NULL)))) not valid;

alter table "public"."rag_training_sources" validate constraint "check_source_type";

alter table "public"."rag_training_sources" add constraint "rag_training_sources_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE not valid;

alter table "public"."rag_training_sources" validate constraint "rag_training_sources_activity_id_fkey";

alter table "public"."rag_training_sources" add constraint "rag_training_sources_added_by_fkey" FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."rag_training_sources" validate constraint "rag_training_sources_added_by_fkey";

alter table "public"."rag_training_sources" add constraint "rag_training_sources_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."rag_training_sources" validate constraint "rag_training_sources_class_id_fkey";

alter table "public"."rag_training_sources" add constraint "rag_training_sources_material_id_fkey" FOREIGN KEY (material_id) REFERENCES class_materials(id) ON DELETE CASCADE not valid;

alter table "public"."rag_training_sources" validate constraint "rag_training_sources_material_id_fkey";

alter table "public"."rag_vectors" add constraint "rag_vectors_source_id_fkey" FOREIGN KEY (source_id) REFERENCES rag_training_sources(id) ON DELETE CASCADE not valid;

alter table "public"."rag_vectors" validate constraint "rag_vectors_source_id_fkey";

alter table "public"."reward_settings" add constraint "reward_settings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."reward_settings" validate constraint "reward_settings_created_by_fkey";

alter table "public"."reward_settings" add constraint "reward_settings_reward_type_check" CHECK ((reward_type = ANY (ARRAY['top_rank_bonus'::text, 'streak_bonus'::text, 'perfect_score'::text, 'mission_complete'::text, 'custom'::text]))) not valid;

alter table "public"."reward_settings" validate constraint "reward_settings_reward_type_check";

alter table "public"."reward_settings" add constraint "reward_settings_scope_check" CHECK ((scope = ANY (ARRAY['school'::text, 'class'::text]))) not valid;

alter table "public"."reward_settings" validate constraint "reward_settings_scope_check";

alter table "public"."school_admins" add constraint "school_admins_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text]))) not valid;

alter table "public"."school_admins" validate constraint "school_admins_role_check";

alter table "public"."school_admins" add constraint "school_admins_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."school_admins" validate constraint "school_admins_school_id_fkey";

alter table "public"."school_admins" add constraint "school_admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."school_admins" validate constraint "school_admins_user_id_fkey";

alter table "public"."school_admins" add constraint "school_admins_user_id_school_id_key" UNIQUE using index "school_admins_user_id_school_id_key";

alter table "public"."school_announcements" add constraint "school_announcements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."school_announcements" validate constraint "school_announcements_created_by_fkey";

alter table "public"."school_announcements" add constraint "school_announcements_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."school_announcements" validate constraint "school_announcements_school_id_fkey";

alter table "public"."school_classes" add constraint "school_classes_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."school_classes" validate constraint "school_classes_class_id_fkey";

alter table "public"."school_classes" add constraint "school_classes_class_unique" UNIQUE using index "school_classes_class_unique";

alter table "public"."school_classes" add constraint "school_classes_school_id_class_id_key" UNIQUE using index "school_classes_school_id_class_id_key";

alter table "public"."school_classes" add constraint "school_classes_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."school_classes" validate constraint "school_classes_school_id_fkey";

alter table "public"."school_teachers" add constraint "school_teachers_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE not valid;

alter table "public"."school_teachers" validate constraint "school_teachers_school_id_fkey";

alter table "public"."school_teachers" add constraint "school_teachers_school_id_user_id_key" UNIQUE using index "school_teachers_school_id_user_id_key";

alter table "public"."school_teachers" add constraint "school_teachers_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'pending'::text, 'removed'::text]))) not valid;

alter table "public"."school_teachers" validate constraint "school_teachers_status_check";

alter table "public"."school_teachers" add constraint "school_teachers_unique_link" UNIQUE using index "school_teachers_unique_link";

alter table "public"."school_teachers" add constraint "school_teachers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."school_teachers" validate constraint "school_teachers_user_id_fkey";

alter table "public"."schools" add constraint "schools_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."schools" validate constraint "schools_owner_id_fkey";

alter table "public"."schools" add constraint "schools_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'trial'::text]))) not valid;

alter table "public"."schools" validate constraint "schools_status_check";

alter table "public"."student_alerts" add constraint "student_alerts_alert_type_check" CHECK ((alert_type = ANY (ARRAY['low_grade'::text, 'late_submissions'::text, 'plagiarism'::text, 'no_submissions'::text]))) not valid;

alter table "public"."student_alerts" validate constraint "student_alerts_alert_type_check";

alter table "public"."student_alerts" add constraint "student_alerts_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE not valid;

alter table "public"."student_alerts" validate constraint "student_alerts_class_id_fkey";

alter table "public"."student_alerts" add constraint "student_alerts_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES profiles(id) not valid;

alter table "public"."student_alerts" validate constraint "student_alerts_resolved_by_fkey";

alter table "public"."student_alerts" add constraint "student_alerts_severity_check" CHECK ((severity = ANY (ARRAY['attention'::text, 'warning'::text, 'critical'::text]))) not valid;

alter table "public"."student_alerts" validate constraint "student_alerts_severity_check";

alter table "public"."student_alerts" add constraint "student_alerts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."student_alerts" validate constraint "student_alerts_student_id_fkey";

alter table "public"."submissions" add constraint "submissions_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE not valid;

alter table "public"."submissions" validate constraint "submissions_activity_id_fkey";

alter table "public"."submissions" add constraint "submissions_activity_id_student_id_key" UNIQUE using index "submissions_activity_id_student_id_key";

alter table "public"."submissions" add constraint "submissions_plagiarism_check_status_check" CHECK ((plagiarism_check_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'failed'::text, 'not_required'::text]))) not valid;

alter table "public"."submissions" validate constraint "submissions_plagiarism_check_status_check";

alter table "public"."submissions" add constraint "submissions_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'graded'::text]))) not valid;

alter table "public"."submissions" validate constraint "submissions_status_check";

alter table "public"."submissions" add constraint "submissions_student_id_fkey" FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."submissions" validate constraint "submissions_student_id_fkey";

alter table "public"."teacher_invites" add constraint "teacher_invites_invite_token_key" UNIQUE using index "teacher_invites_invite_token_key";

alter table "public"."teacher_invites" add constraint "teacher_invites_school_id_fkey" FOREIGN KEY (school_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."teacher_invites" validate constraint "teacher_invites_school_id_fkey";

alter table "public"."teacher_invites" add constraint "teacher_invites_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text]))) not valid;

alter table "public"."teacher_invites" validate constraint "teacher_invites_status_check";

alter table "public"."teacher_subscriptions" add constraint "teacher_subscriptions_plan_type_check" CHECK ((plan_type = ANY (ARRAY['free'::text, 'basic'::text, 'pro'::text, 'enterprise'::text]))) not valid;

alter table "public"."teacher_subscriptions" validate constraint "teacher_subscriptions_plan_type_check";

alter table "public"."teacher_subscriptions" add constraint "teacher_subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text, 'trial'::text]))) not valid;

alter table "public"."teacher_subscriptions" validate constraint "teacher_subscriptions_status_check";

alter table "public"."teacher_subscriptions" add constraint "teacher_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."teacher_subscriptions" validate constraint "teacher_subscriptions_user_id_fkey";

alter table "public"."user_achievements" add constraint "user_achievements_achievement_id_fkey" FOREIGN KEY (achievement_id) REFERENCES achievements_catalog(id) ON DELETE CASCADE not valid;

alter table "public"."user_achievements" validate constraint "user_achievements_achievement_id_fkey";

alter table "public"."user_achievements" add constraint "user_achievements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_achievements" validate constraint "user_achievements_user_id_fkey";

alter table "public"."user_badges" add constraint "user_badges_badge_id_fkey" FOREIGN KEY (badge_id) REFERENCES badges_catalog(id) ON DELETE CASCADE not valid;

alter table "public"."user_badges" validate constraint "user_badges_badge_id_fkey";

alter table "public"."user_badges" add constraint "user_badges_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_badges" validate constraint "user_badges_user_id_fkey";

alter table "public"."user_missions" add constraint "user_missions_mission_id_fkey" FOREIGN KEY (mission_id) REFERENCES missions_catalog(id) ON DELETE CASCADE not valid;

alter table "public"."user_missions" validate constraint "user_missions_mission_id_fkey";

alter table "public"."user_missions" add constraint "user_missions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'expired'::text]))) not valid;

alter table "public"."user_missions" validate constraint "user_missions_status_check";

alter table "public"."user_missions" add constraint "user_missions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_missions" validate constraint "user_missions_user_id_fkey";

alter table "public"."xp_log" add constraint "xp_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."xp_log" validate constraint "xp_log_user_id_fkey";

alter table "public"."xp_log" add constraint "xp_log_xp_check" CHECK ((xp <> 0)) not valid;

alter table "public"."xp_log" validate constraint "xp_log_xp_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.accept_class_invitation(invitation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.accept_invitation_with_transaction(p_invitation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

create or replace view "public"."active_activities" as  SELECT id,
    title,
    description,
    content,
    type,
    max_grade,
    due_date,
    created_by,
    is_published,
    created_at,
    updated_at,
    teacher_id,
    status,
    is_draft,
    max_score,
    instructions,
    plagiarism_enabled,
    is_group_activity,
    group_size,
    plagiarism_threshold,
    weight
   FROM activities
  WHERE (is_published = true);


create or replace view "public"."active_classes" as  SELECT id,
    name,
    subject,
    description,
    color,
    room_number,
    student_capacity,
    created_by,
    is_active,
    created_at,
    updated_at,
    professor_id,
    school_id,
    invite_code,
    banner_color
   FROM classes
  WHERE (is_active = true);


create or replace view "public"."activities_with_classes" as  SELECT a.id,
    a.title,
    a.description,
    a.content,
    a.type,
    a.max_grade,
    a.due_date,
    a.created_by,
    a.is_published,
    a.created_at,
    a.updated_at,
    aca.class_id,
    aca.assigned_at,
    c.name AS class_name,
    c.subject AS class_subject,
    c.created_by AS class_created_by
   FROM ((activities a
     JOIN activity_class_assignments aca ON ((a.id = aca.activity_id)))
     JOIN classes c ON ((aca.class_id = c.id)));


CREATE OR REPLACE FUNCTION public.assign_grade_with_transaction(p_submission_id uuid, p_grade numeric, p_feedback text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.auto_create_school_for_school_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.award_badge(p_user_id uuid, p_badge_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
  VALUES (p_user_id, p_badge_id, NOW(), 100)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_teacher_create_class(teacher_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_award_xp_badges(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

create or replace view "public"."classes_with_school" as  SELECT c.id,
    c.name,
    c.subject,
    c.description,
    c.color,
    c.room_number,
    c.student_capacity,
    c.created_by,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.professor_id,
    c.school_id,
    c.invite_code,
    c.banner_color,
    s.name AS school_name,
        CASE
            WHEN (c.school_id IS NOT NULL) THEN 'school_managed'::text
            WHEN (EXISTS ( SELECT 1
               FROM school_classes sc
              WHERE (sc.class_id = c.id))) THEN 'school_linked'::text
            ELSE 'independent'::text
        END AS class_type
   FROM (classes c
     LEFT JOIN schools s ON ((c.school_id = s.id)));


CREATE OR REPLACE FUNCTION public.clean_old_notification_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Deletar logs com mais de 30 dias
  DELETE FROM public.notification_logs
  WHERE sent_at < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE 'Cleaned old notification logs';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(days_old integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.notifications
    WHERE read = true 
    AND created_at < NOW() - (days_old || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.count_class_members(p_class_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM class_members
  WHERE class_id = p_class_id;
  
  RETURN COALESCE(v_count, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.count_class_students(p_class_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.count_class_students_batch(p_class_ids uuid[])
 RETURNS TABLE(class_id uuid, student_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.count_school_students(p_school_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_class_with_transaction(p_teacher_id uuid, p_name text, p_subject text, p_description text DEFAULT NULL::text, p_course text DEFAULT NULL::text, p_period text DEFAULT NULL::text, p_grade_level text DEFAULT NULL::text, p_academic_year integer DEFAULT NULL::integer, p_color text DEFAULT '#6366f1'::text, p_student_capacity integer DEFAULT 30, p_chatbot_enabled boolean DEFAULT false, p_school_id uuid DEFAULT NULL::uuid, p_is_school_managed boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type character varying, p_title text, p_message text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_old_invitations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.class_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_old_teacher_invites()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_class_stats(p_class_id uuid)
 RETURNS TABLE(total_students integer, total_teachers integer, total_activities integer, total_submissions integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_plagiarism_stats(p_activity_id uuid)
 RETURNS TABLE(total_checks bigint, avg_plagiarism numeric, avg_ai_score numeric, high_plagiarism_count bigint, ai_generated_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_school_classes_safe(school_id uuid)
 RETURNS TABLE(class_id uuid, class_name text, subject text, color text, teacher_name text, student_count bigint, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_school_teachers_safe(school_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, email text, avatar_url text, status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_classes()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT class_id FROM class_members WHERE user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM profiles WHERE id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_school_safe(user_id uuid)
 RETURNS TABLE(school_id uuid, school_name text, logo_url text, settings jsonb, role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    updated_at = NOW();

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.initialize_student_gamification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.is_class_member(p_class_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 
    FROM class_members 
    WHERE class_id = p_class_id 
      AND user_id = p_user_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.is_class_teacher_direct(p_class_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM classes
    WHERE id = p_class_id 
      AND teacher_id = p_user_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_school_active(school_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  school_status TEXT;
BEGIN
  SELECT status INTO school_status
  FROM public.schools
  WHERE id = school_id_param;

  RETURN (school_status = 'active' OR school_status = 'trial');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_school_admin(user_id uuid, school_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.is_student()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'student'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_teacher()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'teacher'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.log_class_member_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.notify_new_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.search_rag_vectors(query_embedding vector, class_id_filter uuid, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5)
 RETURNS TABLE(id uuid, source_id uuid, content_chunk text, similarity double precision, metadata jsonb)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.set_gamification_profiles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_submission_plagiarism_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.set_teacher_subscriptions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$
;

create or replace view "public"."student_plagiarism_stats" as  SELECT s.student_id,
    count(pc.id) AS total_checks,
    (avg(pc.plagiarism_percentage))::numeric(5,2) AS avg_plagiarism,
    (avg(pc.ai_score))::numeric(5,2) AS avg_ai_score,
    count(
        CASE
            WHEN (pc.plagiarism_percentage >= 50) THEN 1
            ELSE NULL::integer
        END) AS high_plagiarism_count,
    count(
        CASE
            WHEN pc.ai_generated THEN 1
            ELSE NULL::integer
        END) AS ai_generated_count
   FROM (submissions s
     LEFT JOIN plagiarism_checks pc ON ((s.id = pc.submission_id)))
  GROUP BY s.student_id;


create or replace view "public"."submissions_pending_plagiarism" as  SELECT s.id AS submission_id,
    s.activity_id,
    s.student_id,
    s.submitted_at,
    s.plagiarism_check_status,
    a.title AS activity_title,
    a.plagiarism_enabled,
    c.id AS class_id,
    c.name AS class_name
   FROM (((submissions s
     JOIN activities a ON ((s.activity_id = a.id)))
     JOIN activity_class_assignments aca ON ((a.id = aca.activity_id)))
     JOIN classes c ON ((aca.class_id = c.id)))
  WHERE ((s.plagiarism_check_status = ANY (ARRAY['pending'::text, 'in_progress'::text])) AND (a.plagiarism_enabled = true));


CREATE OR REPLACE FUNCTION public.submit_activity_with_transaction(p_activity_id uuid, p_user_id uuid, p_submission_text text DEFAULT NULL::text, p_attachments jsonb DEFAULT '[]'::jsonb, p_grade numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

create or replace view "public"."unread_notifications_count" as  SELECT user_id,
    count(*) AS unread_count
   FROM notifications
  WHERE (read = false)
  GROUP BY user_id;


CREATE OR REPLACE FUNCTION public.update_reward_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_teacher_invites_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_is_class_teacher(p_class_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM classes
    WHERE id = p_class_id
    AND created_by = p_user_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.user_is_teacher(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND role = 'teacher'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE sql
AS $function$SELECT gen_random_uuid()$function$
;

create or replace view "public"."v_class_membership" as  SELECT class_id,
    user_id,
    role
   FROM class_members cm;


CREATE OR REPLACE FUNCTION public.get_user_class_ids_direct(p_user_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT ARRAY_AGG(class_id) FROM class_members WHERE user_id = p_user_id; $function$
;

CREATE OR REPLACE FUNCTION public.get_user_created_class_ids_direct(p_user_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT ARRAY_AGG(id) FROM classes WHERE created_by = p_user_id; $function$
;

CREATE OR REPLACE FUNCTION public.is_user_class_teacher_direct(p_user_id uuid, p_class_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT EXISTS (SELECT 1 FROM classes WHERE id = p_class_id AND created_by = p_user_id); $function$
;

CREATE OR REPLACE FUNCTION public.is_user_in_class_direct(p_user_id uuid, p_class_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT EXISTS (SELECT 1 FROM class_members WHERE user_id = p_user_id AND class_id = p_class_id); $function$
;

create policy "achievements_catalog_public_read"
on "public"."achievements_catalog"
as permissive
for select
to public
using (true);


create policy "Students can view published activities in their classes"
on "public"."activities"
as permissive
for select
to authenticated
using (((status = 'published'::text) AND (EXISTS ( SELECT 1
   FROM (activity_class_assignments aca
     JOIN class_members cm ON ((cm.class_id = aca.class_id)))
  WHERE ((aca.activity_id = activities.id) AND (cm.user_id = auth.uid()) AND (cm.role = 'student'::text))))));


create policy "Teachers can create activities"
on "public"."activities"
as permissive
for insert
to authenticated
with check ((created_by = auth.uid()));


create policy "Teachers can delete their own activities"
on "public"."activities"
as permissive
for delete
to authenticated
using ((created_by = auth.uid()));


create policy "Teachers can update their own activities"
on "public"."activities"
as permissive
for update
to authenticated
using ((created_by = auth.uid()))
with check ((created_by = auth.uid()));


create policy "Teachers can view their class activities"
on "public"."activities"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM (activity_class_assignments aca
     JOIN class_members cm ON ((cm.class_id = aca.class_id)))
  WHERE ((aca.activity_id = activities.id) AND (cm.user_id = auth.uid()) AND (cm.role = 'teacher'::text)))));


create policy "activities_delete_creator"
on "public"."activities"
as permissive
for delete
to public
using ((created_by = auth.uid()));


create policy "activities_delete_creator_only"
on "public"."activities"
as permissive
for delete
to public
using ((created_by = auth.uid()));


create policy "activities_insert_creator"
on "public"."activities"
as permissive
for insert
to public
with check ((created_by = auth.uid()));


create policy "activities_insert_teacher_only"
on "public"."activities"
as permissive
for insert
to public
with check (((created_by = auth.uid()) AND is_teacher()));


create policy "activities_select_creator_or_assigned"
on "public"."activities"
as permissive
for select
to public
using (((created_by = auth.uid()) OR (id IN ( SELECT aca.activity_id
   FROM activity_class_assignments aca
  WHERE (aca.class_id = ANY (get_user_class_ids_direct(auth.uid())))))));


create policy "activities_teacher_all"
on "public"."activities"
as permissive
for all
to public
using ((auth.uid() = created_by));


create policy "activities_update_creator"
on "public"."activities"
as permissive
for update
to public
using ((created_by = auth.uid()));


create policy "activities_update_creator_only"
on "public"."activities"
as permissive
for update
to public
using ((created_by = auth.uid()));


create policy "activity_class_assignments_safe"
on "public"."activity_class_assignments"
as permissive
for all
to public
using (((EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = activity_class_assignments.class_id) AND (c.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM activities a
  WHERE ((a.id = activity_class_assignments.activity_id) AND (a.created_by = auth.uid()))))));


create policy "answers_student_own"
on "public"."answers"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM submissions s
  WHERE ((s.id = answers.submission_id) AND (s.student_id = auth.uid())))));


create policy "Authenticated users can insert logs"
on "public"."application_logs"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Users can read own logs"
on "public"."application_logs"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "authenticated_manage_badges"
on "public"."badges"
as permissive
for all
to public
using ((auth.role() = 'authenticated'::text))
with check ((auth.role() = 'authenticated'::text));


create policy "public_read_badges"
on "public"."badges"
as permissive
for select
to public
using (true);


create policy "badges_catalog_public_read"
on "public"."badges_catalog"
as permissive
for select
to public
using (true);


create policy "calendar_events_delete_creator"
on "public"."calendar_events"
as permissive
for delete
to public
using ((created_by = auth.uid()));


create policy "calendar_events_insert_creator"
on "public"."calendar_events"
as permissive
for insert
to public
with check (((created_by = auth.uid()) AND ((class_id IS NULL) OR (class_id = ANY (get_user_created_class_ids_direct(auth.uid()))))));


create policy "calendar_events_manage_safe"
on "public"."calendar_events"
as permissive
for all
to public
using ((created_by = auth.uid()));


create policy "calendar_events_select_member_or_creator"
on "public"."calendar_events"
as permissive
for select
to public
using (((created_by = auth.uid()) OR (class_id = ANY (get_user_class_ids_direct(auth.uid())))));


create policy "calendar_events_select_safe"
on "public"."calendar_events"
as permissive
for select
to public
using (((created_by = auth.uid()) OR ((class_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = calendar_events.class_id) AND (c.created_by = auth.uid())))))));


create policy "calendar_events_update_creator"
on "public"."calendar_events"
as permissive
for update
to public
using ((created_by = auth.uid()));


create policy "invitation_student_update"
on "public"."class_invitations"
as permissive
for update
to public
using (((invitee_email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text) OR (invitee_id = auth.uid())))
with check (((invitee_email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text) OR (invitee_id = auth.uid())));


create policy "invitation_student_view"
on "public"."class_invitations"
as permissive
for select
to public
using (((invitee_email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text) OR (invitee_id = auth.uid())));


create policy "invitation_teacher_create"
on "public"."class_invitations"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = class_invitations.class_id) AND (classes.created_by = auth.uid())))));


create policy "invitation_teacher_delete"
on "public"."class_invitations"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = class_invitations.class_id) AND (classes.created_by = auth.uid())))));


create policy "invitation_teacher_view"
on "public"."class_invitations"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = class_invitations.class_id) AND (classes.created_by = auth.uid())))));


create policy "class_materials_safe"
on "public"."class_materials"
as permissive
for all
to public
using (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (material_class_assignments mca
     JOIN classes c ON ((c.id = mca.class_id)))
  WHERE ((mca.material_id = class_materials.id) AND (c.created_by = auth.uid()))))));


create policy "class_member_history_safe"
on "public"."class_member_history"
as permissive
for all
to public
using (((performed_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = class_member_history.class_id) AND (c.created_by = auth.uid()))))));


create policy "class_members_delete_by_teacher_or_self"
on "public"."class_members"
as permissive
for delete
to public
using (((user_id = auth.uid()) OR (class_id = ANY (get_user_created_class_ids_direct(auth.uid())))));


create policy "class_members_delete_policy"
on "public"."class_members"
as permissive
for delete
to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = class_members.class_id) AND (c.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (school_classes sc
     JOIN school_admins sa ON ((sa.school_id = sc.school_id)))
  WHERE ((sc.class_id = class_members.class_id) AND (sa.user_id = auth.uid()) AND (sa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));


create policy "class_members_insert_by_teacher"
on "public"."class_members"
as permissive
for insert
to public
with check ((class_id = ANY (get_user_created_class_ids_direct(auth.uid()))));


create policy "class_members_insert_policy"
on "public"."class_members"
as permissive
for insert
to public
with check (((EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = class_members.class_id) AND (c.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (school_classes sc
     JOIN school_admins sa ON ((sa.school_id = sc.school_id)))
  WHERE ((sc.class_id = class_members.class_id) AND (sa.user_id = auth.uid()) AND (sa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));


create policy "class_members_select_own_or_teacher"
on "public"."class_members"
as permissive
for select
to public
using (((user_id = auth.uid()) OR (class_id = ANY (get_user_created_class_ids_direct(auth.uid())))));


create policy "class_members_select_policy"
on "public"."class_members"
as permissive
for select
to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = class_members.class_id) AND (c.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (school_classes sc
     JOIN school_admins sa ON ((sa.school_id = sc.school_id)))
  WHERE ((sc.class_id = class_members.class_id) AND (sa.user_id = auth.uid()) AND (sa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));


create policy "class_members_update_by_teacher"
on "public"."class_members"
as permissive
for update
to public
using ((class_id = ANY (get_user_created_class_ids_direct(auth.uid()))));


create policy "class_members_update_policy"
on "public"."class_members"
as permissive
for update
to public
using (((EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = class_members.class_id) AND (c.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (school_classes sc
     JOIN school_admins sa ON ((sa.school_id = sc.school_id)))
  WHERE ((sc.class_id = class_members.class_id) AND (sa.user_id = auth.uid()) AND (sa.role = ANY (ARRAY['owner'::text, 'admin'::text])))))));


create policy "class_rank_snapshots_safe"
on "public"."class_rank_snapshots"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = class_rank_snapshots.class_id) AND (c.created_by = auth.uid())))));


create policy "Students can join classes"
on "public"."class_students"
as permissive
for insert
to public
with check ((auth.uid() = student_id));


create policy "Users can view their own class enrollments"
on "public"."class_students"
as permissive
for select
to public
using (((auth.uid() = student_id) OR (EXISTS ( SELECT 1
   FROM classes
  WHERE ((classes.id = class_students.class_id) AND (classes.professor_id = auth.uid()))))));


create policy "Teachers can create classes"
on "public"."classes"
as permissive
for insert
to authenticated
with check ((created_by = auth.uid()));


create policy "Teachers can delete their own classes"
on "public"."classes"
as permissive
for delete
to authenticated
using ((created_by = auth.uid()));


create policy "Teachers can update their own classes"
on "public"."classes"
as permissive
for update
to authenticated
using ((created_by = auth.uid()))
with check ((created_by = auth.uid()));


create policy "Users can view their classes"
on "public"."classes"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM class_members cm
  WHERE ((cm.class_id = classes.id) AND (cm.user_id = auth.uid())))));


create policy "classes_delete_by_creator"
on "public"."classes"
as permissive
for delete
to public
using ((created_by = auth.uid()));


create policy "classes_delete_policy"
on "public"."classes"
as permissive
for delete
to public
using (((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM (school_classes sc
     JOIN school_teachers st ON ((st.school_id = sc.school_id)))
  WHERE ((sc.class_id = classes.id) AND (st.user_id = auth.uid()) AND (st.status = 'active'::text))))));


create policy "classes_delete_teacher_only"
on "public"."classes"
as permissive
for delete
to public
using ((created_by = auth.uid()));


create policy "classes_insert_by_creator"
on "public"."classes"
as permissive
for insert
to public
with check ((created_by = auth.uid()));


create policy "classes_insert_policy"
on "public"."classes"
as permissive
for insert
to public
with check (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'teacher'::text)))) AND (created_by = auth.uid())));


create policy "classes_insert_teacher_only"
on "public"."classes"
as permissive
for insert
to public
with check (((created_by = auth.uid()) AND is_teacher()));


create policy "classes_school_admin_read"
on "public"."classes"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (school_classes sc
     JOIN school_admins sa ON ((sa.school_id = sc.school_id)))
  WHERE ((sc.class_id = classes.id) AND (sa.user_id = auth.uid()) AND (sa.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


create policy "classes_select_by_creator_or_member"
on "public"."classes"
as permissive
for select
to public
using (((created_by = auth.uid()) OR (id = ANY (get_user_class_ids_direct(auth.uid())))));


create policy "classes_select_policy"
on "public"."classes"
as permissive
for select
to public
using (((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM class_members
  WHERE ((class_members.class_id = classes.id) AND (class_members.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (school_classes sc
     JOIN school_teachers st ON ((st.school_id = sc.school_id)))
  WHERE ((sc.class_id = classes.id) AND (st.user_id = auth.uid()) AND (st.status = 'active'::text))))));


create policy "classes_teacher_all"
on "public"."classes"
as permissive
for all
to public
using ((auth.uid() = created_by));


create policy "classes_update_by_creator"
on "public"."classes"
as permissive
for update
to public
using ((created_by = auth.uid()))
with check ((created_by = auth.uid()));


create policy "classes_update_policy"
on "public"."classes"
as permissive
for update
to public
using (((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM (school_classes sc
     JOIN school_teachers st ON ((st.school_id = sc.school_id)))
  WHERE ((sc.class_id = classes.id) AND (st.user_id = auth.uid()) AND (st.status = 'active'::text))))));


create policy "classes_update_teacher_only"
on "public"."classes"
as permissive
for update
to public
using ((created_by = auth.uid()));


create policy "discussion_messages_delete_safe"
on "public"."discussion_messages"
as permissive
for delete
to public
using ((user_id = auth.uid()));


create policy "discussion_messages_insert_safe"
on "public"."discussion_messages"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "discussion_messages_select_safe"
on "public"."discussion_messages"
as permissive
for select
to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (discussions d
     JOIN classes c ON ((c.id = d.class_id)))
  WHERE ((d.id = discussion_messages.discussion_id) AND (c.created_by = auth.uid()))))));


create policy "discussions_delete_safe"
on "public"."discussions"
as permissive
for delete
to public
using ((created_by = auth.uid()));


create policy "discussions_insert_safe"
on "public"."discussions"
as permissive
for insert
to public
with check ((created_by = auth.uid()));


create policy "discussions_select_safe"
on "public"."discussions"
as permissive
for select
to public
using (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = discussions.class_id) AND (c.created_by = auth.uid()))))));


create policy "event_participants_self_ins"
on "public"."event_participants"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "event_participants_self_read"
on "public"."event_participants"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "events_public_read"
on "public"."events_competitions"
as permissive
for select
to public
using (true);


create policy "focus_sessions_self"
on "public"."focus_sessions"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "focus_sessions_self_ins"
on "public"."focus_sessions"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "gamification_profiles_self_read"
on "public"."gamification_profiles"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "gamification_profiles_self_write"
on "public"."gamification_profiles"
as permissive
for all
to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "material_class_assignments_safe"
on "public"."material_class_assignments"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = material_class_assignments.class_id) AND (c.created_by = auth.uid())))));


create policy "meetings_insert_safe"
on "public"."meetings"
as permissive
for insert
to public
with check ((created_by = auth.uid()));


create policy "meetings_manage_safe"
on "public"."meetings"
as permissive
for all
to public
using ((created_by = auth.uid()));


create policy "meetings_select_safe"
on "public"."meetings"
as permissive
for select
to public
using (((created_by = auth.uid()) OR ((class_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = meetings.class_id) AND (c.created_by = auth.uid())))))));


create policy "missions_catalog_public_read"
on "public"."missions_catalog"
as permissive
for select
to public
using (true);


create policy "notification_logs_service_insert"
on "public"."notification_logs"
as permissive
for insert
to service_role
with check (true);


create policy "notification_logs_view_own"
on "public"."notification_logs"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "System can create notifications"
on "public"."notifications"
as permissive
for insert
to authenticated
with check (true);


create policy "System can insert notifications"
on "public"."notifications"
as permissive
for insert
to public
with check (true);


create policy "Users can delete their own notifications"
on "public"."notifications"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update their own notifications"
on "public"."notifications"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own notifications"
on "public"."notifications"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "notifications_self_all"
on "public"."notifications"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "Professors can view plagiarism checks"
on "public"."plagiarism_checks"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (submissions s
     JOIN activities a ON ((s.activity_id = a.id)))
  WHERE ((s.id = plagiarism_checks.submission_id) AND (a.created_by = auth.uid())))));


create policy "System can insert plagiarism checks"
on "public"."plagiarism_checks"
as permissive
for insert
to public
with check (true);


create policy "System can create plagiarism records"
on "public"."plagiarism_checks_v2"
as permissive
for insert
to authenticated
with check (true);


create policy "Teachers can view plagiarism results from their classes"
on "public"."plagiarism_checks_v2"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM ((activities a
     JOIN activity_class_assignments aca ON ((aca.activity_id = a.id)))
     JOIN class_members cm ON ((cm.class_id = aca.class_id)))
  WHERE ((a.id = plagiarism_checks_v2.activity_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'teacher'::text)))));


create policy "plagiarism_checks_teacher_read"
on "public"."plagiarism_checks_v2"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM activities a
  WHERE ((a.id = plagiarism_checks_v2.activity_id) AND (a.created_by = auth.uid())))));


create policy "Only admins can view logs"
on "public"."plagiarism_logs"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((auth.uid() = users.id) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to authenticated
using ((id = auth.uid()))
with check ((id = auth.uid()));


create policy "Users can view public profiles"
on "public"."profiles"
as permissive
for select
to authenticated
using (true);


create policy "profiles_insert_own"
on "public"."profiles"
as permissive
for insert
to public
with check ((id = auth.uid()));


create policy "profiles_select_all"
on "public"."profiles"
as permissive
for select
to public
using (true);


create policy "profiles_self_read"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


create policy "profiles_self_update"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "profiles_update_own"
on "public"."profiles"
as permissive
for update
to public
using ((id = auth.uid()));


create policy "quiz_assignments_safe"
on "public"."quiz_assignments"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = quiz_assignments.class_id) AND (c.created_by = auth.uid())))));


create policy "quiz_attempts_student_own"
on "public"."quiz_attempts"
as permissive
for all
to public
using ((user_id = auth.uid()));


create policy "quiz_attempts_teacher_view"
on "public"."quiz_attempts"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (quiz_assignments qa
     JOIN classes c ON ((c.id = qa.class_id)))
  WHERE ((qa.quiz_id = quiz_attempts.quiz_id) AND (c.created_by = auth.uid())))));


create policy "quiz_questions_by_owner"
on "public"."quiz_questions"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.owner_user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.owner_user_id = auth.uid())))));


create policy "quiz_questions_owner_select"
on "public"."quiz_questions"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.created_by = auth.uid())))));


create policy "quiz_questions_owner_write"
on "public"."quiz_questions"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.created_by = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.created_by = auth.uid())))));


create policy "quiz_questions_public_select"
on "public"."quiz_questions"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.is_public = true)))));


create policy "quizzes_owner_crud"
on "public"."quizzes"
as permissive
for all
to public
using ((owner_user_id = auth.uid()))
with check ((owner_user_id = auth.uid()));


create policy "quizzes_owner_select"
on "public"."quizzes"
as permissive
for select
to public
using ((created_by = auth.uid()));


create policy "quizzes_owner_write"
on "public"."quizzes"
as permissive
for all
to public
using ((created_by = auth.uid()))
with check ((created_by = auth.uid()));


create policy "quizzes_public_select"
on "public"."quizzes"
as permissive
for select
to public
using ((is_public = true));


create policy "rag_training_sources_safe"
on "public"."rag_training_sources"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = rag_training_sources.class_id) AND (c.created_by = auth.uid())))));


create policy "rag_vectors_safe"
on "public"."rag_vectors"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM (rag_training_sources rts
     JOIN classes c ON ((c.id = rts.class_id)))
  WHERE ((rts.id = rag_vectors.source_id) AND (c.created_by = auth.uid())))));


create policy "creators_create_rewards"
on "public"."reward_settings"
as permissive
for insert
to public
with check ((created_by = auth.uid()));


create policy "creators_delete_own_rewards"
on "public"."reward_settings"
as permissive
for delete
to public
using ((created_by = auth.uid()));


create policy "creators_read_own_rewards"
on "public"."reward_settings"
as permissive
for select
to public
using ((created_by = auth.uid()));


create policy "creators_update_own_rewards"
on "public"."reward_settings"
as permissive
for update
to public
using ((created_by = auth.uid()))
with check ((created_by = auth.uid()));


create policy "school_admins_self_all"
on "public"."school_admins"
as permissive
for all
to public
using ((auth.uid() = user_id));


create policy "school_admins_self_delete"
on "public"."school_admins"
as permissive
for delete
to public
using ((user_id = auth.uid()));


create policy "school_admins_self_insert"
on "public"."school_admins"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "school_admins_self_update"
on "public"."school_admins"
as permissive
for update
to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "school_admins_simple_read"
on "public"."school_admins"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "school_announcements_admins_insert"
on "public"."school_announcements"
as permissive
for insert
to public
with check ((school_id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE (school_admins.user_id = auth.uid()))));


create policy "school_announcements_visible_to_admins"
on "public"."school_announcements"
as permissive
for select
to public
using ((school_id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE (school_admins.user_id = auth.uid()))));


create policy "school_classes_admins_delete"
on "public"."school_classes"
as permissive
for delete
to public
using ((school_id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE (school_admins.user_id = auth.uid()))));


create policy "school_classes_admins_insert"
on "public"."school_classes"
as permissive
for insert
to public
with check ((school_id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE (school_admins.user_id = auth.uid()))));


create policy "school_classes_public_read"
on "public"."school_classes"
as permissive
for select
to public
using (true);


create policy "school_classes_visible_to_admins"
on "public"."school_classes"
as permissive
for select
to public
using ((school_id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE (school_admins.user_id = auth.uid()))));


create policy "school_teachers_admins_delete"
on "public"."school_teachers"
as permissive
for delete
to public
using ((school_id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE (school_admins.user_id = auth.uid()))));


create policy "school_teachers_admins_insert"
on "public"."school_teachers"
as permissive
for insert
to public
with check ((school_id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE (school_admins.user_id = auth.uid()))));


create policy "school_teachers_admins_update"
on "public"."school_teachers"
as permissive
for update
to public
using ((school_id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE (school_admins.user_id = auth.uid()))))
with check ((school_id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE (school_admins.user_id = auth.uid()))));


create policy "school_teachers_self_read"
on "public"."school_teachers"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "school_teachers_visible_to_admins"
on "public"."school_teachers"
as permissive
for select
to public
using ((school_id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE (school_admins.user_id = auth.uid()))));


create policy "school_active_read"
on "public"."schools"
as permissive
for select
to public
using (((status = ANY (ARRAY['active'::text, 'trial'::text])) OR (EXISTS ( SELECT 1
   FROM school_admins sa
  WHERE ((sa.school_id = schools.id) AND (sa.user_id = auth.uid()))))));


create policy "schools_admins_insert"
on "public"."schools"
as permissive
for insert
to public
with check (true);


create policy "schools_admins_read"
on "public"."schools"
as permissive
for select
to public
using ((id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE (school_admins.user_id = auth.uid()))));


create policy "schools_admins_update"
on "public"."schools"
as permissive
for update
to public
using ((id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE ((school_admins.user_id = auth.uid()) AND (school_admins.role = 'owner'::text)))))
with check ((id IN ( SELECT school_admins.school_id
   FROM school_admins
  WHERE ((school_admins.user_id = auth.uid()) AND (school_admins.role = 'owner'::text)))));


create policy "schools_owner_all"
on "public"."schools"
as permissive
for all
to public
using ((auth.uid() = owner_id));


create policy "student_alerts_safe"
on "public"."student_alerts"
as permissive
for all
to public
using (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM classes c
  WHERE ((c.id = student_alerts.class_id) AND (c.created_by = auth.uid()))))));


create policy "Students can create their own submissions"
on "public"."submissions"
as permissive
for insert
to authenticated
with check ((student_id = auth.uid()));


create policy "Students can update their draft submissions"
on "public"."submissions"
as permissive
for update
to authenticated
using (((student_id = auth.uid()) AND (status = 'draft'::text)))
with check ((student_id = auth.uid()));


create policy "Students can view their own submissions"
on "public"."submissions"
as permissive
for select
to authenticated
using ((student_id = auth.uid()));


create policy "Teachers can grade submissions from their classes"
on "public"."submissions"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM ((activities a
     JOIN activity_class_assignments aca ON ((aca.activity_id = a.id)))
     JOIN class_members cm ON ((cm.class_id = aca.class_id)))
  WHERE ((a.id = submissions.activity_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'teacher'::text)))));


create policy "Teachers can view submissions from their classes"
on "public"."submissions"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM ((activities a
     JOIN activity_class_assignments aca ON ((aca.activity_id = a.id)))
     JOIN class_members cm ON ((cm.class_id = aca.class_id)))
  WHERE ((a.id = submissions.activity_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'teacher'::text)))));


create policy "submissions_insert_policy"
on "public"."submissions"
as permissive
for insert
to public
with check (((student_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'student'::text))))));


create policy "submissions_insert_student"
on "public"."submissions"
as permissive
for insert
to public
with check ((student_id = auth.uid()));


create policy "submissions_insert_student_only"
on "public"."submissions"
as permissive
for insert
to public
with check (((student_id = auth.uid()) AND is_student()));


create policy "submissions_select_policy"
on "public"."submissions"
as permissive
for select
to public
using (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM activities
  WHERE ((activities.id = submissions.activity_id) AND (activities.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (activity_class_assignments aca
     JOIN class_members cm ON ((cm.class_id = aca.class_id)))
  WHERE ((aca.activity_id = submissions.activity_id) AND (cm.user_id = auth.uid()))))));


create policy "submissions_select_student_or_teacher"
on "public"."submissions"
as permissive
for select
to public
using (((student_id = auth.uid()) OR (activity_id IN ( SELECT a.id
   FROM activities a
  WHERE (a.created_by = auth.uid())))));


create policy "submissions_student_all"
on "public"."submissions"
as permissive
for all
to public
using ((auth.uid() = student_id));


create policy "submissions_student_own"
on "public"."submissions"
as permissive
for all
to public
using ((student_id = auth.uid()));


create policy "submissions_teacher_view"
on "public"."submissions"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM ((activities a
     JOIN activity_class_assignments aca ON ((aca.activity_id = a.id)))
     JOIN classes c ON ((c.id = aca.class_id)))
  WHERE ((a.id = submissions.activity_id) AND (c.created_by = auth.uid())))));


create policy "submissions_update_policy"
on "public"."submissions"
as permissive
for update
to public
using ((((student_id = auth.uid()) AND (status = 'draft'::text)) OR (EXISTS ( SELECT 1
   FROM activities
  WHERE ((activities.id = submissions.activity_id) AND (activities.created_by = auth.uid()))))));


create policy "submissions_update_student_or_teacher"
on "public"."submissions"
as permissive
for update
to public
using (((student_id = auth.uid()) OR (activity_id IN ( SELECT a.id
   FROM activities a
  WHERE (a.created_by = auth.uid())))));


create policy "public_read_by_token"
on "public"."teacher_invites"
as permissive
for select
to public
using ((invite_token IS NOT NULL));


create policy "school_create_invites"
on "public"."teacher_invites"
as permissive
for insert
to public
with check ((school_id = auth.uid()));


create policy "school_delete_own_invites"
on "public"."teacher_invites"
as permissive
for delete
to public
using ((school_id = auth.uid()));


create policy "school_read_own_invites"
on "public"."teacher_invites"
as permissive
for select
to public
using ((school_id = auth.uid()));


create policy "school_update_own_invites"
on "public"."teacher_invites"
as permissive
for update
to public
using ((school_id = auth.uid()))
with check ((school_id = auth.uid()));


create policy "teacher_subscriptions_delete_self"
on "public"."teacher_subscriptions"
as permissive
for delete
to public
using (((user_id = auth.uid()) OR (auth.role() = 'service_role'::text)));


create policy "teacher_subscriptions_insert_self"
on "public"."teacher_subscriptions"
as permissive
for insert
to public
with check (((user_id = auth.uid()) OR (auth.role() = 'service_role'::text)));


create policy "teacher_subscriptions_select_self"
on "public"."teacher_subscriptions"
as permissive
for select
to public
using (((user_id = auth.uid()) OR (auth.role() = 'service_role'::text)));


create policy "teacher_subscriptions_update_self"
on "public"."teacher_subscriptions"
as permissive
for update
to public
using (((user_id = auth.uid()) OR (auth.role() = 'service_role'::text)))
with check (((user_id = auth.uid()) OR (auth.role() = 'service_role'::text)));


create policy "user_achievements_self_read"
on "public"."user_achievements"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "user_achievements_self_write"
on "public"."user_achievements"
as permissive
for all
to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "system_insert_badges"
on "public"."user_badges"
as permissive
for insert
to public
with check (true);


create policy "user_badges_self_insert"
on "public"."user_badges"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "user_badges_self_read"
on "public"."user_badges"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "users_read_own_badges"
on "public"."user_badges"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "user_missions_insert_policy"
on "public"."user_missions"
as permissive
for insert
to public
with check (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['teacher'::text, 'school_admin'::text])))))));


create policy "user_missions_select_policy"
on "public"."user_missions"
as permissive
for select
to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['teacher'::text, 'school_admin'::text])))))));


create policy "user_missions_self"
on "public"."user_missions"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "user_missions_self_ins_upd"
on "public"."user_missions"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "user_missions_self_read"
on "public"."user_missions"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "user_missions_update_policy"
on "public"."user_missions"
as permissive
for update
to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['teacher'::text, 'school_admin'::text])))))));


create policy "xp_log_insert_self"
on "public"."xp_log"
as permissive
for insert
to public
with check ((user_id = auth.uid()));


create policy "xp_log_self"
on "public"."xp_log"
as permissive
for select
to public
using ((user_id = auth.uid()));


CREATE TRIGGER trg_activities_updated BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER handle_answers_updated_at BEFORE UPDATE ON public.answers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_calendar_events_updated BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_class_materials_updated BEFORE UPDATE ON public.class_materials FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER class_member_change_trigger AFTER INSERT OR DELETE OR UPDATE ON public.class_members FOR EACH ROW EXECUTE FUNCTION log_class_member_change();

CREATE TRIGGER notify_professor_new_student AFTER INSERT ON public.class_students FOR EACH ROW EXECUTE FUNCTION notify_new_student();

CREATE TRIGGER set_invite_code BEFORE INSERT ON public.classes FOR EACH ROW EXECUTE FUNCTION generate_invite_code();

CREATE TRIGGER trg_classes_updated BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_gamification_profiles_updated BEFORE UPDATE ON public.gamification_profiles FOR EACH ROW EXECUTE FUNCTION set_gamification_profiles_updated_at();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_auto_create_school AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION auto_create_school_for_school_user();

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER reward_settings_updated_at BEFORE UPDATE ON public.reward_settings FOR EACH ROW EXECUTE FUNCTION update_reward_settings_updated_at();

CREATE TRIGGER trg_schools_updated BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_submissions_updated BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_set_plagiarism_status BEFORE INSERT ON public.submissions FOR EACH ROW EXECUTE FUNCTION set_submission_plagiarism_status();

CREATE TRIGGER teacher_invites_updated_at BEFORE UPDATE ON public.teacher_invites FOR EACH ROW EXECUTE FUNCTION update_teacher_invites_updated_at();

CREATE TRIGGER trg_teacher_subscriptions_updated BEFORE UPDATE ON public.teacher_subscriptions FOR EACH ROW EXECUTE FUNCTION set_teacher_subscriptions_updated_at();


CREATE TRIGGER on_auth_user_created AFTER INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER trg_initialize_student_gamification AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION initialize_student_gamification();


  create policy "Students can delete their draft submission files"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'submissions'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Students can read published activity files"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'activities'::text) AND (EXISTS ( SELECT 1
   FROM ((activities a
     JOIN activity_class_assignments aca ON ((aca.activity_id = a.id)))
     JOIN class_members cm ON ((cm.class_id = aca.class_id)))
  WHERE ((cm.user_id = auth.uid()) AND (cm.role = 'student'::text) AND (a.status = 'published'::text))))));



  create policy "Students can read their own submission files"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'submissions'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Students can upload submission files"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'submissions'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Teachers can delete their activity files"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'activities'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Teachers can read activity files"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'activities'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM ((activities a
     JOIN activity_class_assignments aca ON ((aca.activity_id = a.id)))
     JOIN class_members cm ON ((cm.class_id = aca.class_id)))
  WHERE (cm.user_id = auth.uid()))))));



  create policy "Teachers can read submission files from their classes"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'submissions'::text) AND (EXISTS ( SELECT 1
   FROM (((submissions s
     JOIN activities a ON ((a.id = s.activity_id)))
     JOIN activity_class_assignments aca ON ((aca.activity_id = a.id)))
     JOIN class_members cm ON ((cm.class_id = aca.class_id)))
  WHERE ((cm.user_id = auth.uid()) AND (cm.role = 'teacher'::text))))));



  create policy "Teachers can upload activity files"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'activities'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can manage their draft files"
  on "storage"."objects"
  as permissive
  for all
  to authenticated
using (((bucket_id = 'drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
with check (((bucket_id = 'drafts'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



