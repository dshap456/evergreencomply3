/*
 * -------------------------------------------------------
 * Section: Course Progress Functions
 * Functions to update course completion progress
 * -------------------------------------------------------
 */

-- Function to update course progress when a lesson is completed
CREATE OR REPLACE FUNCTION public.update_course_progress(
    p_user_id UUID,
    p_lesson_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
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

    -- Get total number of lessons in the course
    SELECT COUNT(*) INTO v_total_lessons
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = v_course_id;

    -- Get number of completed lessons for this user
    SELECT COUNT(*) INTO v_completed_lessons
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id = lp.lesson_id
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = v_course_id
    AND lp.user_id = p_user_id
    AND lp.status = 'completed';

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
                WHEN v_progress_percentage >= 100 THEN NOW()
                ELSE completed_at
            END
        WHERE id = v_enrollment_id;
    END IF;

    -- Log the progress update
    RAISE LOG 'Course progress updated for user % in course %: %% complete (%/%)', 
        p_user_id, v_course_id, v_progress_percentage, v_completed_lessons, v_total_lessons;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_course_progress(UUID, UUID) TO authenticated;

-- Function to check if a lesson is accessible to a user
CREATE OR REPLACE FUNCTION public.is_lesson_accessible(
    p_user_id UUID,
    p_lesson_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_course_id UUID;
    v_is_enrolled BOOLEAN;
    v_lesson_order INTEGER;
    v_previous_lessons_completed INTEGER;
    v_sequential_completion BOOLEAN;
    v_total_previous_lessons INTEGER;
BEGIN
    -- Get course info and lesson order
    SELECT c.id, c.sequential_completion, l.order_index
    INTO v_course_id, v_sequential_completion, v_lesson_order
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    JOIN public.courses c ON c.id = cm.course_id
    WHERE l.id = p_lesson_id;

    IF v_course_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user is enrolled
    SELECT EXISTS(
        SELECT 1 FROM public.course_enrollments
        WHERE user_id = p_user_id AND course_id = v_course_id
    ) INTO v_is_enrolled;

    IF NOT v_is_enrolled THEN
        RETURN FALSE;
    END IF;

    -- If sequential completion is disabled, all lessons are accessible
    IF NOT v_sequential_completion THEN
        RETURN TRUE;
    END IF;

    -- For sequential completion, check if all previous lessons are completed
    SELECT COUNT(*)
    INTO v_previous_lessons_completed
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id = lp.lesson_id
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = v_course_id
    AND lp.user_id = p_user_id
    AND lp.status = 'completed'
    AND l.order_index < v_lesson_order;

    -- Count total previous lessons
    SELECT COUNT(*)
    INTO v_total_previous_lessons
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = v_course_id
    AND l.order_index < v_lesson_order;

    -- Lesson is accessible if all previous lessons are completed
    RETURN v_previous_lessons_completed >= v_total_previous_lessons;
END;
$$;