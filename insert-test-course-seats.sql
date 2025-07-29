-- SQL to insert test course seats data
-- Run this in your Supabase SQL Editor after replacing the IDs with real values

-- First, let's check what courses and accounts exist
SELECT 'Checking existing data...' as status;

-- View your team accounts
SELECT id, name, slug, primary_owner_user_id 
FROM accounts 
WHERE is_personal_account = false
LIMIT 5;

-- View your courses
SELECT id, title, account_id, status
FROM courses
LIMIT 10;

-- View current user
SELECT id, email 
FROM auth.users 
WHERE email = 'YOUR_EMAIL@example.com';  -- Replace with your email

-- After you identify the IDs above, uncomment and run this section:
/*
-- Insert course seats for a specific account and course
-- Replace these IDs with actual values from the queries above
INSERT INTO course_seats (account_id, course_id, total_seats)
VALUES 
  ('YOUR_ACCOUNT_ID', 'YOUR_COURSE_ID', 10)
ON CONFLICT (account_id, course_id) 
DO UPDATE SET total_seats = EXCLUDED.total_seats;

-- Verify the insert
SELECT cs.*, c.title as course_title, a.name as account_name
FROM course_seats cs
JOIN courses c ON cs.course_id = c.id
JOIN accounts a ON cs.account_id = a.id;
*/