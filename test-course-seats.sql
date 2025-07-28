-- Test Data Setup for Course Seat Management
-- Run this in Supabase Studio SQL Editor

-- 1. First, let's check if we have a team account
SELECT id, name, slug, is_personal_account 
FROM accounts 
WHERE is_personal_account = false 
LIMIT 1;

-- 2. Get some published courses
SELECT id, title, account_id, status 
FROM courses 
WHERE status = 'published' 
LIMIT 5;

-- 3. Create course seats for testing (replace IDs with actual values from above queries)
-- Example: Give a team 10 seats for a course
INSERT INTO course_seats (account_id, course_id, total_seats, created_by)
VALUES (
    'YOUR_TEAM_ACCOUNT_ID', -- Replace with actual team account ID
    'YOUR_COURSE_ID',       -- Replace with actual course ID
    10,                     -- Total seats
    auth.uid()
);

-- 4. Check the team owner
SELECT 
    a.id as account_id,
    a.name as account_name,
    a.slug,
    a.primary_owner_user_id,
    u.email as owner_email
FROM accounts a
JOIN auth.users u ON a.primary_owner_user_id = u.id
WHERE a.is_personal_account = false
LIMIT 1;

-- 5. View course seats with details
SELECT 
    cs.id,
    cs.total_seats,
    cs.account_id,
    a.name as team_name,
    c.title as course_title,
    c.id as course_id,
    (
        SELECT COUNT(*) 
        FROM course_enrollments ce 
        WHERE ce.account_id = cs.account_id 
        AND ce.course_id = cs.course_id
    ) as used_seats
FROM course_seats cs
JOIN accounts a ON cs.account_id = a.id
JOIN courses c ON cs.course_id = c.id;