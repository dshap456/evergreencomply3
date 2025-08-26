import Link from 'next/link';

import { SignUpMethodsContainer } from '@kit/auth/sign-up';
import { Button } from '@kit/ui/button';
import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';

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
    redirect?: string;
  }>;
}


async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams;
  const inviteToken = params.invite_token;
  const redirectTo = params.redirect;

  // Build query params for sign-in link
  const queryParams = new URLSearchParams();
  if (inviteToken) queryParams.append('invite_token', inviteToken);
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
        inviteToken={inviteToken}
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
