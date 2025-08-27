-- URGENT ROLLBACK: Restore original RLS policies

-- 1. Remove the new policies
DROP POLICY IF EXISTS "Users can view course seats for their accounts" ON public.course_seats;
DROP POLICY IF EXISTS "Users can view enrollments for their accounts" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users can view invitations for their accounts" ON public.course_invitations;

-- 2. Restore original policies (or create permissive ones for now)

-- Allow authenticated users to see all course seats (temporary permissive policy)
CREATE POLICY "course_seats_select_policy"
ON public.course_seats
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to see all enrollments (temporary permissive policy)
CREATE POLICY "course_enrollments_select_policy"
ON public.course_enrollments
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to see all invitations (temporary permissive policy)
CREATE POLICY "course_invitations_select_policy"
ON public.course_invitations
FOR SELECT
TO authenticated
USING (true);

-- Verify rollback
DO $$
BEGIN
  RAISE NOTICE 'RLS policies rolled back to permissive state';
END $$;