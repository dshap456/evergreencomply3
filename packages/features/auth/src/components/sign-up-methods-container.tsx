'use client';

import { useCallback, useMemo } from 'react';

import type { Provider } from '@supabase/supabase-js';

import { useRouter } from 'next/navigation';

import { isBrowser } from '@kit/shared/utils';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { If } from '@kit/ui/if';
import { Separator } from '@kit/ui/separator';
import { Trans } from '@kit/ui/trans';

import { ExistingAccountHint } from './existing-account-hint';
import { MagicLinkAuthContainer } from './magic-link-auth-container';
import { OauthProviders } from './oauth-providers';
import { OtpSignInContainer } from './otp-sign-in-container';
import { EmailPasswordSignUpContainer } from './password-sign-up-container';

export function SignUpMethodsContainer(props: {
  paths: {
    callback: string;
    appHome: string;
  };

  providers: {
    password: boolean;
    magicLink: boolean;
    otp: boolean;
    oAuth: Provider[];
  };

  displayTermsCheckbox?: boolean;
  inviteToken?: string;
}) {
  const router = useRouter();
  const redirectUrl = getCallbackUrl(props);
  const defaultValues = getDefaultValues();

  const postSignUpPath = useMemo(() => {
    if (!redirectUrl) {
      return props.paths.appHome;
    }

    try {
      const parsed = new URL(redirectUrl);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return props.paths.appHome;
    }
  }, [redirectUrl, props.paths.appHome]);

  const handleSignUpSuccess = useCallback(() => {
    router.replace(postSignUpPath);
  }, [postSignUpPath, router]);

  return (
    <>
      {/* Show hint if user might already have an account */}
      <ExistingAccountHint />

      <If condition={props.inviteToken}>
        <InviteAlert />
      </If>

      <If condition={props.providers.password}>
        <EmailPasswordSignUpContainer
          emailRedirectTo={redirectUrl}
          defaultValues={defaultValues}
          displayTermsCheckbox={props.displayTermsCheckbox}
          onSignUp={handleSignUpSuccess}
        />
      </If>

      <If condition={props.providers.otp}>
        <OtpSignInContainer
          inviteToken={props.inviteToken}
          shouldCreateUser={true}
        />
      </If>

      <If condition={props.providers.magicLink}>
        <MagicLinkAuthContainer
          inviteToken={props.inviteToken}
          redirectUrl={redirectUrl}
          shouldCreateUser={true}
          defaultValues={defaultValues}
          displayTermsCheckbox={props.displayTermsCheckbox}
        />
      </If>

      <If condition={props.providers.oAuth.length}>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>

          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">
              <Trans i18nKey="auth:orContinueWith" />
            </span>
          </div>
        </div>

        <OauthProviders
          enabledProviders={props.providers.oAuth}
          inviteToken={props.inviteToken}
          shouldCreateUser={true}
          paths={{
            callback: props.paths.callback,
            returnPath: props.paths.appHome,
          }}
        />
      </If>
    </>
  );
}

function getCallbackUrl(props: {
  paths: {
    callback: string;
    appHome: string;
  };

  inviteToken?: string;
}) {
  if (!isBrowser()) {
    return '';
  }

  const redirectPath = props.paths.callback;
  const origin = window.location.origin;
  const url = new URL(redirectPath, origin);

  if (props.inviteToken) {
    url.searchParams.set('invite_token', props.inviteToken);
  }

  const searchParams = new URLSearchParams(window.location.search);
  const next = searchParams.get('next');

  if (next) {
    url.searchParams.set('next', next);
  }

  return url.href;
}

function getDefaultValues() {
  if (!isBrowser()) {
    return { email: '' };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const inviteToken = searchParams.get('invite_token');

  if (!inviteToken) {
    return { email: '' };
  }

  return {
    email: searchParams.get('email') ?? '',
  };
}

function InviteAlert() {
  return (
    <Alert variant={'info'}>
      <AlertTitle>
        <Trans i18nKey={'auth:inviteAlertHeading'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'auth:inviteAlertBody'} />
      </AlertDescription>
    </Alert>
  );
}
