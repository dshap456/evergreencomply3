import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  try {
    const { action, email, inviteToken, userId } = await request.json();
    const adminClient = getSupabaseServerAdminClient();
    
    if (action === 'create-sql-function') {
      // Create the new SQL function
      const { error } = await adminClient.rpc('query', {
        query: `
          -- Create a new function that processes invitations by token instead of email
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
        `
      });
      
      if (error) {
        // Try creating it without the wrapper
        const { data: result, error: createError } = await adminClient.from('raw_sql').upsert({
          sql: `The SQL function above`,
          executed_at: new Date().toISOString()
        });
        
        return NextResponse.json({ 
          message: 'Function might already exist or needs manual creation',
          error: error.message,
          note: 'Please run the SQL in the migration file manually in Supabase dashboard'
        });
      }
      
      return NextResponse.json({ success: true, message: 'SQL function created' });
    }
    
    if (action === 'check-status') {
      // Check current status of an invitation
      const { data: invitation } = await adminClient
        .from('course_invitations')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const { data: pendingTokens } = await adminClient
        .from('pending_invitation_tokens')
        .select('*')
        .eq('email', email);
      
      const { data: user } = await adminClient
        .from('auth.users')
        .select('id, email')
        .eq('email', email)
        .single();
      
      let enrollments = null;
      if (user) {
        const { data } = await adminClient
          .from('course_enrollments')
          .select('*')
          .eq('user_id', user.id);
        enrollments = data;
      }
      
      return NextResponse.json({
        invitation,
        pendingTokens,
        user,
        enrollments
      });
    }
    
    if (action === 'simulate-signup') {
      // Simulate what happens during signup/callback
      if (!userId || !inviteToken) {
        return NextResponse.json({ error: 'userId and inviteToken required' });
      }
      
      // Get the invitation
      const { data: invitation } = await adminClient
        .from('course_invitations')
        .select('*')
        .eq('invite_token', inviteToken)
        .single();
      
      if (!invitation) {
        return NextResponse.json({ error: 'Invitation not found' });
      }
      
      // Process using the new function
      const { data: result, error } = await adminClient.rpc('process_pending_course_invitation_by_token', {
        p_user_id: userId,
        p_invitation_token: inviteToken
      });
      
      if (error) {
        return NextResponse.json({ 
          error: 'Failed to process invitation',
          details: error.message,
          invitation
        });
      }
      
      // Check if enrollment was created
      const { data: enrollment } = await adminClient
        .from('course_enrollments')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', invitation.course_id)
        .single();
      
      return NextResponse.json({
        success: true,
        result,
        enrollment,
        invitation
      });
    }
    
    if (action === 'manual-fix') {
      // Manually fix a specific user's invitation
      if (!email) {
        return NextResponse.json({ error: 'email required' });
      }
      
      // Get user
      const { data: user } = await adminClient
        .from('auth.users')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (!user) {
        return NextResponse.json({ error: 'User not found. They need to sign up first.' });
      }
      
      // Get their latest invitation
      const { data: invitation } = await adminClient
        .from('course_invitations')
        .select('*')
        .eq('email', email)
        .eq('accepted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!invitation) {
        return NextResponse.json({ error: 'No pending invitation found' });
      }
      
      // Process it
      const { data: result, error } = await adminClient.rpc('process_pending_course_invitation_by_token', {
        p_user_id: user.id,
        p_invitation_token: invitation.invite_token
      });
      
      if (error) {
        return NextResponse.json({ 
          error: 'Failed to process invitation',
          details: error.message
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Invitation processed successfully',
        result
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test endpoint for invitation fix',
    actions: {
      'create-sql-function': 'Create the new SQL function',
      'check-status': 'Check status of an invitation (requires email)',
      'simulate-signup': 'Simulate signup flow (requires userId and inviteToken)',
      'manual-fix': 'Manually fix a user invitation (requires email)'
    }
  });
}