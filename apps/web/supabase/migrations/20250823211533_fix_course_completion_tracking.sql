-- Fix course completion tracking and quiz score reporting
-- This migration ensures the complete_course function exists and works properly

-- First, ensure the complete_course function exists
CREATE OR REPLACE FUNCTION public.complete_course(
    p_user_id UUID,
    p_course_id UUID
) RETURNS public.course_completions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_enrollment public.course_enrollments;
    v_course public.courses;
    v_user_profile RECORD;
    v_final_quiz_lesson UUID;
    v_final_quiz_attempt public.quiz_attempts;
    v_completion public.course_completions;
    v_progress INTEGER;
BEGIN
    -- Get enrollment info
    SELECT * INTO v_enrollment
    FROM public.course_enrollments
    WHERE user_id = p_user_id AND course_id = p_course_id;
    
    IF v_enrollment IS NULL THEN
        RAISE EXCEPTION 'User is not enrolled in this course';
    END IF;
    
    -- Get course info
    SELECT * INTO v_course
    FROM public.courses
    WHERE id = p_course_id;
    
    -- Get user profile info
    SELECT 
        COALESCE(u.raw_user_meta_data->>'name', u.email) as name,
        u.email
    INTO v_user_profile
    FROM auth.users u
    WHERE u.id = p_user_id;
    
    -- Calculate current progress
    v_progress := public.calculate_course_progress(p_user_id, p_course_id);
    
    -- Only complete if progress is 100%
    IF v_progress < 100 THEN
        RAISE EXCEPTION 'Course not fully completed. Progress: %', v_progress;
    END IF;
    
    -- Find final quiz lesson
    SELECT l.id INTO v_final_quiz_lesson
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = p_course_id 
    AND l.is_final_quiz = true
    ORDER BY cm.order_index DESC, l.order_index DESC
    LIMIT 1;
    
    -- Get final quiz attempt if exists
    IF v_final_quiz_lesson IS NOT NULL THEN
        v_final_quiz_attempt := public.get_best_quiz_attempt(p_user_id, v_final_quiz_lesson);
    END IF;
    
    -- Create or update completion record
    INSERT INTO public.course_completions (
        user_id,
        course_id,
        enrollment_id,
        student_name,
        student_email,
        course_name,
        final_quiz_score,
        final_quiz_passed,
        completion_percentage,
        completed_at
    ) VALUES (
        p_user_id,
        p_course_id,
        v_enrollment.id,
        v_user_profile.name,
        v_user_profile.email,
        v_course.title,
        COALESCE(v_final_quiz_attempt.score, v_enrollment.final_score, NULL),
        COALESCE(v_final_quiz_attempt.passed, v_enrollment.final_score >= 80, false),
        v_progress,
        NOW()
    )
    ON CONFLICT (user_id, course_id) 
    DO UPDATE SET
        final_quiz_score = EXCLUDED.final_quiz_score,
        final_quiz_passed = EXCLUDED.final_quiz_passed,
        completion_percentage = EXCLUDED.completion_percentage,
        completed_at = EXCLUDED.completed_at
    RETURNING * INTO v_completion;
    
    -- Update enrollment as completed
    UPDATE public.course_enrollments
    SET 
        completed_at = NOW(),
        final_score = COALESCE(v_final_quiz_attempt.score, v_enrollment.final_score, NULL),
        progress_percentage = v_progress
    WHERE id = v_enrollment.id;
    
    RETURN v_completion;
END;
$$;

-- Ensure the calculate_course_progress function exists
CREATE OR REPLACE FUNCTION public.calculate_course_progress(
    p_user_id UUID,
    p_course_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_total_lessons INTEGER;
    v_completed_lessons INTEGER;
    v_progress INTEGER;
BEGIN
    -- Count total lessons in the course
    SELECT COUNT(*) INTO v_total_lessons
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = p_course_id;
    
    -- Count completed lessons
    SELECT COUNT(*) INTO v_completed_lessons
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    JOIN public.lesson_progress lp ON lp.lesson_id = l.id
    WHERE cm.course_id = p_course_id
    AND lp.user_id = p_user_id
    AND lp.status = 'completed';
    
    -- Calculate percentage
    IF v_total_lessons = 0 THEN
        v_progress := 0;
    ELSE
        v_progress := ROUND((v_completed_lessons::DECIMAL / v_total_lessons::DECIMAL) * 100);
    END IF;
    
    -- Update enrollment progress
    UPDATE public.course_enrollments
    SET progress_percentage = v_progress,
        updated_at = NOW()
    WHERE user_id = p_user_id AND course_id = p_course_id;
    
    RETURN v_progress;
END;
$$;

-- Ensure the get_best_quiz_attempt function exists
CREATE OR REPLACE FUNCTION public.get_best_quiz_attempt(
    p_user_id UUID,
    p_lesson_id UUID
) RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
    v_attempt public.quiz_attempts;
BEGIN
    SELECT * INTO v_attempt
    FROM public.quiz_attempts
    WHERE user_id = p_user_id AND lesson_id = p_lesson_id
    ORDER BY score DESC, created_at DESC
    LIMIT 1;
    
    RETURN v_attempt;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.complete_course(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_course_progress(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_best_quiz_attempt(UUID, UUID) TO authenticated;

-- Fix any existing completed courses that don't have completion records
-- This will create completion records for courses at 100% progress
DO $$
DECLARE
    enrollment RECORD;
BEGIN
    FOR enrollment IN 
        SELECT DISTINCT ce.user_id, ce.course_id 
        FROM public.course_enrollments ce
        WHERE ce.progress_percentage = 100 
        AND ce.completed_at IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM public.course_completions cc 
            WHERE cc.user_id = ce.user_id 
            AND cc.course_id = ce.course_id
        )
    LOOP
        BEGIN
            PERFORM public.complete_course(enrollment.user_id, enrollment.course_id);
        EXCEPTION WHEN OTHERS THEN
            -- Skip if completion fails (e.g., missing data)
            CONTINUE;
        END;
    END LOOP;
END $$;

-- Add a trigger to auto-complete courses when they reach 100% progress
CREATE OR REPLACE FUNCTION public.auto_complete_course_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- If progress reached 100% and wasn't 100% before
    IF NEW.progress_percentage = 100 AND 
       (OLD.progress_percentage IS NULL OR OLD.progress_percentage < 100) THEN
        -- Try to create completion record
        BEGIN
            PERFORM public.complete_course(NEW.user_id, NEW.course_id);
        EXCEPTION WHEN OTHERS THEN
            -- Log but don't fail the update
            RAISE WARNING 'Could not auto-complete course: %', SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS auto_complete_course ON public.course_enrollments;
CREATE TRIGGER auto_complete_course
    AFTER UPDATE OF progress_percentage ON public.course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_complete_course_trigger();