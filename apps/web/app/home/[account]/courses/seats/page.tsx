'use client';

import { Suspense } from 'react';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';
import { Spinner } from '@kit/ui/spinner';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { CourseSeatManagement } from './_components/course-seat-management';
import { ErrorBoundary } from './_components/error-boundary';
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
        <ErrorBoundary>
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          }>
            <CourseSeatManagement accountSlug={account} />
          </Suspense>
        </ErrorBoundary>
      </PageBody>
    </>
  );
}