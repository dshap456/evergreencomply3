-- Complete fix for course invitations RLS policies
-- This removes ALL references to auth.users table which is causing permission errors

-- 1. Drop ALL existing policies on course_invitations to start fresh
DROP POLICY IF EXISTS "course_invitations_select" ON public.course_invitations;
DROP POLICY IF EXISTS "course_invitations_insert" ON public.course_invitations;
DROP POLICY IF EXISTS "course_invitations_update" ON public.course_invitations;
DROP POLICY IF EXISTS "course_invitations_delete" ON public.course_invitations;

-- 2. Create new RLS policies without auth.users references

-- Team members can view invitations for their account
-- Simplified: only check if user has role on account
CREATE POLICY "course_invitations_select" ON public.course_invitations
    FOR SELECT TO authenticated
    USING (
        public.has_role_on_account(account_id)
    );

-- Team owners can create invitations
CREATE POLICY "course_invitations_insert" ON public.course_invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_account_owner(account_id) AND
        invited_by = auth.uid()
    );

-- Team owners can update invitations
CREATE POLICY "course_invitations_update" ON public.course_invitations
    FOR UPDATE TO authenticated
    USING (public.is_account_owner(account_id))
    WITH CHECK (public.is_account_owner(account_id));

-- Team owners can delete invitations
CREATE POLICY "course_invitations_delete" ON public.course_invitations
    FOR DELETE TO authenticated
    USING (public.is_account_owner(account_id));

-- 3. Also fix the team_course_enrollments view to avoid auth.users
DROP VIEW IF EXISTS public.team_course_enrollments CASCADE;

CREATE OR REPLACE VIEW public.team_course_enrollments 
WITH (security_invoker=true) AS
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

-- 4. Test that we can now query course_invitations
SELECT 'Testing course_invitations access...' as status;
SELECT COUNT(*) as invitation_count FROM public.course_invitations;