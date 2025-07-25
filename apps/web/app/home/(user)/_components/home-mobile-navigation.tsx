'use client';

import Link from 'next/link';

import { LogOut, Menu } from 'lucide-react';

import { useSignOut } from '@kit/supabase/hooks/use-sign-out';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import featuresFlagConfig from '~/config/feature-flags.config';
import { personalAccountNavigationConfig } from '~/config/personal-account-navigation.config';

// home imports
import { HomeAccountSelector } from '../_components/home-account-selector';
import type { UserWorkspace } from '../_lib/server/load-user-workspace';

export function HomeMobileNavigation(props: { workspace: UserWorkspace }) {
  const signOut = useSignOut();

  // Filter navigation config based on user role
  const isSuperAdmin = props.workspace.user.app_metadata?.role === 'super-admin';
  
  const navigationRoutes = isSuperAdmin
    ? personalAccountNavigationConfig.routes
    : personalAccountNavigationConfig.routes.filter(
        route => route.label !== 'Admin'
      );

  const Links = navigationRoutes.map((item, index) => {
    if ('children' in item) {
      return item.children.map((child) => {
        return (
          <DropdownLink
            key={child.path}
            Icon={child.Icon}
            path={child.path}
            label={child.label}
          />
        );
      });
    }

    if ('divider' in item) {
      return <DropdownMenuSeparator key={index} />;
    }
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Menu className={'h-9'} />
      </DropdownMenuTrigger>

      <DropdownMenuContent sideOffset={10} className={'w-screen rounded-none'}>
        <If condition={featuresFlagConfig.enableTeamAccounts}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <Trans i18nKey={'common:yourAccounts'} />
            </DropdownMenuLabel>

            <HomeAccountSelector
              userId={props.workspace.user.id}
              accounts={props.workspace.accounts}
              collisionPadding={0}
            />
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
        </If>

        <DropdownMenuGroup>{Links}</DropdownMenuGroup>

        <DropdownMenuSeparator />

        <SignOutDropdownItem onSignOut={() => signOut.mutateAsync()} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DropdownLink(
  props: React.PropsWithChildren<{
    path: string;
    label: string;
    Icon: React.ReactNode;
  }>,
) {
  return (
    <DropdownMenuItem asChild key={props.path}>
      <Link
        href={props.path}
        className={'flex h-12 w-full items-center space-x-4'}
      >
        {props.Icon}

        <span>
          <Trans i18nKey={props.label} defaults={props.label} />
        </span>
      </Link>
    </DropdownMenuItem>
  );
}

function SignOutDropdownItem(
  props: React.PropsWithChildren<{
    onSignOut: () => unknown;
  }>,
) {
  return (
    <DropdownMenuItem
      className={'flex h-12 w-full items-center space-x-4'}
      onClick={props.onSignOut}
    >
      <LogOut className={'h-6'} />

      <span>
        <Trans i18nKey={'common:signOut'} defaults={'Sign out'} />
      </span>
    </DropdownMenuItem>
  );
}
