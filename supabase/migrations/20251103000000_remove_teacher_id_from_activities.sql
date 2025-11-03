-- Remove teacher_id reference since it's redundant with created_by
-- Activities table already has created_by which serves the same purpose

-- This migration is just a note that we should NOT use teacher_id
-- Instead, use created_by field which already exists and is indexed
