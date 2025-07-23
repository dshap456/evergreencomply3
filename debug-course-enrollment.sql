-- Debug Course Enrollment and Progress Tracking
-- This script helps identify existing test data and create new test data if needed

-- ========================================
-- SECTION 1: CHECK EXISTING DATA
-- ========================================

-- 1.1 Check existing courses and their structure
SELECT '==== EXISTING COURSES ====' as section;
SELECT 
    c.id as course_id,
    c.title,
    c.account_id,
    c.is_published,
    c.sequential_completion,
    c.passing_score,
    COUNT(DISTINCT cm.id) as module_count,
    COUNT(DISTINCT l.id) as lesson_count,
    c.created_at
FROM public.courses c
LEFT JOIN public.course_modules cm ON cm.course_id = c.id
LEFT JOIN public.lessons l ON l.module_id = cm.id
GROUP BY c.id, c.title, c.account_id, c.is_published, c.sequential_completion, c.passing_score, c.created_at
ORDER BY c.created_at DESC;

-- 1.2 Check for the test course with known UUID
SELECT '==== TEST COURSE DETAILS ====' as section;
SELECT 
    c.id,
    c.title,
    c.is_published,
    a.name as account_name,
    a.slug as account_slug
FROM public.courses c
JOIN public.accounts a ON a.id = c.account_id
WHERE c.id = 'f47ac10b-58cc-4372-a567-0e02b2c3d485';

-- 1.3 Check existing users who could be enrolled
SELECT '==== AVAILABLE USERS ====' as section;
SELECT 
    u.id as user_id,
    u.email,
    u.raw_user_meta_data->>'name' as name,
    CASE 
        WHEN u.email IN ('test@makerkit.dev', 'member@makerkit.dev', 'custom@makerkit.dev') 
        THEN 'Test User' 
        ELSE 'Regular User' 
    END as user_type
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 10;

-- 1.4 Check existing enrollments
SELECT '==== EXISTING ENROLLMENTS ====' as section;
SELECT 
    ce.id as enrollment_id,
    u.email as user_email,
    c.title as course_title,
    ce.enrolled_at,
    ce.completed_at,
    ce.progress_percentage,
    ce.final_score
FROM public.course_enrollments ce
JOIN auth.users u ON u.id = ce.user_id
JOIN public.courses c ON c.id = ce.course_id
ORDER BY ce.enrolled_at DESC;

-- 1.5 Check lesson progress tracking
SELECT '==== LESSON PROGRESS ====' as section;
SELECT 
    u.email as user_email,
    c.title as course_title,
    l.title as lesson_title,
    lp.status,
    lp.completed_at,
    lp.time_spent as time_spent_seconds,
    lp.updated_at
FROM public.lesson_progress lp
JOIN auth.users u ON u.id = lp.user_id
JOIN public.lessons l ON l.id = lp.lesson_id
JOIN public.course_modules cm ON cm.id = l.module_id
JOIN public.courses c ON c.id = cm.course_id
ORDER BY lp.updated_at DESC
LIMIT 20;

-- 1.6 Check course completions
SELECT '==== COURSE COMPLETIONS ====' as section;
SELECT 
    cc.id as completion_id,
    cc.student_email,
    cc.course_name,
    cc.final_quiz_score,
    cc.final_quiz_passed,
    cc.completion_percentage,
    cc.completed_at
FROM public.course_completions cc
ORDER BY cc.completed_at DESC;

-- ========================================
-- SECTION 2: CREATE TEST DATA IF NEEDED
-- ========================================

-- 2.1 Create a test enrollment for the test course
-- Uncomment and modify the user_id to create an enrollment

/*
-- Option A: Enroll test@makerkit.dev in the test course
INSERT INTO public.course_enrollments (
    user_id,
    course_id,
    enrolled_at,
    progress_percentage
) VALUES (
    '31a03e74-1639-45b6-bfa7-77447f1a4762', -- test@makerkit.dev
    'f47ac10b-58cc-4372-a567-0e02b2c3d485', -- Test Course for Video Upload
    NOW(),
    0
)
ON CONFLICT (user_id, course_id) DO UPDATE
SET 
    enrolled_at = EXCLUDED.enrolled_at,
    progress_percentage = EXCLUDED.progress_percentage;
*/

