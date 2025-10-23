-- Migration: Create logger table for application logging
-- Date: 2025-01-19
-- Purpose: Track all application logs in database instead of just console

-- Create logger table
CREATE TABLE IF NOT EXISTS public.logger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_stack TEXT,
  error_name TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.logger IS 'Application logs for monitoring and debugging';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_logger_level ON public.logger(level);
CREATE INDEX IF NOT EXISTS idx_logger_user_id ON public.logger(user_id);
CREATE INDEX IF NOT EXISTS idx_logger_created_at ON public.logger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logger_level_created_at ON public.logger(level, created_at DESC);

-- Enable RLS
ALTER TABLE public.logger ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can read all logs
CREATE POLICY "admins_read_all_logs"
ON public.logger
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Users can read their own logs
CREATE POLICY "users_read_own_logs"
ON public.logger
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can insert logs
CREATE POLICY "authenticated_insert_logs"
ON public.logger
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Anonymous users can insert logs (for pre-login errors)
CREATE POLICY "anonymous_insert_logs"
ON public.logger
FOR INSERT
TO anon
WITH CHECK (true);

-- Only admins can delete logs
CREATE POLICY "admins_delete_logs"
ON public.logger
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- Function to auto-clean old logs (keep last 90 days)
CREATE OR REPLACE FUNCTION public.clean_old_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

COMMENT ON FUNCTION public.clean_old_logs IS 'Deletes logs older than 90 days. Returns number of deleted rows.';

-- Optional: Create a scheduled job to clean logs weekly
-- (requires pg_cron extension - uncomment if available)
-- SELECT cron.schedule(
--   'clean-old-logs',
--   '0 2 * * 0',  -- Every Sunday at 2 AM
--   $$SELECT clean_old_logs()$$
-- );
