-- Update existing courses RLS policy to include super admin access
-- This addresses the issue where created courses don't show up in admin panel

-- First, check what the current policy looks like
-- (You can run this to see the current policy)
-- SELECT * FROM pg_policies WHERE tablename = 'courses' AND policyname = 'courses_read';

-- Drop the existing policy and recreate it
DROP POLICY "courses_read" ON public.courses;

-- Recreate with super admin access
CREATE POLICY "courses_read" ON public.courses FOR SELECT
    TO authenticated USING (
        -- Super admins can read all courses
        public.is_super_admin() OR
        -- Course owners (account members) can read
        public.has_role_on_account(account_id) OR
        -- Published courses are readable by all authenticated users
        is_published
    );