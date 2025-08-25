-- Secure RLS policies that protect data between organizations
-- These policies ensure users can only see their own organization's data

-- 1. Drop the overly permissive policies
DROP POLICY IF EXISTS "course_seats_select_policy" ON public.course_seats;
DROP POLICY IF EXISTS "course_enrollments_select_policy" ON public.course_enrollments;
DROP POLICY IF EXISTS "course_invitations_select_policy" ON public.course_invitations;

-- 2. Create secure policies for course_seats
CREATE POLICY "Users can view their organization course seats"
ON public.course_seats
FOR SELECT
TO authenticated
USING (
  -- Check if user is a member of the account (organization)
  EXISTS (
    SELECT 1 FROM public.accounts_memberships
    WHERE accounts_memberships.account_id = course_seats.account_id
    AND accounts_memberships.user_id = auth.uid()
  )
  OR
  -- Check if user owns the account (for personal accounts or team owners)
  EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = course_seats.account_id
    AND accounts.primary_owner_user_id = auth.uid()
  )
);

-- 3. Create secure policies for course_enrollments
CREATE POLICY "Users can view their organization enrollments"
ON public.course_enrollments
FOR SELECT
TO authenticated
USING (
  -- User can see their own enrollments
  user_id = auth.uid()
  OR
  -- User can see enrollments in their organization
  (
    account_id IS NOT NULL 
    AND (
      EXISTS (
        SELECT 1 FROM public.accounts_memberships
        WHERE accounts_memberships.account_id = course_enrollments.account_id
        AND accounts_memberships.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.accounts
        WHERE accounts.id = course_enrollments.account_id
        AND accounts.primary_owner_user_id = auth.uid()
      )
    )
  )
);

-- 4. Create secure policies for course_invitations
CREATE POLICY "Users can view their organization invitations"
ON public.course_invitations
FOR SELECT
TO authenticated
USING (
  -- User can see invitations sent to their email
  email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
  OR
  -- User sent the invitation
  invited_by = auth.uid()
  OR
  -- User is a member of the organization
  (
    account_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.accounts_memberships
        WHERE accounts_memberships.account_id = course_invitations.account_id
        AND accounts_memberships.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.accounts
        WHERE accounts.id = course_invitations.account_id
        AND accounts.primary_owner_user_id = auth.uid()
      )
    )
  )
);

-- Test comment to verify the policies are working
DO $$
BEGIN
  RAISE NOTICE 'Secure RLS policies applied - users can only see their own organization data';
END $$;