-- Clean up duplicate lesson progress records that might exist from the language-specific constraint
-- Keep only the most recently updated record for each user-lesson pair

-- First, identify and delete duplicates, keeping the most recent one
DELETE FROM public.lesson_progress a
USING public.lesson_progress b
WHERE a.user_id = b.user_id 
  AND a.lesson_id = b.lesson_id
  AND a.updated_at < b.updated_at;

-- If there are still duplicates with the same updated_at, keep the one with completed status
DELETE FROM public.lesson_progress a
USING public.lesson_progress b
WHERE a.user_id = b.user_id 
  AND a.lesson_id = b.lesson_id
  AND a.id != b.id
  AND a.status != 'completed' 
  AND b.status = 'completed';

-- Final cleanup: if there are still duplicates, keep the one with the lowest id
DELETE FROM public.lesson_progress a
USING public.lesson_progress b
WHERE a.user_id = b.user_id 
  AND a.lesson_id = b.lesson_id
  AND a.id > b.id;