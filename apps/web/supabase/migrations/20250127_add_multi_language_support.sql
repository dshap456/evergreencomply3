-- Add multi-language support to LMS tables

-- Add language enum type
CREATE TYPE language_code AS ENUM ('en', 'es');

-- Add language to course_modules
ALTER TABLE public.course_modules 
ADD COLUMN language language_code DEFAULT 'en' NOT NULL;

-- Add language to lessons
ALTER TABLE public.lessons 
ADD COLUMN language language_code DEFAULT 'en' NOT NULL;

-- Add language to quiz_questions
ALTER TABLE public.quiz_questions 
ADD COLUMN language language_code DEFAULT 'en' NOT NULL;

-- Add language to lesson_progress to track progress per language
ALTER TABLE public.lesson_progress 
ADD COLUMN language language_code DEFAULT 'en' NOT NULL;

-- Add language to quiz_attempts
ALTER TABLE public.quiz_attempts 
ADD COLUMN language language_code DEFAULT 'en' NOT NULL;

-- Update unique constraints to include language
-- Drop existing unique constraint on course_modules
ALTER TABLE public.course_modules 
DROP CONSTRAINT IF EXISTS course_modules_course_id_order_index_key;

-- Add new unique constraint including language
ALTER TABLE public.course_modules 
ADD CONSTRAINT course_modules_course_id_language_order_index_key 
UNIQUE(course_id, language, order_index);

-- Drop existing unique constraint on lessons
ALTER TABLE public.lessons 
DROP CONSTRAINT IF EXISTS lessons_module_id_order_index_key;

-- Add new unique constraint including language  
ALTER TABLE public.lessons
ADD CONSTRAINT lessons_module_id_order_index_key 
UNIQUE(module_id, order_index);

-- Update lesson_progress unique constraint
ALTER TABLE public.lesson_progress
DROP CONSTRAINT IF EXISTS lesson_progress_user_id_lesson_id_key;

ALTER TABLE public.lesson_progress
ADD CONSTRAINT lesson_progress_user_id_lesson_id_language_key
UNIQUE(user_id, lesson_id, language);

-- Create indexes for performance
CREATE INDEX idx_course_modules_language ON public.course_modules(course_id, language);
CREATE INDEX idx_lessons_language ON public.lessons(module_id, language);
CREATE INDEX idx_lesson_progress_language ON public.lesson_progress(user_id, language);

-- Add completed_language to course_enrollments to track which language was used for completion
ALTER TABLE public.course_enrollments
ADD COLUMN completed_language language_code;

-- Update RLS policies to respect language in queries (existing policies should still work)

-- Function to check if user has completed course in any language
CREATE OR REPLACE FUNCTION public.has_completed_course_any_language(
    p_user_id UUID,
    p_course_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM course_enrollments 
        WHERE user_id = p_user_id 
        AND course_id = p_course_id 
        AND completed_at IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;