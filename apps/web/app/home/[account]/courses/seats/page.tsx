'use client';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { useParams } from 'next/navigation';

export default function TeamCourseSeatPage() {
  const params = useParams();
  const account = params.account as string;

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'courses:seatManagement'} />}
        description={<Trans i18nKey={'courses:seatManagementDescription'} />}
      />

      <PageBody>
        <div className="text-center py-8">
          <p>Seat management page is loading...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Account slug: {account}
          </p>
        </div>
      </PageBody>
    </>
  );
}