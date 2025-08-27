-- Fix the accept_course_invitation function to use the user's ID as account_id
-- The account_id field in course_enrollments represents the user who is enrolled,
-- not the team account that provided the seats

CREATE OR REPLACE FUNCTION public.accept_course_invitation(p_invite_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
        WHERE account_id = v_user_id AND course_id = v_invitation.course_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already enrolled in this course');
    END IF;

    -- Check available seats
    v_available_seats := public.get_available_course_seats(v_invitation.account_id, v_invitation.course_id);

    IF v_available_seats <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No available seats for this course');
    END IF;

    -- Create enrollment - CRITICAL FIX: Use v_user_id as account_id, not v_invitation.account_id
    INSERT INTO public.course_enrollments (
        account_id,           -- This should be the user's ID, not the team account ID
        course_id,
        invited_by,
        invitation_id,
        enrolled_at,
        customer_name        -- Use the name from the invitation
    ) VALUES (
        v_user_id,           -- The user who is enrolling
        v_invitation.course_id,
        v_invitation.invited_by,
        v_invitation.id,
        NOW(),
        v_invitation.invitee_name  -- Use the name provided in the invitation
    ) RETURNING id INTO v_enrollment_id;

    -- Mark invitation as accepted
    UPDATE public.course_invitations
    SET accepted_at = NOW(), accepted_by = v_user_id
    WHERE id = v_invitation.id;

    RETURN jsonb_build_object(
        'success', true,
        'enrollment_id', v_enrollment_id,
        'course_id', v_invitation.course_id,
        'account_id', v_user_id  -- Return the user's account ID
    );
END;
$function$;

-- Fix existing enrollments that were incorrectly created with team account IDs
-- This updates enrollments that have invitation_id set and where the account_id
-- doesn't match the accepting user
UPDATE course_enrollments ce
SET account_id = ci.accepted_by
FROM course_invitations ci
WHERE ce.invitation_id = ci.id
AND ci.accepted_by IS NOT NULL
AND ce.account_id != ci.accepted_by;

-- Also ensure customer_name is populated from invitations where missing
UPDATE course_enrollments ce
SET customer_name = ci.invitee_name
FROM course_invitations ci
WHERE ce.invitation_id = ci.id
AND ce.customer_name IS NULL
AND ci.invitee_name IS NOT NULL;