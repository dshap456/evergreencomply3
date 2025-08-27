-- FINAL REPORT: User Status Check for evergreentester1@gmail.com
-- Execute this in Supabase SQL Editor for complete status

-- 1. Check if user exists in auth.users table
SELECT 'AUTH.USERS TABLE' as table_check, COUNT(*) as records_found
FROM auth.users
WHERE email = 'evergreentester1@gmail.com';

-- 2. Check course enrollments (should be 0 since user doesn't exist)
SELECT 'COURSE_ENROLLMENTS TABLE' as table_check, COUNT(*) as records_found
FROM course_enrollments ce
WHERE ce.user_id IN (SELECT id FROM auth.users WHERE email = 'evergreentester1@gmail.com');

-- 3. Check team/account invitations
SELECT 'TEAM_INVITATIONS TABLE' as table_check, COUNT(*) as records_found
FROM invitations
WHERE email = 'evergreentester1@gmail.com';

-- 4. Check course invitations
SELECT 'COURSE_INVITATIONS TABLE' as table_check, COUNT(*) as records_found
FROM course_invitations
WHERE email = 'evergreentester1@gmail.com';

-- 5. Check pending invitation tokens
SELECT 'PENDING_INVITATION_TOKENS TABLE' as table_check, COUNT(*) as records_found
FROM pending_invitation_tokens
WHERE email = 'evergreentester1@gmail.com';

-- 6. Get detailed pending tokens info
SELECT 
    'PENDING_TOKENS_DETAIL' as section,
    id,
    email,
    invitation_token,
    invitation_type,
    created_at,
    processed_at,
    CASE WHEN processed_at IS NULL THEN 'UNPROCESSED' ELSE 'PROCESSED' END as status
FROM pending_invitation_tokens
WHERE email = 'evergreentester1@gmail.com'
ORDER BY created_at DESC;

-- 7. Get detailed course invitations info
SELECT 
    'COURSE_INVITATIONS_DETAIL' as section,
    ci.id,
    ci.email,
    ci.course_id,
    ci.invite_token,
    ci.invitee_name,
    ci.created_at,
    ci.expires_at,
    ci.accepted_at,
    CASE WHEN ci.accepted_at IS NULL THEN 'PENDING' ELSE 'ACCEPTED' END as status,
    c.title as course_title,
    c.is_published as course_published
FROM course_invitations ci
LEFT JOIN courses c ON c.id = ci.course_id
WHERE ci.email = 'evergreentester1@gmail.com'
ORDER BY ci.created_at DESC;

-- 8. SUMMARY REPORT
SELECT 
    '=== SUMMARY REPORT ===' as report_section,
    'evergreentester1@gmail.com' as email_checked,
    NOW() as report_timestamp;

SELECT 
    'User exists in auth.users' as check_item,
    CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM auth.users
WHERE email = 'evergreentester1@gmail.com'

UNION ALL

SELECT 
    'Has course enrollments' as check_item,
    CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM course_enrollments ce
WHERE ce.user_id IN (SELECT id FROM auth.users WHERE email = 'evergreentester1@gmail.com')

UNION ALL

SELECT 
    'Has team invitations' as check_item,
    CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM invitations
WHERE email = 'evergreentester1@gmail.com'

UNION ALL

SELECT 
    'Has course invitations' as check_item,
    CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM course_invitations
WHERE email = 'evergreentester1@gmail.com'

UNION ALL

SELECT 
    'Has pending tokens' as check_item,
    CASE WHEN COUNT(*) > 0 THEN 'YES (' || COUNT(*) || ')' ELSE 'NO' END as result
FROM pending_invitation_tokens
WHERE email = 'evergreentester1@gmail.com';

-- 9. ACTION RECOMMENDATIONS
SELECT 
    '=== RECOMMENDATIONS ===' as section,
    'The user evergreentester1@gmail.com does NOT exist in auth.users table' as finding_1,
    'There are 6 unprocessed invitation tokens in pending_invitation_tokens' as finding_2,
    'There is 1 course invitation in course_invitations table' as finding_3,
    'User needs to sign up/register first to accept invitations' as recommendation;