import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignInMethodsContainer } from '@kit/auth/sign-in';
import { Button } from '@kit/ui/button';
import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import authConfig from '~/config/auth.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

interface SignInPageProps {
  searchParams: Promise<{
    invite_token?: string;
    invitation_token?: string;
    course_token?: string;
    next?: string;
    redirect?: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('auth:signIn'),
  };
};

async function SignInPage({ searchParams }: SignInPageProps) {
  const { invite_token, invitation_token, course_token, next, redirect } = await searchParams;
  const inviteToken = invitation_token || invite_token;
  const redirectTo = redirect || next;

  // Check if user is already authenticated
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // If user is authenticated and has an invite token, redirect to callback to process it
  if (user && (inviteToken || course_token)) {
    const callbackParams = new URLSearchParams();
    if (inviteToken) callbackParams.append('invite_token', inviteToken);
    if (course_token) callbackParams.append('course_token', course_token);
    if (redirectTo) callbackParams.append('redirect', redirectTo);
    
    const callbackUrl = `${pathsConfig.auth.callback}?${callbackParams.toString()}`;
    redirect(callbackUrl);
  }
  
  // If authenticated without invite token, redirect to home
  if (user && !inviteToken && !course_token) {
    redirect(redirectTo || pathsConfig.app.home);
  }

  // Build query params for sign-up link
  const queryParams = new URLSearchParams();
  if (inviteToken) queryParams.append('invite_token', inviteToken);
  if (course_token) queryParams.append('course_token', course_token);
  if (redirect) queryParams.append('redirect', redirect);
  
  const signUpPath = pathsConfig.auth.signUp + 
    (queryParams.toString() ? `?${queryParams.toString()}` : '');

  // Build callback path with redirect
  const callbackPath = redirect 
    ? `${pathsConfig.auth.callback}?redirect=${encodeURIComponent(redirect)}`
    : pathsConfig.auth.callback;

  const paths = {
    callback: callbackPath,
    returnPath: redirectTo || pathsConfig.app.home,
    joinTeam: pathsConfig.app.joinTeam,
  };

  return (
    <>
      <div className={'flex flex-col items-center gap-1'}>
        <Heading level={4} className={'tracking-tight'}>
          <Trans i18nKey={'auth:signInHeading'} />
        </Heading>

        <p className={'text-muted-foreground text-sm'}>
          <Trans i18nKey={'auth:signInSubheading'} />
        </p>
      </div>

      <SignInMethodsContainer
        inviteToken={inviteToken || course_token}
        paths={paths}
        providers={authConfig.providers}
      />

      <div className={'flex justify-center'}>
        <Button asChild variant={'link'} size={'sm'}>
          <Link href={signUpPath} prefetch={true}>
            <Trans i18nKey={'auth:doNotHaveAccountYet'} />
          </Link>
        </Button>
      </div>
    </>
  );
}

export default withI18n(SignInPage);
