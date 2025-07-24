-- Quick fix for courses RLS to allow super admins to see all courses
-- This addresses the issue where created courses don't show up in admin panel

-- Drop the existing policy
DROP POLICY IF EXISTS "courses_read" ON public.courses;

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