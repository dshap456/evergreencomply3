import { use } from 'react';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { withI18n } from '~/lib/i18n/with-i18n';
import { CourseSeatManagement } from './_components/course-seat-management';

interface TeamCourseSeatPageProps {
  params: Promise<{ account: string }>;
}

function TeamCourseSeatPage({ params }: TeamCourseSeatPageProps) {
  const { account } = use(params);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'courses:seatManagement'} />}
        description={<Trans i18nKey={'courses:seatManagementDescription'} />}
      />

      <PageBody>
        <CourseSeatManagement accountSlug={account} />
      </PageBody>
    </>
  );
}

export default withI18n(TeamCourseSeatPage);