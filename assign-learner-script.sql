-- Script to assign a learner to a course manually
-- Run this in your Supabase SQL editor or local psql

-- Step 1: Find available users and courses
SELECT 'USERS:' as info;
SELECT id, email, raw_user_meta_data->>'name' as name 
FROM auth.users 
WHERE email LIKE '%test%' OR email LIKE '%learner%';

SELECT 'COURSES:' as info;
SELECT id, title, is_published 
FROM public.courses 
WHERE is_published = true;

-- Step 2: Assign learner to course (Replace UUIDs with actual values from above)
-- INSERT INTO public.course_enrollments (
--     user_id,
--     course_id,
--     enrolled_at,
--     progress_percentage,
--     status
-- ) VALUES (
--     'LEARNER_USER_ID_HERE',  -- Replace with actual user ID
--     'COURSE_ID_HERE',        -- Replace with actual course ID
--     NOW(),
--     0,
--     'in_progress'
-- );

-- Step 3: Verify enrollment
SELECT 
    ce.id as enrollment_id,
    u.email as learner_email,
    c.title as course_title,
    ce.progress_percentage,
    ce.enrolled_at
FROM public.course_enrollments ce
JOIN auth.users u ON ce.user_id = u.id
JOIN public.courses c ON ce.course_id = c.id;