/*
-- Option B: Enroll member@makerkit.dev in the test course
INSERT INTO public.course_enrollments (
    user_id,
    course_id,
    enrolled_at,
    progress_percentage
) VALUES (
    '6b83d656-e4ab-48e3-a062-c0c54a427368', -- member@makerkit.dev
    'f47ac10b-58cc-4372-a567-0e02b2c3d485', -- Test Course for Video Upload
    NOW(),
    0
)
ON CONFLICT (user_id, course_id) DO UPDATE
SET 
    enrolled_at = EXCLUDED.enrolled_at,
    progress_percentage = EXCLUDED.progress_percentage;
*/

-- 2.2 Create some lesson progress for testing
-- Uncomment and modify to create progress records

/*
-- Create progress for the first lesson
INSERT INTO public.lesson_progress (
    user_id,
    lesson_id,
    status,
    completed_at,
    time_spent
) VALUES (
    '31a03e74-1639-45b6-bfa7-77447f1a4762', -- test@makerkit.dev
    'f47ac10b-58cc-4372-a567-0e02b2c3d480', -- Welcome to the Course lesson
    'completed',
    NOW() - INTERVAL '1 hour',
    300 -- 5 minutes
)
ON CONFLICT (user_id, lesson_id) DO UPDATE
SET 
    status = EXCLUDED.status,
    completed_at = EXCLUDED.completed_at,
    time_spent = lesson_progress.time_spent + EXCLUDED.time_spent;

-- Create progress for the second lesson
INSERT INTO public.lesson_progress (
    user_id,
    lesson_id,
    status,
    time_spent
) VALUES (
    '31a03e74-1639-45b6-bfa7-77447f1a4762', -- test@makerkit.dev
    'f47ac10b-58cc-4372-a567-0e02b2c3d481', -- Setting Up Your Environment lesson
    'in_progress',
    120 -- 2 minutes
)
ON CONFLICT (user_id, lesson_id) DO UPDATE
SET 
    status = EXCLUDED.status,
    time_spent = lesson_progress.time_spent + EXCLUDED.time_spent;
*/

-- ========================================
-- SECTION 3: VERIFY COURSE PROGRESS CALCULATION
-- ========================================

-- 3.1 Calculate actual progress for enrolled users
SELECT '==== CALCULATED COURSE PROGRESS ====' as section;
WITH course_lesson_counts AS (
    SELECT 
        c.id as course_id,
        COUNT(DISTINCT l.id) as total_lessons
    FROM public.courses c
    JOIN public.course_modules cm ON cm.course_id = c.id
    JOIN public.lessons l ON l.module_id = cm.id
    GROUP BY c.id
),
user_progress AS (
    SELECT 
        ce.user_id,
        ce.course_id,
        COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.status = 'completed') as completed_lessons
    FROM public.course_enrollments ce
    LEFT JOIN public.course_modules cm ON cm.course_id = ce.course_id
    LEFT JOIN public.lessons l ON l.module_id = cm.id
    LEFT JOIN public.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ce.user_id
    GROUP BY ce.user_id, ce.course_id
)
SELECT 
    u.email,
    c.title as course_title,
    up.completed_lessons,
    clc.total_lessons,
    CASE 
        WHEN clc.total_lessons > 0 
        THEN ROUND((up.completed_lessons::numeric / clc.total_lessons::numeric) * 100, 2)
        ELSE 0
    END as calculated_progress_percentage,
    ce.progress_percentage as stored_progress_percentage
FROM user_progress up
JOIN course_lesson_counts clc ON clc.course_id = up.course_id
JOIN public.course_enrollments ce ON ce.user_id = up.user_id AND ce.course_id = up.course_id
JOIN auth.users u ON u.id = up.user_id
JOIN public.courses c ON c.id = up.course_id
ORDER BY u.email, c.title;

-- ========================================
-- SECTION 4: HELPER QUERIES
-- ========================================

-- 4.1 Get course structure for debugging
SELECT '==== COURSE STRUCTURE ====' as section;
SELECT 
    c.title as course_title,
    cm.title as module_title,
    cm.order_index as module_order,
    l.id as lesson_id,
    l.title as lesson_title,
    l.content_type,
    l.order_index as lesson_order,
    l.is_final_quiz
FROM public.courses c
JOIN public.course_modules cm ON cm.course_id = c.id
JOIN public.lessons l ON l.module_id = cm.id
WHERE c.id = 'f47ac10b-58cc-4372-a567-0e02b2c3d485' -- Test course
ORDER BY cm.order_index, l.order_index;

-- 4.2 Check RLS policies (for debugging permissions issues)
SELECT '==== RLS POLICY CHECK ====' as section;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('course_enrollments', 'lesson_progress', 'courses', 'lessons')
ORDER BY tablename, policyname;