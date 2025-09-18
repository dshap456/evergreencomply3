import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import pathsConfig from '~/config/paths.config';

export async function GET(request: NextRequest) {
  const client = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient();
  const service = createAuthCallbackService(client);

  // Check for invitation token and redirect parameter BEFORE processing with the service
  const searchParams = request.nextUrl.searchParams;
  const invitationToken = searchParams.get('invitation_token') || searchParams.get('invite_token');
  const courseToken = searchParams.get('course_token');
  const redirectTo = searchParams.get('redirect');


  // Default behavior - no special invitation handling
  let shouldProcessCourseInvite = false;
  let shouldPassToTeamFlow = false;
  let effectiveToken = invitationToken;

  // If we have an explicit course_token, it's definitely a course invitation
  if (courseToken) {
    shouldProcessCourseInvite = true;
    effectiveToken = courseToken;
  } else if (invitationToken) {
    // For backward compatibility, check if this is a course invitation (use admin client to bypass RLS)
    const { data: courseInvite } = await adminClient
      .from('course_invitations')
      .select('*')
      .eq('invite_token', invitationToken)
      .single();

    if (courseInvite) {
      shouldProcessCourseInvite = true;
    } else {
      // Since we don't have a team invitations table, this is an invalid token
      // Don't pass it to the team flow
      shouldPassToTeamFlow = false;
    }
  }

  // Build the request to pass to the service
  let processRequest: Request = request;

  // Remove invitation tokens from the request unless it's a valid team invitation
  // This prevents the auth service from automatically redirecting to /join
  if (invitationToken || courseToken) {
    const url = new URL(request.url);

    if (!shouldPassToTeamFlow) {
      // Remove all token parameters to prevent incorrect routing
      url.searchParams.delete('invite_token');
      url.searchParams.delete('invitation_token');
      url.searchParams.delete('course_token');
    }
    // If it IS a team flow, keep the invite_token for the service to handle

    processRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
    });
  }

  const { nextPath } = await service.exchangeCodeForSession(
    processRequest,
    {
      joinTeamPath: pathsConfig.app.joinTeam,
      redirectPath: pathsConfig.app.home,
    }
  );

  if (shouldProcessCourseInvite && effectiveToken) {
    // Process course invitation
    const { data: { user } } = await client.auth.getUser();

    if (user?.email) {
      // First, ensure the invitation token is in the pending_invitation_tokens table
      // This is needed for password sign-ups where we don't create it during invitation sending
      const { data: invitation } = await adminClient
        .from('course_invitations')
        .select('*')
        .eq('invite_token', effectiveToken)
        .single();


      if (invitation) {
        // Check if token already exists in pending_invitation_tokens
        // IMPORTANT: Use the INVITATION email, not the user's email
        // This handles cases where user signs up with different email
        const { data: existingToken } = await client
          .from('pending_invitation_tokens')
          .select('*')
          .eq('email', invitation.email) // Use invitation email
          .eq('invitation_token', effectiveToken)
          .single();


        if (!existingToken) {
          // Insert the token if it doesn't exist
          const { error: insertError } = await client
            .from('pending_invitation_tokens')
            .insert({
              email: invitation.email, // Use invitation email, not user email
              invitation_token: effectiveToken,
              invitation_type: 'course',
            });

        }
      }

      // Process pending invitation using the invitation token directly
      // This handles cases where user signs up with different email than invited
      const { data: result, error: rpcError } = await client.rpc('process_pending_course_invitation_by_token', {
        p_user_id: user.id,
        p_invitation_token: effectiveToken
      });

      if (result?.success) {
        // Redirect to courses page after successful invitation processing
        return redirect(pathsConfig.app.personalAccountCourses);
      } else {
        console.error('❌ Course invitation processing failed:', result, rpcError);
      }
    }
  }

  // ALSO check if user has any pending invitations even without a token in the URL
  // This is CRITICAL for password signups where the email verification doesn't include the token
  const { data: { user } } = await client.auth.getUser();
  if (user?.email && !invitationToken && !courseToken) {
    // IMPORTANT: Use admin client to bypass RLS policies that block users from seeing invitations
    const adminClient = getSupabaseServerAdminClient();

    // Check for course invitations directly by email using admin client
    const { data: courseInvite } = await adminClient
      .from('course_invitations')
      .select('*')
      .eq('email', user.email)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (courseInvite) {
      // Process using the token from the invitation
      const { data: result, error: rpcError } = await client.rpc('process_pending_course_invitation_by_token', {
        p_user_id: user.id,
        p_invitation_token: courseInvite.invite_token
      });

      if (result?.success) {
        // Redirect to courses page after successful invitation processing
        return redirect(pathsConfig.app.personalAccountCourses);
      }
    }

    // Also check pending_invitation_tokens as fallback
    const { data: pendingInvite } = await client
      .from('pending_invitation_tokens')
      .select('*')
      .eq('email', user.email)
      .is('processed_at', null)
      .limit(1)
      .single();

    if (pendingInvite) {
      // Process the pending invitation
      const { data: result, error: rpcError } = await client.rpc('process_pending_course_invitation', {
        p_user_email: user.email
      });

      if (result?.success) {
        // Redirect to courses page after successful invitation processing
        return redirect(pathsConfig.app.personalAccountCourses);
      }
    }
  }

  // For magic links, ensure we're going to the right place
  // Check if we have a redirect parameter from the original sign-up/sign-in
  let finalPath = nextPath === '/' ? pathsConfig.app.home : nextPath;

  // If we have a redirect parameter (like /cart), use that instead
  if (redirectTo && redirectTo.startsWith('/')) {
    finalPath = redirectTo;
  }

  return redirect(finalPath);
}
