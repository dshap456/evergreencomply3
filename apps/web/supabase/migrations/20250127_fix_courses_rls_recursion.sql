-- Fix infinite recursion in courses RLS policies
-- First, drop all existing policies on courses table
DROP POLICY IF EXISTS "courses_read" ON public.courses;
DROP POLICY IF EXISTS "courses_manage" ON public.courses;
DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
DROP POLICY IF EXISTS "published_courses_read" ON public.courses;
DROP POLICY IF EXISTS "courses_select" ON public.courses;
DROP POLICY IF EXISTS "courses_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_update" ON public.courses;
DROP POLICY IF EXISTS "courses_delete" ON public.courses;

-- Create new, non-recursive policies

-- 1. Super admins can do everything
CREATE POLICY "courses_super_admin_all" ON public.courses
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 2. Account members can view courses in their account
CREATE POLICY "courses_account_members_read" ON public.courses
    FOR SELECT TO authenticated
    USING (
        public.has_role_on_account(account_id)
    );

-- 3. Account owners and members with settings.manage can manage courses
CREATE POLICY "courses_account_manage" ON public.courses
    FOR ALL TO authenticated
    USING (
        public.has_permission(auth.uid(), account_id, 'settings.manage'::public.app_permissions)
    )
    WITH CHECK (
        public.has_permission(auth.uid(), account_id, 'settings.manage'::public.app_permissions)
    );

-- 4. Published courses can be viewed by enrolled learners
CREATE POLICY "courses_enrolled_learners_read" ON public.courses
    FOR SELECT TO authenticated
    USING (
        status = 'published' 
        AND EXISTS (
            SELECT 1 FROM public.course_enrollments ce
            WHERE ce.course_id = courses.id
            AND ce.user_id = auth.uid()
        )
    );

-- Add comment to track this fix
COMMENT ON TABLE public.courses IS 'Courses table - RLS policies fixed on 2025-01-27 to resolve infinite recursion';