import { NextResponse } from 'next/server';

export async function GET() {
  const learnerAccessSQL = `
-- Fix learner access by adding proper RLS policies
-- First, drop the overly restrictive policy
DROP POLICY IF EXISTS "courses_super_admin_only" ON public.courses;

-- 1. Super admins can see and manage all courses
CREATE POLICY "courses_super_admin_all" ON public.courses
    FOR ALL 
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 2. Account owners can manage their own courses
CREATE POLICY "courses_account_owner_all" ON public.courses
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.accounts 
            WHERE accounts.id = courses.account_id 
            AND accounts.primary_owner_user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM public.accounts 
            WHERE accounts.id = courses.account_id 
            AND accounts.primary_owner_user_id = auth.uid()
        )
    );

-- 3. CRITICAL: Enrolled learners can VIEW published courses
CREATE POLICY "courses_enrolled_learners_read" ON public.courses
    FOR SELECT 
    TO authenticated
    USING (
        courses.status = 'published'
        AND EXISTS (
            SELECT 1 
            FROM public.course_enrollments ce
            WHERE ce.course_id = courses.id
            AND ce.user_id = auth.uid()
        )
    );

-- 4. Non-enrolled users can see published courses (for enrollment page)
CREATE POLICY "courses_public_list" ON public.courses
    FOR SELECT
    TO authenticated
    USING (courses.status = 'published');

-- Also check if course_enrollments has proper policies
-- If learners can't see their enrollments, they can't see courses
CREATE POLICY IF NOT EXISTS "enrollments_user_read_own" ON public.course_enrollments
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "enrollments_user_update_own" ON public.course_enrollments
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Verify policies
SELECT 
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('courses', 'course_enrollments')
ORDER BY tablename, policyname;
`;

  return NextResponse.json({
    message: "Run this SQL to fix learner access",
    sql: learnerAccessSQL,
    explanation: [
      "This adds policies so:",
      "- Super admins can do everything",
      "- Account owners can manage their courses",
      "- Enrolled learners can VIEW published courses",
      "- All authenticated users can see published courses list",
      "- Users can read/update their own enrollments"
    ]
  });
}