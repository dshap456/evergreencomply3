-- Fix lesson_progress unique constraint to be language-agnostic
-- This ensures progress tracking works across languages and resume logic functions correctly

-- First, drop the incorrect constraint that includes language
ALTER TABLE public.lesson_progress
DROP CONSTRAINT IF EXISTS lesson_progress_user_id_lesson_id_language_key;

-- Restore the original constraint without language
-- This allows only one progress record per user per lesson regardless of language
ALTER TABLE public.lesson_progress
ADD CONSTRAINT lesson_progress_user_id_lesson_id_key
UNIQUE(user_id, lesson_id);

-- Note: The language column can remain in the table for historical data,
-- but it should not be part of the unique constraint or used in queries