import { use } from 'react';
import { redirect } from 'next/navigation';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';
import { Alert, AlertDescription } from '@kit/ui/alert';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { withI18n } from '~/lib/i18n/with-i18n';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createTeamAccountsApi } from '@kit/team-accounts/api';

interface TeamCourseSeatPageProps {
  params: Promise<{ account: string }>;
}

async function TeamCourseSeatPageSimple({ params }: TeamCourseSeatPageProps) {
  const { account: accountSlug } = use(params);
  
  try {
    // Get the account data
    const client = getSupabaseServerClient();
    const api = createTeamAccountsApi(client);
    
    // Get account by slug
    const account = await api.getTeamAccount(accountSlug);
    
    if (!account) {
      redirect('/404');
    }

    // Get user to verify they're the owner
    const { data: { user } } = await client.auth.getUser();
    
    if (!user || account.primary_owner_user_id !== user.id) {
      return (
        <>
          <TeamAccountLayoutPageHeader
            account={accountSlug}
            title={<Trans i18nKey={'courses:seatManagement'} />}
            description={<Trans i18nKey={'courses:seatManagementDescription'} />}
          />
          <PageBody>
            <Alert>
              <AlertDescription>
                You don't have permission to view this page. Only team owners can manage course seats.
              </AlertDescription>
            </Alert>
          </PageBody>
        </>
      );
    }

    // For now, just show a simple message
    return (
      <>
        <TeamAccountLayoutPageHeader
          account={accountSlug}
          title={<Trans i18nKey={'courses:seatManagement'} />}
          description={<Trans i18nKey={'courses:seatManagementDescription'} />}
        />

        <PageBody>
          <div className="text-center py-8">
            <p>Seat management page is loading...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Account: {account.name} ({account.id})
            </p>
            <p className="text-sm text-muted-foreground">
              User: {user.email}
            </p>
          </div>
        </PageBody>
      </>
    );
  } catch (error) {
    console.error('Error in seat management page:', error);
    
    return (
      <>
        <TeamAccountLayoutPageHeader
          account={accountSlug}
          title={<Trans i18nKey={'courses:seatManagement'} />}
          description={<Trans i18nKey={'courses:seatManagementDescription'} />}
        />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>
              An error occurred loading this page. Please try refreshing.
              {error instanceof Error && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">Error details</summary>
                  <pre className="mt-2 text-xs">{error.message}</pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }
}

export default withI18n(TeamCourseSeatPageSimple);