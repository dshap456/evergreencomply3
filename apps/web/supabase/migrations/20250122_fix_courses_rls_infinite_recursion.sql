-- Fix infinite recursion in courses RLS policy
-- The original policy caused infinite recursion when querying course_enrollments 
-- with inner joins to courses table

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "courses_read" ON public.courses;

-- Create new policy without the circular reference to course_enrollments
CREATE POLICY "courses_read" ON public.courses FOR SELECT
    TO authenticated USING (
        -- Course owners (account members) can read
        public.has_role_on_account(account_id) OR
        -- Published courses are readable by all authenticated users
        is_published
    );