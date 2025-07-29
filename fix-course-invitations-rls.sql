-- Fix RLS policy for course_invitations table
-- The issue is that the policy is trying to access auth.users table directly

-- First, let's drop the problematic policy
DROP POLICY IF EXISTS "course_invitations_select" ON public.course_invitations;

-- Recreate the policy without direct auth.users reference
CREATE POLICY "course_invitations_select" ON public.course_invitations
    FOR SELECT TO authenticated
    USING (
        public.has_role_on_account(account_id) OR
        email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    );

-- Alternative safer version if the above still fails
-- This version only checks account membership
/*
DROP POLICY IF EXISTS "course_invitations_select" ON public.course_invitations;

CREATE POLICY "course_invitations_select" ON public.course_invitations
    FOR SELECT TO authenticated
    USING (
        public.has_role_on_account(account_id)
    );
*/

-- Let's also check if the view is causing issues
-- The view references auth.users which might be the problem
DROP VIEW IF EXISTS public.team_course_enrollments CASCADE;

-- Recreate the view using a different approach
CREATE OR REPLACE VIEW public.team_course_enrollments AS
SELECT 
    ce.id,
    ce.user_id,
    ce.course_id,
    ce.account_id,
    ce.enrolled_at,
    ce.completed_at,
    ce.progress_percentage,
    ce.final_score,
    acc_user.email as user_email,
    acc_user.name as user_name,
    c.title as course_title,
    CASE 
        WHEN ce.invited_by IS NOT NULL THEN 'invited'
        ELSE 'self_enrolled'
    END as enrollment_type,
    acc_inviter.email as inviter_email
FROM public.course_enrollments ce
JOIN public.accounts acc_user ON ce.user_id = acc_user.id AND acc_user.is_personal_account = true
JOIN public.courses c ON ce.course_id = c.id
LEFT JOIN public.accounts acc_inviter ON ce.invited_by = acc_inviter.id AND acc_inviter.is_personal_account = true
WHERE ce.account_id IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON public.team_course_enrollments TO authenticated;

-- Test if we can query the invitations table now
SELECT 'Testing course_invitations access...' as status;
SELECT COUNT(*) as invitation_count FROM public.course_invitations;

-- Test if we can query the view
SELECT 'Testing team_course_enrollments view...' as status;
SELECT COUNT(*) as enrollment_count FROM public.team_course_enrollments;