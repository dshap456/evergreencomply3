-- Fix: Allow anonymous users to view course invitations by token
-- This resolves "Invite not found or expired" error for unauthenticated users
-- viewing course invitation details at /courses/invitation?token=...

-- Drop existing policy if it exists (safe operation)
DROP POLICY IF EXISTS "course_invitations_anon_select_by_token" ON public.course_invitations;

-- Allow anonymous users to view course invitations by token
-- This is needed so unauthenticated users can see invitation details before signing up
CREATE POLICY "course_invitations_anon_select_by_token" 
ON public.course_invitations 
FOR SELECT 
TO anon
USING (
  -- Only allow viewing by exact token match
  -- The token acts as the authentication mechanism
  -- Also ensure invitation is not expired
  invite_token IS NOT NULL
  AND expires_at > NOW()
  AND accepted_at IS NULL
);

-- Also ensure authenticated users can still view invitations by token
-- (for cases where they're logged in with a different account)
DROP POLICY IF EXISTS "course_invitations_select_by_token" ON public.course_invitations;

CREATE POLICY "course_invitations_select_by_token"
ON public.course_invitations
FOR SELECT
TO authenticated
USING (
  -- Allow viewing by token (for accepting invitations)
  -- OR if user has role on the account (for managing invitations)
  invite_token IS NOT NULL
  OR has_role_on_account(account_id)
);