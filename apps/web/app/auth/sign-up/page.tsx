import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignUpMethodsContainer } from '@kit/auth/sign-up';
import { Button } from '@kit/ui/button';
import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import authConfig from '~/config/auth.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('auth:signUp'),
  };
};

interface Props {
  searchParams: Promise<{
    invite_token?: string;
    course_token?: string;
    redirect?: string;
  }>;
}


async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams;
  const inviteToken = params.invite_token;
  const courseToken = params.course_token;
  const rawRedirect = params.redirect;
  let redirectTo = rawRedirect;
  if (rawRedirect) {
    try {
      redirectTo = decodeURIComponent(rawRedirect);
    } catch {
      redirectTo = rawRedirect;
    }
  }

  // Check if user is already authenticated
  const supabase = getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // If user is authenticated and has an invite token, redirect to callback to process it
  if (user && (inviteToken || courseToken)) {
    const callbackParams = new URLSearchParams();
    if (inviteToken) callbackParams.append('invite_token', inviteToken);
    if (courseToken) callbackParams.append('course_token', courseToken);
    if (redirectTo) callbackParams.append('redirect', redirectTo);
    
    const callbackUrl = `${pathsConfig.auth.callback}?${callbackParams.toString()}`;
    redirect(callbackUrl);
  }
  
  // If authenticated without invite token, redirect to home
  if (user && !inviteToken && !courseToken) {
    redirect(redirectTo || pathsConfig.app.home);
  }

  // Build query params for sign-in link
  const queryParams = new URLSearchParams();
  if (inviteToken) queryParams.append('invite_token', inviteToken);
  if (courseToken) queryParams.append('course_token', courseToken);
  if (redirectTo) queryParams.append('redirect', redirectTo);
  
  const signInPath = pathsConfig.auth.signIn + 
    (queryParams.toString() ? `?${queryParams.toString()}` : '');
  
  // Build callback path with redirect
  const callbackPath = redirectTo 
    ? `${pathsConfig.auth.callback}?redirect=${encodeURIComponent(redirectTo)}`
    : pathsConfig.auth.callback;
  
  const paths = {
    callback: callbackPath,
    appHome: pathsConfig.app.home,
  };

  return (
    <>
      <div className={'flex flex-col items-center gap-1'}>
        <Heading level={4} className={'tracking-tight'}>
          <Trans i18nKey={'auth:signUpHeading'} />
        </Heading>

        <p className={'text-muted-foreground text-sm'}>
          <Trans i18nKey={'auth:signUpSubheading'} />
        </p>
      </div>

      <SignUpMethodsContainer
        providers={authConfig.providers}
        displayTermsCheckbox={authConfig.displayTermsCheckbox}
        inviteToken={inviteToken || courseToken}
        paths={paths}
      />

      <div className={'flex justify-center'}>
        <Button asChild variant={'link'} size={'sm'}>
          <Link href={signInPath} prefetch={true}>
            <Trans i18nKey={'auth:alreadyHaveAnAccount'} />
          </Link>
        </Button>
      </div>
    </>
  );
}

export default withI18n(SignUpPage);
