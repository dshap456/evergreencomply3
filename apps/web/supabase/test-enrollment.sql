-- Test the enrollment functions directly

-- 1. First check if you're recognized as a super admin
SELECT public.is_super_admin_without_mfa() as is_super_admin;

-- 2. Check your user's app_metadata
SELECT 
    id,
    email,
    raw_app_meta_data,
    raw_app_meta_data->>'role' as role
FROM auth.users 
WHERE id = auth.uid();

-- 3. Try to get a test user and course
SELECT 
    'Test User:' as label,
    a.id,
    a.primary_owner_user_id,
    a.email,
    a.name
FROM accounts a
WHERE a.email = 'learner@test.com'
AND a.is_personal_account = true;

SELECT 
    'Test Course:' as label,
    c.id,
    c.title,
    c.is_published
FROM courses c
WHERE c.is_published = true
LIMIT 1;

-- 4. Check existing enrollments
SELECT 
    ce.id,
    ce.user_id,
    ce.course_id,
    c.title as course_title,
    a.email as user_email
FROM course_enrollments ce
JOIN courses c ON c.id = ce.course_id
JOIN accounts a ON a.primary_owner_user_id = ce.user_id
WHERE a.is_personal_account = true
ORDER BY ce.created_at DESC
LIMIT 5;