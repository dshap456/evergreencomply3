-- Diagnostic SQL to understand the progress issue
-- Run this in Supabase SQL Editor with the actual user_id and course_id

-- Replace these with actual values from the URL
SET my.user_id = 'b5b01ffc-3c23-495e-81a0-8610be2c331f';
SET my.course_id = 'YOUR_COURSE_ID_FROM_URL'; -- Get this from the URL /home/courses/[THIS_ID]

-- 1. Check if enrollment exists
SELECT 
    'Enrollment Check' as check_type,
    ce.id,
    ce.user_id,
    ce.course_id,
    ce.progress_percentage,
    ce.enrolled_at,
    c.title as course_title,
    c.status as course_status
FROM course_enrollments ce
JOIN courses c ON c.id = ce.course_id
WHERE ce.user_id = current_setting('my.user_id')::uuid
AND ce.course_id = current_setting('my.course_id')::uuid;

-- 2. Check lesson progress for this user and course
SELECT 
    'Lesson Progress' as check_type,
    lp.lesson_id,
    lp.language,
    lp.status,
    lp.last_accessed,
    lp.updated_at,
    l.title as lesson_title,
    cm.title as module_title,
    cm.language as module_language
FROM lesson_progress lp
JOIN lessons l ON l.id = lp.lesson_id
JOIN course_modules cm ON cm.id = l.module_id
WHERE lp.user_id = current_setting('my.user_id')::uuid
AND cm.course_id = current_setting('my.course_id')::uuid
ORDER BY lp.updated_at DESC;

-- 3. Check course structure
SELECT 
    'Course Structure' as check_type,
    cm.id as module_id,
    cm.title as module_title,
    cm.language,
    COUNT(l.id) as lesson_count
FROM course_modules cm
LEFT JOIN lessons l ON l.module_id = cm.id
WHERE cm.course_id = current_setting('my.course_id')::uuid
GROUP BY cm.id, cm.title, cm.language
ORDER BY cm.language, cm.order_index;

-- 4. Check if there are ANY enrollments for this user
SELECT 
    'All User Enrollments' as check_type,
    ce.course_id,
    c.title,
    ce.progress_percentage,
    ce.enrolled_at
FROM course_enrollments ce
JOIN courses c ON c.id = ce.course_id
WHERE ce.user_id = current_setting('my.user_id')::uuid
ORDER BY ce.enrolled_at DESC;

-- 5. Test the RPC function
SELECT public.update_course_progress(
    current_setting('my.user_id')::uuid,
    (SELECT id FROM lessons WHERE module_id IN (SELECT id FROM course_modules WHERE course_id = current_setting('my.course_id')::uuid) LIMIT 1),
    'en'
);