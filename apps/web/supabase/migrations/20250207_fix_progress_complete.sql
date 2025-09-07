-- Comprehensive fix for lesson progress tracking
-- This migration handles the full cleanup of language-specific tracking

-- Step 1: Remove duplicate records per user/lesson, keeping the most recent
WITH ranked_progress AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, lesson_id 
           ORDER BY 
             CASE WHEN status = 'completed' THEN 0 ELSE 1 END,  -- Prefer completed
             updated_at DESC,  -- Then most recent
             id  -- Finally by ID for consistency
         ) as rn
  FROM public.lesson_progress
)
DELETE FROM public.lesson_progress
WHERE id IN (
  SELECT id FROM ranked_progress WHERE rn > 1
);

-- Step 2: Drop the incorrect constraint if it exists
ALTER TABLE public.lesson_progress
DROP CONSTRAINT IF EXISTS lesson_progress_user_id_lesson_id_language_key;

-- Step 3: Drop the old unique constraint if it exists
ALTER TABLE public.lesson_progress
DROP CONSTRAINT IF EXISTS lesson_progress_user_id_lesson_id_key;

-- Step 4: Add the correct constraint
ALTER TABLE public.lesson_progress
ADD CONSTRAINT lesson_progress_user_id_lesson_id_key
UNIQUE(user_id, lesson_id);

-- Step 5: Update the last_accessed column to match updated_at if it exists
-- This ensures consistency for any code still reading last_accessed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lesson_progress' 
    AND column_name = 'last_accessed'
  ) THEN
    UPDATE public.lesson_progress
    SET last_accessed = updated_at
    WHERE last_accessed IS NULL OR last_accessed != updated_at;
  END IF;
END $$;

-- Step 6: Clean up course_enrollments table
-- Remove the language-specific column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_enrollments' 
    AND column_name = 'current_lesson_language'
  ) THEN
    ALTER TABLE public.course_enrollments
    DROP COLUMN current_lesson_language;
  END IF;
END $$;

-- Note: We're keeping the language column in lesson_progress for historical purposes
-- but it should not be used in queries going forward