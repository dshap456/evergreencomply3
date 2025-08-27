-- Debug query for user evergreentester1@gmail.com
-- Check user status across all relevant tables

-- Set up variables for the email we're checking
\set target_email 'evergreentester1@gmail.com'

-- 1. Check if user exists in auth.users table
SELECT 
    'AUTH.USERS CHECK' as table_name,
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at,
    phone,
    raw_user_meta_data
FROM auth.users 
WHERE email = :'target_email';

-- 2. Check course enrollments
SELECT 
    'COURSE_ENROLLMENTS CHECK' as table_name,
    ce.id,
    ce.user_id,
    ce.course_id,
    ce.enrolled_at,
    ce.completed_at,
    ce.progress_percentage,
    ce.final_score,
    c.title as course_title,
    c.is_published
FROM course_enrollments ce
JOIN courses c ON c.id = ce.course_id
WHERE ce.user_id IN (
    SELECT id FROM auth.users WHERE email = :'target_email'
);

-- 3. Check team invitations
SELECT 
    'TEAM_INVITATIONS CHECK' as table_name,
    i.id,
    i.email,
    i.account_id,
    i.role,
    i.created_at,
    i.expires_at,
    i.invite_token,
    a.name as account_name,
    a.slug as account_slug,
    a.is_personal_account
FROM invitations i
JOIN accounts a ON a.id = i.account_id
WHERE i.email = :'target_email';

-- 4. Check course invitations
SELECT 
    'COURSE_INVITATIONS CHECK' as table_name,
    ci.id,
    ci.email,
    ci.course_id,
    ci.account_id,
    ci.created_at,
    ci.expires_at,
    ci.accepted_at,
    ci.invite_token,
    c.title as course_title
FROM course_invitations ci
LEFT JOIN courses c ON c.id = ci.course_id
WHERE ci.email = :'target_email'
ORDER BY ci.created_at DESC;

-- 5. Check pending invitation tokens
SELECT 
    'PENDING_INVITATION_TOKENS CHECK' as table_name,
    pit.id,
    pit.email,
    pit.invitation_token,
    pit.invitation_type,
    pit.created_at,
    pit.processed_at
FROM pending_invitation_tokens pit
WHERE pit.email = :'target_email'
ORDER BY pit.created_at DESC;

-- 6. Check account memberships if user exists
SELECT 
    'ACCOUNT_MEMBERSHIPS CHECK' as table_name,
    am.id,
    am.user_id,
    am.account_id,
    am.account_role,
    am.created_at,
    a.name as account_name,
    a.slug as account_slug,
    a.is_personal_account
FROM accounts_memberships am
JOIN accounts a ON a.id = am.account_id
WHERE am.user_id IN (
    SELECT id FROM auth.users WHERE email = :'target_email'
);

-- 7. Summary query
SELECT 
    'SUMMARY' as summary_type,
    (SELECT COUNT(*) FROM auth.users WHERE email = :'target_email') as user_exists_count,
    (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.user_id IN (
        SELECT id FROM auth.users WHERE email = :'target_email'
    )) as total_enrollments,
    (SELECT COUNT(*) FROM invitations WHERE email = :'target_email') as team_invitations_count,
    (SELECT COUNT(*) FROM course_invitations WHERE email = :'target_email') as course_invitations_count,
    (SELECT COUNT(*) FROM pending_invitation_tokens WHERE email = :'target_email') as pending_tokens_count,
    (SELECT COUNT(*) FROM accounts_memberships am WHERE am.user_id IN (
        SELECT id FROM auth.users WHERE email = :'target_email'
    )) as account_memberships_count;