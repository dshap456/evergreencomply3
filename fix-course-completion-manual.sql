-- MANUAL SQL FIX FOR COURSE COMPLETION AND QUIZ SCORES
-- Run this in your Supabase SQL Editor

-- 1. First check if functions exist and what's happening
SELECT COUNT(*) as enrollment_count,
       SUM(CASE WHEN progress_percentage = 100 THEN 1 ELSE 0 END) as completed_count,
       SUM(CASE WHEN final_score IS NOT NULL THEN 1 ELSE 0 END) as has_score_count
FROM course_enrollments;

SELECT COUNT(*) as completion_records
FROM course_completions;

-- 2. Create or replace the complete_course function
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
    v_total_lessons INTEGER;
    v_completed_count INTEGER;
    v_final_score DECIMAL(5,2);
    v_final_passed BOOLEAN;
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
    -- Count total lessons in the course
    SELECT COUNT(*) INTO v_total_lessons
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = p_course_id;
    
    -- Count completed lessons
    SELECT COUNT(*) INTO v_completed_count
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
        v_progress := ROUND((v_completed_count::DECIMAL / v_total_lessons::DECIMAL) * 100);
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
        SELECT * INTO v_final_quiz_attempt
        FROM public.quiz_attempts
        WHERE user_id = p_user_id AND lesson_id = v_final_quiz_lesson
        ORDER BY score DESC, created_at DESC
        LIMIT 1;
    END IF;
    
    -- Use final_score from enrollment if no quiz attempt found
    v_final_score := COALESCE(v_final_quiz_attempt.score, v_enrollment.final_score, NULL);
    v_final_passed := COALESCE(v_final_quiz_attempt.passed, 
                               CASE WHEN v_enrollment.final_score IS NOT NULL 
                                    THEN v_enrollment.final_score >= 80 
                                    ELSE false END, 
                               false);
    
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
        v_final_score,
        v_final_passed,
        GREATEST(v_progress, COALESCE(v_enrollment.progress_percentage, 0)),
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
        completed_at = COALESCE(completed_at, NOW()),
        final_score = v_final_score,
        progress_percentage = GREATEST(v_progress, COALESCE(progress_percentage, 0))
    WHERE id = v_enrollment.id;
    
    RETURN v_completion;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.complete_course(UUID, UUID) TO authenticated;

-- 4. Create completion records for any courses at 100% that don't have them
DO $$
DECLARE
    enrollment RECORD;
    completion_result public.course_completions;
BEGIN
    FOR enrollment IN 
        SELECT DISTINCT ce.user_id, ce.course_id, ce.final_score
        FROM public.course_enrollments ce
        WHERE (ce.progress_percentage = 100 OR ce.final_score IS NOT NULL)
        AND NOT EXISTS (
            SELECT 1 FROM public.course_completions cc 
            WHERE cc.user_id = ce.user_id 
            AND cc.course_id = ce.course_id
        )
    LOOP
        BEGIN
            -- Try to create completion record
            completion_result := public.complete_course(enrollment.user_id, enrollment.course_id);
            RAISE NOTICE 'Created completion for user % course %', enrollment.user_id, enrollment.course_id;
        EXCEPTION WHEN OTHERS THEN
            -- Skip if completion fails
            RAISE NOTICE 'Could not create completion for user % course %: %', 
                        enrollment.user_id, enrollment.course_id, SQLERRM;
            CONTINUE;
        END;
    END LOOP;
END $$;

-- 5. Check results
SELECT 
    ce.user_id,
    ce.course_id,
    ce.progress_percentage,
    ce.final_score as enrollment_score,
    cc.final_quiz_score as completion_score,
    cc.final_quiz_passed,
    cc.completed_at
FROM course_enrollments ce
LEFT JOIN course_completions cc ON cc.user_id = ce.user_id AND cc.course_id = ce.course_id
WHERE ce.progress_percentage = 100 OR ce.final_score IS NOT NULL
ORDER BY ce.completed_at DESC;

-- 6. Debug: Check what quiz attempts exist
SELECT 
    qa.user_id,
    qa.lesson_id,
    qa.score,
    qa.passed,
    l.title as lesson_title,
    l.is_final_quiz
FROM quiz_attempts qa
JOIN lessons l ON l.id = qa.lesson_id
WHERE l.is_final_quiz = true
ORDER BY qa.created_at DESC;

-- 7. If you see enrollments with final_score but no completions, manually create them:
-- SELECT complete_course(user_id, course_id) FROM course_enrollments WHERE final_score IS NOT NULL;