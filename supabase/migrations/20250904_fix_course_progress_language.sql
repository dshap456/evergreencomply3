-- Fix the update_course_progress function to be language-aware
-- This resolves the issue where course progress resets when switching languages

-- Drop the existing function
DROP FUNCTION IF EXISTS public.update_course_progress(uuid, uuid);

-- Create new language-aware version
CREATE OR REPLACE FUNCTION public.update_course_progress(
    p_user_id uuid, 
    p_lesson_id uuid,
    p_language language_code DEFAULT 'en'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_course_id UUID;
    v_total_lessons INTEGER;
    v_completed_lessons INTEGER;
    v_progress_percentage INTEGER;
    v_enrollment_id UUID;
BEGIN
    -- Get the course ID for this lesson
    SELECT c.id INTO v_course_id
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    JOIN public.courses c ON c.id = cm.course_id
    WHERE l.id = p_lesson_id;

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Lesson not found or invalid lesson ID';
    END IF;

    -- Get total number of lessons in the course FOR THE SPECIFIC LANGUAGE
    SELECT COUNT(DISTINCT l.id) INTO v_total_lessons
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = v_course_id
    AND cm.language = p_language;

    -- Get number of completed lessons for this user IN THE SPECIFIC LANGUAGE
    SELECT COUNT(DISTINCT lp.lesson_id) INTO v_completed_lessons
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id = lp.lesson_id
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = v_course_id
    AND lp.user_id = p_user_id
    AND lp.status = 'completed'
    AND lp.language = p_language
    AND cm.language = p_language;

    -- Calculate progress percentage
    IF v_total_lessons > 0 THEN
        v_progress_percentage := (v_completed_lessons * 100) / v_total_lessons;
    ELSE
        v_progress_percentage := 0;
    END IF;

    -- Get enrollment ID
    SELECT id INTO v_enrollment_id
    FROM public.course_enrollments
    WHERE user_id = p_user_id AND course_id = v_course_id;

    -- Update course enrollment progress
    IF v_enrollment_id IS NOT NULL THEN
        UPDATE public.course_enrollments
        SET
            progress_percentage = v_progress_percentage,
            completed_at = CASE
                WHEN v_progress_percentage >= 100 AND completed_language IS NULL THEN NOW()
                WHEN v_progress_percentage >= 100 THEN completed_at
                ELSE NULL
            END,
            completed_language = CASE
                WHEN v_progress_percentage >= 100 THEN p_language
                ELSE completed_language
            END
        WHERE id = v_enrollment_id;
    END IF;

    -- Log the progress update
    RAISE LOG 'Course progress updated for user % in course % (language %): % percent complete (% out of % lessons)',
        p_user_id, v_course_id, p_language, v_progress_percentage, v_completed_lessons, v_total_lessons;
END;
$$;

-- Add comment to document the function
COMMENT ON FUNCTION public.update_course_progress(uuid, uuid, language_code) IS 
'Updates course enrollment progress percentage based on completed lessons in a specific language. 
Language parameter is required to correctly calculate progress for multi-language courses.';