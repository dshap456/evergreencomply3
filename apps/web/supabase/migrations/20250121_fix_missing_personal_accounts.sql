-- Migration: Fix Missing Personal Accounts
-- This ensures all users in auth.users have corresponding personal accounts

-- Create personal accounts for any users who are missing them
INSERT INTO public.accounts (
  id,
  primary_owner_user_id,
  name,
  is_personal_account,
  email,
  created_at,
  updated_at
)
SELECT 
  u.id, -- Use the user's ID as the account ID
  u.id, -- Primary owner is the user themselves
  COALESCE(
    u.raw_user_meta_data->>'name', 
    split_part(u.email, '@', 1), 
    'User'
  ) as name, -- Get name from metadata, or use email prefix, or default to 'User'
  true, -- This is a personal account
  u.email, -- Copy email from auth.users
  u.created_at, -- Use original creation date
  COALESCE(u.updated_at, u.created_at) -- Use last update date or creation date
FROM auth.users u
LEFT JOIN public.accounts a ON a.primary_owner_user_id = u.id AND a.is_personal_account = true
WHERE a.id IS NULL -- Only for users without personal accounts
ON CONFLICT (id) DO NOTHING; -- Avoid conflicts if account already exists