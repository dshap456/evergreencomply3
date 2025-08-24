import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

export async function GET(request: NextRequest) {
  const client = getSupabaseServerClient();
  const service = createAuthCallbackService(client);

  const { nextPath } = await service.exchangeCodeForSession(request, {
    joinTeamPath: pathsConfig.app.joinTeam,
    redirectPath: pathsConfig.app.home,
  });

  // Check for invitation token in URL params
  const searchParams = request.nextUrl.searchParams;
  const invitationToken = searchParams.get('invitation_token') || searchParams.get('invite_token');
  
  if (invitationToken) {
    // Process course invitation
    const { data: { user } } = await client.auth.getUser();
    
    if (user?.email) {
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
