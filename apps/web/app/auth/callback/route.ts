import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

export async function GET(request: NextRequest) {
  const client = getSupabaseServerClient();
  
  // Check for invitation token BEFORE processing with the service
  const searchParams = request.nextUrl.searchParams;
  const invitationToken = searchParams.get('invitation_token') || searchParams.get('invite_token');
  
  // Check if this is a course invitation (not a team invitation)
  let isCourseInvitation = false;
  if (invitationToken) {
    const { data: courseInvite } = await client
      .from('course_invitations')
      .select('*')
      .eq('invite_token', invitationToken)
      .single();
    
    isCourseInvitation = !!courseInvite;
  }
  
  // If it's a course invitation, remove the invite_token from the URL before processing
  // to prevent the auth service from treating it as a team invite
  let processRequest: Request = request;
  if (isCourseInvitation) {
    const url = new URL(request.url);
    url.searchParams.delete('invite_token');
    url.searchParams.delete('invitation_token');
    // Create a new request with the modified URL
    processRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
    });
  }
  
  const service = createAuthCallbackService(client);
  const { nextPath } = await service.exchangeCodeForSession(
    processRequest, 
    {
      joinTeamPath: pathsConfig.app.joinTeam,
      redirectPath: pathsConfig.app.home,
    }
  );
  
  if (isCourseInvitation && invitationToken) {
    // Process course invitation
    const { data: { user } } = await client.auth.getUser();
    
    if (user?.email) {
      // First, ensure the invitation token is in the pending_invitation_tokens table
      // This is needed for password sign-ups where we don't create it during invitation sending
      const { data: invitation } = await client
        .from('course_invitations')
        .select('*')
        .eq('invite_token', invitationToken)
        .single();
      
      if (invitation) {
        // Check if token already exists in pending_invitation_tokens
        const { data: existingToken } = await client
          .from('pending_invitation_tokens')
          .select('*')
          .eq('email', user.email)
          .eq('invitation_token', invitationToken)
          .single();
        
        if (!existingToken) {
          // Insert the token if it doesn't exist
          await client
            .from('pending_invitation_tokens')
            .insert({
              email: user.email,
              invitation_token: invitationToken,
              invitation_type: 'course',
            });
        }
      }
      
      // Process pending invitation
      const { data: result } = await client.rpc('process_pending_course_invitation', {
        p_user_email: user.email
      });
      
      if (result?.success) {
        // Redirect to courses page after successful invitation processing
        return redirect(pathsConfig.app.personalAccountCourses);
      }
    }
  }

  // For magic links, ensure we're going to the right place
  const finalPath = nextPath === '/' ? pathsConfig.app.home : nextPath;

  return redirect(finalPath);
}
