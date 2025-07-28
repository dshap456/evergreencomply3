-- Make a user a Team Owner
-- Email: dmaxwell2200@gmail.com

-- First, let's find the user by email
WITH target_user AS (
    SELECT id, email 
    FROM auth.users 
    WHERE email = 'dmaxwell2200@gmail.com'
)

-- Check if user exists
SELECT * FROM target_user;

-- Option 1: Create a NEW team with this user as owner
-- Run this if you want to create a fresh team
INSERT INTO accounts (
    primary_owner_user_id,
    name,
    slug,
    is_personal_account,
    email
)
SELECT 
    tu.id,
    'Test Team for Course Seats',  -- Change team name if desired
    'test-team-seats',              -- Change slug if desired
    false,
    tu.email
FROM target_user tu
WHERE NOT EXISTS (
    SELECT 1 FROM accounts 
    WHERE slug = 'test-team-seats' 
    AND is_personal_account = false
);

-- Option 2: Make user the owner of an EXISTING team
-- Uncomment and run this if you have a specific team in mind
/*
UPDATE accounts 
SET primary_owner_user_id = (
    SELECT id FROM auth.users WHERE email = 'dmaxwell2200@gmail.com'
)
WHERE slug = 'your-existing-team-slug'  -- REPLACE WITH ACTUAL TEAM SLUG
AND is_personal_account = false;
*/

-- Verify the team ownership
SELECT 
    a.id as team_id,
    a.name as team_name,
    a.slug as team_slug,
    u.email as owner_email,
    a.primary_owner_user_id = u.id as is_owner
FROM accounts a
JOIN auth.users u ON a.primary_owner_user_id = u.id
WHERE u.email = 'dmaxwell2200@gmail.com'
AND a.is_personal_account = false;

-- Add course seats for testing
-- This gives the team 5 seats for each published course
INSERT INTO course_seats (account_id, course_id, total_seats)
SELECT 
    a.id as account_id,
    c.id as course_id,
    5 as total_seats  -- 5 seats per course
FROM accounts a
CROSS JOIN courses c
WHERE a.slug = 'test-team-seats'  -- Use the team slug from above
AND a.is_personal_account = false
AND c.status = 'published'
ON CONFLICT (account_id, course_id) DO NOTHING;

-- Final check: Show what the user can access
SELECT 
    'Team: ' || a.name as info,
    'Slug: /home/' || a.slug || '/courses/seats' as seat_management_url,
    COUNT(cs.id) as courses_with_seats,
    SUM(cs.total_seats) as total_seats_across_courses
FROM accounts a
LEFT JOIN course_seats cs ON cs.account_id = a.id
WHERE a.primary_owner_user_id = (
    SELECT id FROM auth.users WHERE email = 'dmaxwell2200@gmail.com'
)
AND a.is_personal_account = false
GROUP BY a.id, a.name, a.slug;