-- Direct SQL queries to check evergreentester1@gmail.com status
-- Execute these queries in Supabase SQL Editor

-- 1. Check if user exists in auth.users
SELECT 
    'User in auth.users' as check_type,
    COUNT(*) as count,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'evergreentester1@gmail.com'
GROUP BY id, email, email_confirmed_at, created_at;

-- 2. Check course enrollments (will be empty since user doesn't exist)
SELECT 
    'Course Enrollments' as check_type,
    COUNT(*) as count
FROM course_enrollments ce
JOIN auth.users u ON u.id = ce.user_id
WHERE u.email = 'evergreentester1@gmail.com';

-- 3. Check team invitations
SELECT 
    'Team Invitations' as check_type,
    COUNT(*) as count,
    email,
    role,
    created_at,
    expires_at,
    invite_token
FROM invitations
WHERE email = 'evergreentester1@gmail.com'
GROUP BY email, role, created_at, expires_at, invite_token;

-- 4. Check course invitations
SELECT 
    'Course Invitations' as check_type,
    COUNT(*) as count,
    ci.email,
    ci.created_at,
    ci.expires_at,
    ci.accepted_at,
    ci.invitee_name,
    c.title as course_title
FROM course_invitations ci
LEFT JOIN courses c ON c.id = ci.course_id
WHERE ci.email = 'evergreentester1@gmail.com'
GROUP BY ci.email, ci.created_at, ci.expires_at, ci.accepted_at, ci.invitee_name, c.title;

-- 5. Check pending invitation tokens
SELECT 
    'Pending Tokens' as check_type,
    COUNT(*) as count,
    email,
    invitation_type,
    created_at,
    processed_at
FROM pending_invitation_tokens
WHERE email = 'evergreentester1@gmail.com'
GROUP BY email, invitation_type, created_at, processed_at;

-- 6. Summary of all invitations
SELECT 
    'SUMMARY' as summary_type,
    (SELECT COUNT(*) FROM auth.users WHERE email = 'evergreentester1@gmail.com') as user_exists,
    (SELECT COUNT(*) FROM invitations WHERE email = 'evergreentester1@gmail.com') as team_invitations,
    (SELECT COUNT(*) FROM course_invitations WHERE email = 'evergreentester1@gmail.com') as course_invitations,
    (SELECT COUNT(*) FROM pending_invitation_tokens WHERE email = 'evergreentester1@gmail.com') as pending_tokens;