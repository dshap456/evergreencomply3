'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useAppEvents } from '@kit/shared/events';
import { useSignInWithOtp } from '@kit/supabase/hooks/use-sign-in-with-otp';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { toast } from '@kit/ui/sonner';
import { Trans } from '@kit/ui/trans';

import { useCaptchaToken } from '../captcha/client';
import { useLastAuthMethod } from '../hooks/use-last-auth-method';
import { TermsAndConditionsFormField } from './terms-and-conditions-form-field';

export function MagicLinkAuthContainer({
  inviteToken,
  redirectUrl,
  shouldCreateUser,
  defaultValues,
  displayTermsCheckbox,
}: {
  inviteToken?: string;
  redirectUrl: string;
  shouldCreateUser: boolean;
  displayTermsCheckbox?: boolean;

  defaultValues?: {
    email: string;
  };
}) {
  const { captchaToken, resetCaptchaToken } = useCaptchaToken();
  const { t } = useTranslation();
  const signInWithOtpMutation = useSignInWithOtp();
  const appEvents = useAppEvents();
  const { recordAuthMethod } = useLastAuthMethod();

  const form = useForm({
    resolver: zodResolver(
      z.object({
        email: z.string().email(),
      }),
    ),
    defaultValues: {
      email: defaultValues?.email ?? '',
    },
  });

  const onSubmit = ({ email }: { email: string }) => {
    const url = new URL(redirectUrl);

    if (inviteToken) {
      url.searchParams.set('invite_token', inviteToken);
    }

    const emailRedirectTo = url.href;

    const promise = async () => {
      await signInWithOtpMutation.mutateAsync({
        email,
        options: {
          emailRedirectTo,
          captchaToken,
          shouldCreateUser,
        },
      });

      recordAuthMethod('magic_link', { email });

      if (shouldCreateUser) {
        appEvents.emit({
          type: 'user.signedUp',
          payload: {
            method: 'magiclink',
          },
        });
      }
    };

    toast.promise(promise, {
      loading: t('auth:sendingEmailLink'),
      success: t(`auth:sendLinkSuccessToast`),
      error: t(`auth:errors.linkTitle`),
    });

    resetCaptchaToken();
  };

  if (signInWithOtpMutation.data) {
    return <SuccessAlert />;
  }

  return (
    <Form {...form}>
      <form className={'w-full'} onSubmit={form.handleSubmit(onSubmit)}>
        <div className={'flex flex-col space-y-4'}>
          <If condition={signInWithOtpMutation.error}>
            <ErrorAlert />
          </If>

          <FormField
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey={'common:emailAddress'} />
                </FormLabel>

                <FormControl>
                  <Input
                    data-test={'email-input'}
                    required
                    type="email"
                    placeholder={t('auth:emailPlaceholder')}
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
            name={'email'}
          />

          <If condition={displayTermsCheckbox}>
            <TermsAndConditionsFormField />
          </If>

          <Button disabled={signInWithOtpMutation.isPending}>
            <If
              condition={signInWithOtpMutation.isPending}
              fallback={<Trans i18nKey={'auth:sendEmailLink'} />}
            >
              <Trans i18nKey={'auth:sendingEmailLink'} />
            </If>
          </Button>
        </div>
      </form>
    </Form>
  );
}

function SuccessAlert() {
  return (
    <Alert variant={'success'}>
      <CheckIcon className={'h-4'} />

      <AlertTitle>
        <Trans i18nKey={'auth:sendLinkSuccess'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'auth:sendLinkSuccessDescription'} />
      </AlertDescription>
    </Alert>
  );
}

function ErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <ExclamationTriangleIcon className={'h-4'} />

      <AlertTitle>
        <Trans i18nKey={'auth:errors.linkTitle'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'auth:errors.linkDescription'} />
      </AlertDescription>
    </Alert>
  );
}
