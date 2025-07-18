-- Step 1: Find your account ID
-- Run this query first to see what accounts exist
SELECT 
    a.id as account_id,
    a.name as account_name,
    a.primary_owner_user_id,
    a.is_personal_account,
    u.email as owner_email
FROM public.accounts a
LEFT JOIN auth.users u ON u.id = a.primary_owner_user_id
WHERE u.email = 'support@evergreencomply.com'  -- Replace with your email if different
   OR a.primary_owner_user_id = 'c01c1f21-619e-4df0-9c0b-c8a3f296a2b7'; -- Your user ID from earlier

-- Step 2: Once you have the account_id from above, use it in this query
-- Replace YOUR_ACCOUNT_ID_HERE with the actual UUID from the query above
/*
-- Create a test course
INSERT INTO public.courses (
    id,
    account_id,
    title,
    description,
    is_published,
    created_by
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d485',
    'YOUR_ACCOUNT_ID_HERE', -- <-- REPLACE THIS with the account_id from step 1
    'Test Course for Video Upload',
    'This is a test course for testing video upload functionality',
    true,
    'c01c1f21-619e-4df0-9c0b-c8a3f296a2b7' -- Your user ID
)
ON CONFLICT (id) DO UPDATE SET
    account_id = EXCLUDED.account_id;

-- Create a test module
INSERT INTO public.course_modules (
    id,
    course_id,
    title,
    description,
    order_index,
    created_by
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'f47ac10b-58cc-4372-a567-0e02b2c3d485',
    'Getting Started',
    'Introduction to the fundamentals',
    1,
    'c01c1f21-619e-4df0-9c0b-c8a3f296a2b7'
)
ON CONFLICT (id) DO NOTHING;

-- Create test lessons
INSERT INTO public.lessons (
    id,
    module_id,
    title,
    description,
    content_type,
    order_index,
    is_final_quiz,
    created_by
) VALUES 
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Welcome to the Course',
    'Course overview and objectives',
    'video',
    1,
    false,
    'c01c1f21-619e-4df0-9c0b-c8a3f296a2b7'
),
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d481',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Setting Up Your Environment',
    'Install necessary tools and software',
    'text',
    2,
    false,
    'c01c1f21-619e-4df0-9c0b-c8a3f296a2b7'
)
ON CONFLICT (id) DO NOTHING;

-- Create a second module
INSERT INTO public.course_modules (
    id,
    course_id,
    title,
    description,
    order_index,
    created_by
) VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d482',
    'f47ac10b-58cc-4372-a567-0e02b2c3d485',
    'Core Concepts',
    'Learn the essential concepts',
    2,
    'c01c1f21-619e-4df0-9c0b-c8a3f296a2b7'
)
ON CONFLICT (id) DO NOTHING;

-- Create lessons for the second module
INSERT INTO public.lessons (
    id,
    module_id,
    title,
    description,
    content_type,
    order_index,
    is_final_quiz,
    created_by
) VALUES 
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d483',
    'f47ac10b-58cc-4372-a567-0e02b2c3d482',
    'Understanding the Basics',
    'Fundamental concepts explained',
    'video',
    1,
    false,
    'c01c1f21-619e-4df0-9c0b-c8a3f296a2b7'
),
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d484',
    'f47ac10b-58cc-4372-a567-0e02b2c3d482',
    'Knowledge Check',
    'Test your understanding',
    'quiz',
    2,
    false,
    'c01c1f21-619e-4df0-9c0b-c8a3f296a2b7'
)
ON CONFLICT (id) DO NOTHING;
*/

-- Step 3: Verify the data
SELECT 
    c.title as course_title,
    c.account_id,
    cm.title as module_title,
    l.id as lesson_id,
    l.title as lesson_title,
    l.content_type
FROM public.lessons l
JOIN public.course_modules cm ON cm.id = l.module_id
JOIN public.courses c ON c.id = cm.course_id
WHERE c.id = 'f47ac10b-58cc-4372-a567-0e02b2c3d485'
ORDER BY cm.order_index, l.order_index;