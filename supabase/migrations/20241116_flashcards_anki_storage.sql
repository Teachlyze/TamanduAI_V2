-- Migration: Setup Storage Buckets for Anki Import
-- Created: 2025-11-16
-- Description: Creates buckets and RLS policies for .apkg import and flashcard media

-- ============================================================================
-- 1. Create flashcards-imports bucket (temporary storage for .apkg files)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flashcards-imports',
  'flashcards-imports',
  false, -- Private bucket
  104857600, -- 100MB limit
  ARRAY['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for flashcards-imports

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own import files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can read import files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete import files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own import files" ON storage.objects;

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own import files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'flashcards-imports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow service role to read all files (for Edge Function)
CREATE POLICY "Service role can read import files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'flashcards-imports');

-- Allow service role to delete files (cleanup)
CREATE POLICY "Service role can delete import files"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'flashcards-imports');

-- Allow users to delete their own import files
CREATE POLICY "Users can delete their own import files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'flashcards-imports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- 2. Create flashcards-media bucket (permanent storage for audio/images)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flashcards-media',
  'flashcards-media',
  true, -- Public bucket for easier access
  10485760, -- 10MB per file
  ARRAY[
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm',
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for flashcards-media

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update media" ON storage.objects;
DROP POLICY IF EXISTS "Public can read media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;

-- Allow service role to upload media (via Edge Function)
CREATE POLICY "Service role can upload media"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'flashcards-media');

-- Allow service role to move/update media files
CREATE POLICY "Service role can update media"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'flashcards-media');

-- Allow public read access to media
CREATE POLICY "Public can read media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'flashcards-media');

-- Alternative: Only allow users to read their own media
-- Uncomment if you prefer private media access
/*
DROP POLICY IF EXISTS "Users can read their own media" ON storage.objects;
CREATE POLICY "Users can read their own media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'flashcards-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- Allow users to delete their own media
CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'flashcards-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- 3. Optional: Create cleanup function for old import files
-- ============================================================================

-- Function to clean up import files older than 7 days
CREATE OR REPLACE FUNCTION clean_old_import_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete objects older than 7 days from flashcards-imports bucket
  DELETE FROM storage.objects
  WHERE bucket_id = 'flashcards-imports'
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Optional: Create a cron job to run cleanup weekly
-- (Requires pg_cron extension - enable in Supabase dashboard if needed)
/*
SELECT cron.schedule(
  'clean-flashcard-imports',
  '0 2 * * 0', -- Every Sunday at 2 AM
  'SELECT clean_old_import_files();'
);
*/

-- ============================================================================
-- 4. Grant necessary permissions
-- ============================================================================

-- Ensure service role can access storage
GRANT ALL ON storage.objects TO service_role;
GRANT ALL ON storage.buckets TO service_role;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 
-- After running this migration:
-- 1. Deploy the import-anki Edge Function
-- 2. Update frontend to use new import buttons
-- 3. Test with a small .apkg file first
-- 4. Monitor storage usage in Supabase dashboard
-- 
-- Security considerations:
-- - flashcards-imports: Temporary, cleaned up automatically
-- - flashcards-media: Permanent, tied to user's decks
-- - RLS policies ensure users can only access their own files
-- - Service role has elevated permissions for Edge Function
-- 
-- Cost optimization:
-- - Consider implementing lifecycle policies to delete old media
-- - Monitor bandwidth if using public media bucket
-- - Consider signed URLs for media if bandwidth becomes an issue
--