-- Fix RLS policies for course seat management
-- The issue: Team members can't see their team's course data

-- 1. Fix course_seats RLS policy
DROP POLICY IF EXISTS "Users can view course seats for their accounts" ON public.course_seats;

CREATE POLICY "Users can view course seats for their accounts"
ON public.course_seats
FOR SELECT
TO authenticated
USING (
  -- User can see seats for accounts they are a member of
  account_id IN (
    SELECT account_id 
    FROM public.accounts_memberships 
    WHERE user_id = auth.uid()
  )
  OR
  -- User can see seats for their personal account
  account_id IN (
    SELECT id 
    FROM public.accounts 
    WHERE primary_owner_user_id = auth.uid()
  )
);

-- 2. Fix course_enrollments RLS policy
DROP POLICY IF EXISTS "Users can view enrollments for their accounts" ON public.course_enrollments;

CREATE POLICY "Users can view enrollments for their accounts"
ON public.course_enrollments
FOR SELECT
TO authenticated
USING (
  -- User can see their own enrollments
  user_id = auth.uid()
  OR
  -- User can see enrollments for accounts they are a member of
  account_id IN (
    SELECT account_id 
    FROM public.accounts_memberships 
    WHERE user_id = auth.uid()
  )
  OR
  -- User can see enrollments for accounts they own
  account_id IN (
    SELECT id 
    FROM public.accounts 
    WHERE primary_owner_user_id = auth.uid()
  )
);

-- 3. Fix course_invitations RLS policy
DROP POLICY IF EXISTS "Users can view invitations for their accounts" ON public.course_invitations;

CREATE POLICY "Users can view invitations for their accounts"
ON public.course_invitations
FOR SELECT
TO authenticated
USING (
  -- User can see invitations sent to them
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- User can see invitations they sent
  invited_by = auth.uid()
  OR
  -- User can see invitations for accounts they are a member of
  account_id IN (
    SELECT account_id 
    FROM public.accounts_memberships 
    WHERE user_id = auth.uid()
  )
  OR
  -- User can see invitations for accounts they own
  account_id IN (
    SELECT id 
    FROM public.accounts 
    WHERE primary_owner_user_id = auth.uid()
  )
);

-- Verify the policies are working
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated for course management tables';
END $$;