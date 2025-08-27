-- Create a new function that processes invitations by token instead of email
-- This fixes the issue where users sign up with different email than invited
CREATE OR REPLACE FUNCTION public.process_pending_course_invitation_by_token(
  p_user_id UUID,
  p_invitation_token VARCHAR
)
RETURNS JSONB
AS $$
DECLARE
  v_invitation RECORD;
  v_user_email VARCHAR;
BEGIN
  -- Get user email from user ID
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id
  LIMIT 1;
  
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Find the course invitation by token directly (not by email)
  SELECT ci.*
  INTO v_invitation
  FROM public.course_invitations ci
  WHERE ci.invite_token = p_invitation_token
    AND ci.accepted_at IS NULL
  LIMIT 1;
  
  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Check if already enrolled
  IF EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE user_id = p_user_id
      AND course_id = v_invitation.course_id
  ) THEN
    -- Already enrolled, just mark invitation as accepted
    UPDATE public.course_invitations
    SET accepted_at = NOW(),
        accepted_by = p_user_id
    WHERE id = v_invitation.id;
    
    -- Mark token as processed in pending_invitation_tokens
    UPDATE public.pending_invitation_tokens
    SET processed_at = NOW()
    WHERE invitation_token = p_invitation_token;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already enrolled',
      'course_id', v_invitation.course_id,
      'account_id', v_invitation.account_id
    );
  END IF;
  
  -- Create enrollment with invited_by field
  INSERT INTO public.course_enrollments (
    user_id,
    course_id,
    account_id,
    invitation_id,
    invited_by,
    enrolled_at
  ) VALUES (
    p_user_id,
    v_invitation.course_id,
    v_invitation.account_id,
    v_invitation.id,
    v_invitation.invited_by,
    NOW()
  );
  
  -- Update invitation as accepted
  UPDATE public.course_invitations
  SET accepted_at = NOW(),
      accepted_by = p_user_id
  WHERE id = v_invitation.id;
  
  -- Mark token as processed
  UPDATE public.pending_invitation_tokens
  SET processed_at = NOW()
  WHERE invitation_token = p_invitation_token;
  
  -- If invitee_name is provided, update user's account name
  IF v_invitation.invitee_name IS NOT NULL THEN
    UPDATE public.accounts
    SET name = v_invitation.invitee_name
    WHERE id = p_user_id
      AND is_personal_account = true
      AND (name IS NULL OR name = '' OR name = split_part(v_user_email, '@', 1));
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'course_id', v_invitation.course_id,
    'account_id', v_invitation.account_id,
    'enrollment_id', (SELECT id FROM public.course_enrollments WHERE user_id = p_user_id AND course_id = v_invitation.course_id LIMIT 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_pending_course_invitation_by_token(UUID, VARCHAR) TO authenticated, service_role;

-- Also update the original function to handle the case better
CREATE OR REPLACE FUNCTION public.process_pending_course_invitation(
  p_user_email VARCHAR
)
RETURNS JSONB
AS $$
DECLARE
  v_user_id UUID;
  v_invitation_token VARCHAR;
  v_invitation RECORD;
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- First try to find invitation by the user's email
  SELECT ci.invite_token
  INTO v_invitation_token
  FROM public.course_invitations ci
  WHERE ci.email = p_user_email
    AND ci.accepted_at IS NULL
  ORDER BY ci.created_at DESC
  LIMIT 1;
  
  -- If no invitation found by email, check pending_invitation_tokens
  IF v_invitation_token IS NULL THEN
    SELECT invitation_token
    INTO v_invitation_token
    FROM public.pending_invitation_tokens
    WHERE email = p_user_email
      AND processed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  IF v_invitation_token IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending invitation found');
  END IF;
  
  -- Process the course invitation using the token we found
  SELECT ci.*
  INTO v_invitation
  FROM public.course_invitations ci
  WHERE ci.invite_token = v_invitation_token
    AND ci.accepted_at IS NULL
  LIMIT 1;
  
  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Check if already enrolled
  IF EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE user_id = v_user_id
      AND course_id = v_invitation.course_id
  ) THEN
    -- Already enrolled, just mark invitation as accepted
    UPDATE public.course_invitations
    SET accepted_at = NOW(),
        accepted_by = v_user_id
    WHERE id = v_invitation.id;
    
    UPDATE public.pending_invitation_tokens
    SET processed_at = NOW()
    WHERE invitation_token = v_invitation_token;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already enrolled',
      'course_id', v_invitation.course_id,
      'account_id', v_invitation.account_id
    );
  END IF;
  
  -- Create enrollment with invited_by field
  INSERT INTO public.course_enrollments (
    user_id,
    course_id,
    account_id,
    invitation_id,
    invited_by,
    enrolled_at
  ) VALUES (
    v_user_id,
    v_invitation.course_id,
    v_invitation.account_id,
    v_invitation.id,
    v_invitation.invited_by,
    NOW()
  );
  
  -- Update invitation as accepted
  UPDATE public.course_invitations
  SET accepted_at = NOW(),
      accepted_by = v_user_id
  WHERE id = v_invitation.id;
  
  -- Mark token as processed
  UPDATE public.pending_invitation_tokens
  SET processed_at = NOW()
  WHERE invitation_token = v_invitation_token;
  
  -- If invitee_name is provided, update user's account name
  IF v_invitation.invitee_name IS NOT NULL THEN
    UPDATE public.accounts
    SET name = v_invitation.invitee_name
    WHERE id = v_user_id
      AND is_personal_account = true
      AND (name IS NULL OR name = '' OR name = split_part(p_user_email, '@', 1));
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'course_id', v_invitation.course_id,
    'account_id', v_invitation.account_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;