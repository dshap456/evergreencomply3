-- Debug why user is not found

-- 1. Check if user exists in auth.users
SELECT 
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'davidbannon010@gmail.com';

-- 2. Check if user has an account in accounts table
SELECT 
    id,
    primary_owner_user_id,
    email,
    name,
    is_personal_account
FROM accounts 
WHERE email = 'davidbannon010@gmail.com'
   OR primary_owner_user_id IN (
       SELECT id FROM auth.users WHERE email = 'davidbannon010@gmail.com'
   );

-- 3. Check all personal accounts to see the pattern
SELECT 
    a.id,
    a.primary_owner_user_id,
    a.email as account_email,
    a.name,
    a.is_personal_account,
    u.email as user_email
FROM accounts a
JOIN auth.users u ON u.id = a.primary_owner_user_id
WHERE a.is_personal_account = true
ORDER BY a.created_at DESC
LIMIT 10;