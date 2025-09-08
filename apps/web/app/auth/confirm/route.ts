import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

// Support both recovery link styles:
// 1) token_hash + type=recovery (older email template)
// 2) code (PKCE) + type=recovery (newer flow)
export async function GET(request: NextRequest) {
  const service = createAuthCallbackService(getSupabaseServerClient());

  const currentUrl = new URL(request.url);
  const hasCode = currentUrl.searchParams.get('code');

  if (hasCode) {
    // PKCE/code style recovery link
    const { nextPath } = await service.exchangeCodeForSession(request, {
      joinTeamPath: pathsConfig.app.joinTeam,
      redirectPath: pathsConfig.app.home,
    });

    const finalPath = nextPath === '/' ? pathsConfig.app.home : nextPath;
    return redirect(finalPath);
  }

  // token_hash style recovery link
  const url = await service.verifyTokenHash(request, {
    joinTeamPath: pathsConfig.app.joinTeam,
    redirectPath: pathsConfig.app.home,
  });

  return NextResponse.redirect(url);
}

