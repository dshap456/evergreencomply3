-- Course Seat Management Migration
-- Run this SQL in Supabase SQL Editor to fix the invitation bug

-- 1. Create course_seats table to track purchased seats per course per account
CREATE TABLE IF NOT EXISTS public.course_seats (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    total_seats INTEGER NOT NULL DEFAULT 1 CHECK (total_seats > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(account_id, course_id)
);

-- Add indexes
CREATE INDEX idx_course_seats_account_id ON public.course_seats(account_id);
CREATE INDEX idx_course_seats_course_id ON public.course_seats(course_id);

-- Enable RLS
ALTER TABLE public.course_seats ENABLE ROW LEVEL SECURITY;

-- 2. Create course_invitations table
CREATE TABLE IF NOT EXISTS public.course_invitations (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_token VARCHAR(255) UNIQUE NOT NULL DEFAULT extensions.uuid_generate_v4()::text,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id),
    UNIQUE(email, course_id, account_id)
);

-- Add indexes
CREATE INDEX idx_course_invitations_account_id ON public.course_invitations(account_id);
CREATE INDEX idx_course_invitations_course_id ON public.course_invitations(course_id);
CREATE INDEX idx_course_invitations_invite_token ON public.course_invitations(invite_token);

-- Enable RLS
ALTER TABLE public.course_invitations ENABLE ROW LEVEL SECURITY;

-- 3. Add tracking columns to course_enrollments
ALTER TABLE public.course_enrollments 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invitation_id INTEGER REFERENCES public.course_invitations(id);

-- Add index for account-based queries
CREATE INDEX IF NOT EXISTS idx_course_enrollments_account_id ON public.course_enrollments(account_id);

-- 4. RLS Policies for course_seats

-- Team owners can view their account's course seats
CREATE POLICY "course_seats_select" ON public.course_seats
    FOR SELECT TO authenticated
    USING (
        public.has_role_on_account(account_id)
    );

-- Team owners can manage course seats
CREATE POLICY "course_seats_insert" ON public.course_seats
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_account_owner(account_id)
    );

CREATE POLICY "course_seats_update" ON public.course_seats
    FOR UPDATE TO authenticated
    USING (public.is_account_owner(account_id))
    WITH CHECK (public.is_account_owner(account_id));

CREATE POLICY "course_seats_delete" ON public.course_seats
    FOR DELETE TO authenticated
    USING (public.is_account_owner(account_id));

-- 5. RLS Policies for course_invitations

-- Team members can view invitations for their account
CREATE POLICY "course_invitations_select" ON public.course_invitations
    FOR SELECT TO authenticated
    USING (
        public.has_role_on_account(account_id) OR
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Team owners can create invitations
CREATE POLICY "course_invitations_insert" ON public.course_invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_account_owner(account_id) AND
        invited_by = auth.uid()
    );

-- Team owners can update invitations (e.g., cancel)
CREATE POLICY "course_invitations_update" ON public.course_invitations
    FOR UPDATE TO authenticated
    USING (public.is_account_owner(account_id))
    WITH CHECK (public.is_account_owner(account_id));

-- Team owners can delete invitations
CREATE POLICY "course_invitations_delete" ON public.course_invitations
    FOR DELETE TO authenticated
    USING (public.is_account_owner(account_id));

-- 6. Function to get available seats for a course
CREATE OR REPLACE FUNCTION public.get_available_course_seats(
    p_account_id UUID,
    p_course_id UUID
) RETURNS INTEGER
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_total_seats INTEGER;
    v_used_seats INTEGER;
BEGIN
    -- Get total seats
    SELECT total_seats INTO v_total_seats
    FROM public.course_seats
    WHERE account_id = p_account_id AND course_id = p_course_id;
    
    IF v_total_seats IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Count used seats (enrollments linked to this account)
    SELECT COUNT(*) INTO v_used_seats
    FROM public.course_enrollments
    WHERE account_id = p_account_id AND course_id = p_course_id;
    
    RETURN GREATEST(0, v_total_seats - v_used_seats);
END;
$$ LANGUAGE plpgsql;

-- 7. Function to accept course invitation
CREATE OR REPLACE FUNCTION public.accept_course_invitation(
    p_invite_token TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID;
    v_available_seats INTEGER;
    v_enrollment_id UUID;
BEGIN
    -- Get the current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM public.course_invitations
    WHERE invite_token = p_invite_token
    AND expires_at > NOW()
    AND accepted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if user already enrolled
    IF EXISTS (
        SELECT 1 FROM public.course_enrollments
        WHERE user_id = v_user_id AND course_id = v_invitation.course_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already enrolled in this course');
    END IF;
    
    -- Check available seats
    v_available_seats := public.get_available_course_seats(v_invitation.account_id, v_invitation.course_id);
    
    IF v_available_seats <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No available seats for this course');
    END IF;
    
    -- Create enrollment
    INSERT INTO public.course_enrollments (
        user_id,
        course_id,
        account_id,
        invited_by,
        invitation_id,
        enrolled_at
    ) VALUES (
        v_user_id,
        v_invitation.course_id,
        v_invitation.account_id,
        v_invitation.invited_by,
        v_invitation.id,
        NOW()
    ) RETURNING id INTO v_enrollment_id;
    
    -- Mark invitation as accepted
    UPDATE public.course_invitations
    SET accepted_at = NOW(), accepted_by = v_user_id
    WHERE id = v_invitation.id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'enrollment_id', v_enrollment_id,
        'course_id', v_invitation.course_id,
        'account_id', v_invitation.account_id
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_available_course_seats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_course_invitation(TEXT) TO authenticated;

-- 8. View for team owners to see course enrollments with progress
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
    u.email as user_email,
    acc.name as user_name,
    c.title as course_title,
    CASE 
        WHEN ce.invited_by IS NOT NULL THEN 'invited'
        ELSE 'self_enrolled'
    END as enrollment_type,
    inv.email as inviter_email
FROM public.course_enrollments ce
JOIN auth.users u ON ce.user_id = u.id
JOIN public.accounts acc ON u.id = acc.id AND acc.is_personal_account = true
JOIN public.courses c ON ce.course_id = c.id
LEFT JOIN auth.users inv ON ce.invited_by = inv.id
WHERE ce.account_id IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON public.team_course_enrollments TO authenticated;

-- Done! The course invitation feature should now work properly.