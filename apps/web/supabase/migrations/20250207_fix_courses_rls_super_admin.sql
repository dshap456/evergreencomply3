-- Fix courses RLS policy to allow super admins to manage courses
-- Currently the policy only checks for settings.manage permission

-- Drop the existing policy
DROP POLICY IF EXISTS "courses_manage" ON public.courses;

-- Recreate with super admin check
CREATE POLICY "courses_manage" ON public.courses FOR ALL
    TO authenticated USING (
        -- Super admins can manage all courses
        public.is_super_admin() OR
        -- Or users with settings.manage permission on the account
        public.has_permission(auth.uid(), account_id, 'settings.manage'::public.app_permissions)
    );

-- Also update the read policy to use 'status' instead of 'is_published'
DROP POLICY IF EXISTS "courses_read" ON public.courses;

CREATE POLICY "courses_read" ON public.courses FOR SELECT
    TO authenticated USING (
        -- Super admins can read all courses
        public.is_super_admin() OR
        -- Course owners (account members) can read
        public.has_role_on_account(account_id) OR
        -- Published courses are readable by all authenticated users
        status = 'published'
    );