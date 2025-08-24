-- Migration: Add name field to invitations and invitation tracking
-- Date: 2025-08-24
-- Purpose: Support name collection during invitation process

-- 1. Add name to course_invitations table
ALTER TABLE public.course_invitations
ADD COLUMN IF NOT EXISTS invitee_name VARCHAR(255);

-- 2. Create pending invitation tokens table for magic link resilience
CREATE TABLE IF NOT EXISTS public.pending_invitation_tokens (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  invitation_token UUID NOT NULL,
  invitation_type VARCHAR(50) DEFAULT 'course',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(email, invitation_token)
);

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_tokens_email 
ON public.pending_invitation_tokens(email);

CREATE INDEX IF NOT EXISTS idx_pending_tokens_created 
ON public.pending_invitation_tokens(created_at);

-- 4. Enable RLS on pending_invitation_tokens
ALTER TABLE public.pending_invitation_tokens ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for pending_invitation_tokens

-- Allow users to view their own pending invitations (by email)
CREATE POLICY "Users can view own pending invitations" 
ON public.pending_invitation_tokens
FOR SELECT 
TO authenticated
USING (auth.jwt() ->> 'email' = email);

-- Allow inserting invitation tokens (for both anon and authenticated)
CREATE POLICY "Allow storing invitation tokens"
ON public.pending_invitation_tokens
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow updating tokens when processed
CREATE POLICY "Allow marking tokens as processed"
ON public.pending_invitation_tokens
FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' = email)
WITH CHECK (auth.jwt() ->> 'email' = email);

-- 6. Function to cleanup old invitation tokens (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_invitation_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.pending_invitation_tokens
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to process pending invitation after sign-in
CREATE OR REPLACE FUNCTION public.process_pending_course_invitation(
  p_user_email VARCHAR(255)
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_invitation RECORD;
  v_result JSONB;
BEGIN
  -- Get the user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Find pending invitation token for this email
  SELECT pit.invitation_token
  INTO v_invitation
  FROM public.pending_invitation_tokens pit
  WHERE pit.email = p_user_email
    AND pit.processed_at IS NULL
  ORDER BY pit.created_at DESC
  LIMIT 1;
  
  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending invitation found');
  END IF;
  
  -- Process the course invitation
  SELECT ci.*
  INTO v_invitation
  FROM public.course_invitations ci
  WHERE ci.invite_token = v_invitation.invitation_token
    AND ci.accepted_at IS NULL
  LIMIT 1;
  
  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Create enrollment
  INSERT INTO public.course_enrollments (
    user_id,
    course_id,
    account_id,
    invitation_id,
    enrolled_at
  ) VALUES (
    v_user_id,
    v_invitation.course_id,
    v_invitation.account_id,
    v_invitation.id,
    NOW()
  );
  
  -- Update invitation as accepted
  UPDATE public.course_invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;
  
  -- Mark token as processed
  UPDATE public.pending_invitation_tokens
  SET processed_at = NOW()
  WHERE invitation_token = v_invitation.invite_token;
  
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.cleanup_old_invitation_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_pending_course_invitation(VARCHAR) TO authenticated, service_role;