'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';

import { PersonalAccountDropdown } from '@kit/accounts/personal-account-dropdown';
import { useSignOut } from '@kit/supabase/hooks/use-sign-out';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import featuresFlagConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

const ModeToggle = dynamic(() =>
  import('@kit/ui/mode-toggle').then((mod) => ({
    default: mod.ModeToggle,
  })),
);

const MobileModeToggle = dynamic(() =>
  import('@kit/ui/mobile-mode-toggle').then((mod) => ({
    default: mod.MobileModeToggle,
  })),
);

const paths = {
  home: pathsConfig.app.home,
};

const features = {
  enableThemeToggle: featuresFlagConfig.enableThemeToggle,
};

export function SiteHeaderAccountSection() {
  const session = useSession();
  const signOut = useSignOut();

  if (session.data) {
    return (
      <PersonalAccountDropdown
        showProfileName={false}
        paths={paths}
        features={features}
        user={session.data.user}
        signOutRequested={() => signOut.mutateAsync()}
      />
    );
  }

  return <AuthButtons />;
}

function AuthButtons() {
  return (
    <div className={'animate-in fade-in flex items-center gap-2 md:gap-3 duration-500'}>
      {/* Theme toggle (optional) */}
      <div className={'hidden md:flex'}>
        <If condition={features.enableThemeToggle}>
          <ModeToggle />
        </If>
      </div>

      <div className={'md:hidden'}>
        <If condition={features.enableThemeToggle}>
          <MobileModeToggle />
        </If>
      </div>

      {/* Primary CTAs: DOT and EPA */}
      <div className={'flex items-center gap-2 md:gap-3'}>
        <Button asChild className="text-xs md:text-sm" variant={'default'}>
          <Link href={'/courses/dot-hazmat'}>DOT HAZMAT Training</Link>
        </Button>
        <Button asChild className="text-xs md:text-sm" variant={'outline'}>
          <Link href={'/courses/epa-rcra'}>EPA RCRA Training</Link>
        </Button>
      </div>

      {/* Auth links */}
      <div className={'hidden md:flex items-center gap-2 md:gap-3 ml-1'}>
        <Button asChild variant={'ghost'}>
          <Link href={pathsConfig.auth.signIn}>
            <Trans i18nKey={'auth:signIn'} />
          </Link>
        </Button>
        <Button asChild variant={'secondary'}>
          <Link href={pathsConfig.auth.signUp}>
            <Trans i18nKey={'auth:signUp'} />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function useSession() {
  const client = useSupabase();

  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await client.auth.getSession();

      return data.session;
    },
  });
}
