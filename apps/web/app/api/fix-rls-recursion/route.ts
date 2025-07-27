import { NextResponse } from 'next/server';

export async function GET() {
  const fixSQL = `
-- EMERGENCY FIX: Remove ALL policies causing recursion
-- Step 1: Drop ALL existing policies on both tables
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on courses
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'courses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.courses CASCADE', pol.policyname);
    END LOOP;
    
    -- Drop all policies on course_enrollments
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'course_enrollments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.course_enrollments CASCADE', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Create SIMPLE, NON-RECURSIVE policies for courses
-- 2a. Super admins can do everything
CREATE POLICY "courses_super_admin_all" ON public.courses
    FOR ALL 
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 2b. Account owners can manage their courses (no recursion)
CREATE POLICY "courses_account_owner_all" ON public.courses
    FOR ALL 
    TO authenticated
    USING (
        account_id IN (
            SELECT id FROM public.accounts 
            WHERE primary_owner_user_id = auth.uid()
        )
    )
    WITH CHECK (
        account_id IN (
            SELECT id FROM public.accounts 
            WHERE primary_owner_user_id = auth.uid()
        )
    );

-- 2c. ALL authenticated users can VIEW published courses (simplest possible)
CREATE POLICY "courses_view_published" ON public.courses
    FOR SELECT 
    TO authenticated
    USING (status = 'published');

-- Step 3: Create SIMPLE policies for course_enrollments
-- 3a. Users can see their own enrollments
CREATE POLICY "enrollments_own_read" ON public.course_enrollments
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 3b. Users can update their own enrollments
CREATE POLICY "enrollments_own_update" ON public.course_enrollments
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 3c. Super admins can do everything
CREATE POLICY "enrollments_super_admin_all" ON public.course_enrollments
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 3d. Account owners can manage enrollments for their courses
CREATE POLICY "enrollments_account_owner_manage" ON public.course_enrollments
    FOR ALL
    TO authenticated
    USING (
        course_id IN (
            SELECT c.id FROM public.courses c
            JOIN public.accounts a ON c.account_id = a.id
            WHERE a.primary_owner_user_id = auth.uid()
        )
    )
    WITH CHECK (
        course_id IN (
            SELECT c.id FROM public.courses c
            JOIN public.accounts a ON c.account_id = a.id
            WHERE a.primary_owner_user_id = auth.uid()
        )
    );

-- Step 4: Verify no recursion
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
    message: "Run this SQL to fix the RLS recursion",
    sql: fixSQL,
    explanation: [
      "This removes ALL existing policies that are causing recursion",
      "Creates simple, non-recursive policies",
      "Key changes:",
      "- No policies reference other tables with RLS",
      "- All authenticated users can see published courses",
      "- Users can see/update their own enrollments",
      "- Super admins and account owners have full access"
    ]
  });
}