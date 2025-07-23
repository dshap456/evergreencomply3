-- Setup Test Data for Course Progress Tracking
-- This script creates a complete test scenario with courses, enrollments, and progress

-- ========================================
-- STEP 1: Ensure the test course exists
-- ========================================

-- First, check if we have the test account
DO $$
DECLARE
    v_account_id UUID;
    v_test_course_id UUID := 'f47ac10b-58cc-4372-a567-0e02b2c3d485';
    v_test_user_id UUID := '31a03e74-1639-45b6-bfa7-77447f1a4762'; -- test@makerkit.dev
    v_member_user_id UUID := '6b83d656-e4ab-48e3-a062-c0c54a427368'; -- member@makerkit.dev
BEGIN
    -- Get the Makerkit test account
    SELECT id INTO v_account_id
    FROM public.accounts
    WHERE slug = 'makerkit'
    LIMIT 1;

    IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'Test account not found. Please run the seed data first.';
    END IF;

    -- Ensure the test course exists
    INSERT INTO public.courses (
        id,
        account_id,
        title,
        description,
        is_published,
        sequential_completion,
        passing_score,
        created_by
    ) VALUES (
        v_test_course_id,
        v_account_id,
        'Test Course for Progress Tracking',
        'This course is used to test enrollment and progress tracking functionality',
        true,
        false, -- Allow non-sequential completion for easier testing
        80,
        v_test_user_id
    )
    ON CONFLICT (id) DO UPDATE SET
        account_id = v_account_id,
        is_published = true,
        title = 'Test Course for Progress Tracking';

    -- Create modules if they don't exist
    INSERT INTO public.course_modules (
        id,
        course_id,
        title,
        description,
        order_index
    ) VALUES 
    (
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        v_test_course_id,
        'Module 1: Getting Started',
        'Introduction to the course',
        1
    ),
    (
        'f47ac10b-58cc-4372-a567-0e02b2c3d482',
        v_test_course_id,
        'Module 2: Core Concepts',
        'Main course content',
        2
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create lessons if they don't exist
    INSERT INTO public.lessons (
        id,
        module_id,
        title,
        description,
        content_type,
        order_index,
        content
    ) VALUES 
    -- Module 1 lessons
    (
        'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'Lesson 1.1: Welcome',
        'Course introduction',
        'text',
        1,
        'Welcome to the test course!'
    ),
    (
        'f47ac10b-58cc-4372-a567-0e02b2c3d481',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'Lesson 1.2: Setup',
        'Getting your environment ready',
        'text',
        2,
        'This lesson covers the setup process.'
    ),
    -- Module 2 lessons
    (
        'f47ac10b-58cc-4372-a567-0e02b2c3d483',
        'f47ac10b-58cc-4372-a567-0e02b2c3d482',
        'Lesson 2.1: Basic Concepts',
        'Understanding the fundamentals',
        'video',
        1,
        NULL
    ),
    (
        'f47ac10b-58cc-4372-a567-0e02b2c3d484',
        'f47ac10b-58cc-4372-a567-0e02b2c3d482',
        'Lesson 2.2: Knowledge Check',
        'Quiz to test your understanding',
        'quiz',
        2,
        NULL
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create enrollments for test users
    INSERT INTO public.course_enrollments (
        user_id,
        course_id,
        enrolled_at,
        progress_percentage
    ) VALUES 
    (
        v_test_user_id,
        v_test_course_id,
        NOW() - INTERVAL '5 days',
        0
    ),
    (
        v_member_user_id,
        v_test_course_id,
        NOW() - INTERVAL '3 days',
        0
    )
    ON CONFLICT (user_id, course_id) DO NOTHING;

    RAISE NOTICE 'Test course and enrollments created successfully!';
END $$;

-- ========================================
-- STEP 2: Create various progress scenarios
-- ========================================

-- Scenario 1: test@makerkit.dev has completed 2 out of 4 lessons (50% progress)
INSERT INTO public.lesson_progress (
    user_id,
    lesson_id,
    status,
    completed_at,
    time_spent
) VALUES 
(
    '31a03e74-1639-45b6-bfa7-77447f1a4762', -- test@makerkit.dev
    'f47ac10b-58cc-4372-a567-0e02b2c3d480', -- Lesson 1.1
    'completed',
    NOW() - INTERVAL '4 days',
    300
),
(
    '31a03e74-1639-45b6-bfa7-77447f1a4762',
    'f47ac10b-58cc-4372-a567-0e02b2c3d481', -- Lesson 1.2
    'completed',
    NOW() - INTERVAL '3 days',
    450
),
(
    '31a03e74-1639-45b6-bfa7-77447f1a4762',
    'f47ac10b-58cc-4372-a567-0e02b2c3d483', -- Lesson 2.1
    'in_progress',
    NULL,
    120
)
ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    status = EXCLUDED.status,
    completed_at = EXCLUDED.completed_at,
    time_spent = EXCLUDED.time_spent;

-- Scenario 2: member@makerkit.dev has completed 1 out of 4 lessons (25% progress)
INSERT INTO public.lesson_progress (
    user_id,
    lesson_id,
    status,
    completed_at,
    time_spent
) VALUES 
(
    '6b83d656-e4ab-48e3-a062-c0c54a427368', -- member@makerkit.dev
    'f47ac10b-58cc-4372-a567-0e02b2c3d480', -- Lesson 1.1
    'completed',
    NOW() - INTERVAL '2 days',
    240
),
(
    '6b83d656-e4ab-48e3-a062-c0c54a427368',
    'f47ac10b-58cc-4372-a567-0e02b2c3d481', -- Lesson 1.2
    'in_progress',
    NULL,
    60
)
ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    status = EXCLUDED.status,
    completed_at = EXCLUDED.completed_at,
    time_spent = EXCLUDED.time_spent;

-- ========================================
-- STEP 3: Update enrollment progress percentages
-- ========================================

-- This simulates what should happen automatically when lessons are completed
UPDATE public.course_enrollments ce
SET progress_percentage = (
    SELECT ROUND(
        COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.status = 'completed')::numeric / 
        COUNT(DISTINCT l.id)::numeric * 100
    )
    FROM public.course_modules cm
    JOIN public.lessons l ON l.module_id = cm.id
    LEFT JOIN public.lesson_progress lp ON lp.lesson_id = l.id 
        AND lp.user_id = ce.user_id 
        AND lp.status = 'completed'
    WHERE cm.course_id = ce.course_id
)
WHERE ce.course_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d485';

-- ========================================
-- STEP 4: Verify the test data
-- ========================================

SELECT '==== TEST DATA SUMMARY ====' as section;

-- Show course structure
SELECT 'Course Structure:' as info;
SELECT 
    cm.title as module,
    l.title as lesson,
    l.content_type as type
FROM public.course_modules cm
JOIN public.lessons l ON l.module_id = cm.id
WHERE cm.course_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d485'
ORDER BY cm.order_index, l.order_index;

-- Show enrollments and progress
SELECT 'User Progress:' as info;
SELECT 
    u.email,
    ce.progress_percentage || '%' as enrollment_progress,
    COUNT(lp.id) FILTER (WHERE lp.status = 'completed') as completed_lessons,
    COUNT(lp.id) FILTER (WHERE lp.status = 'in_progress') as in_progress_lessons,
    4 - COUNT(lp.id) as not_started_lessons
FROM public.course_enrollments ce
JOIN auth.users u ON u.id = ce.user_id
LEFT JOIN public.lesson_progress lp ON lp.user_id = ce.user_id 
    AND lp.lesson_id IN (
        SELECT l.id 
        FROM public.lessons l
        JOIN public.course_modules cm ON cm.id = l.module_id
        WHERE cm.course_id = ce.course_id
    )
WHERE ce.course_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d485'
GROUP BY u.email, ce.progress_percentage;

-- Show detailed lesson progress
SELECT 'Detailed Lesson Progress:' as info;
SELECT 
    u.email,
    l.title as lesson,
    COALESCE(lp.status, 'not_started') as status,
    lp.time_spent as seconds_spent,
    lp.completed_at
FROM public.course_enrollments ce
CROSS JOIN (
    SELECT l.id, l.title 
    FROM public.lessons l
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d485'
) l
JOIN auth.users u ON u.id = ce.user_id
LEFT JOIN public.lesson_progress lp ON lp.user_id = ce.user_id AND lp.lesson_id = l.id
WHERE ce.course_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d485'
ORDER BY u.email, l.title;