import { use } from 'react';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { withI18n } from '~/lib/i18n/with-i18n';
import { LearnerCoursesDashboard } from '~/home/(user)/courses/_components/learner-courses-dashboard';

interface TeamMyLearningPageProps {
  params: Promise<{ account: string }>;
}

function TeamMyLearningPage({ params }: TeamMyLearningPageProps) {
  const { account } = use(params);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'courses:learner.myLearning'} />}
        description={<Trans i18nKey={'courses:learner.learnerDashboardDescription'} />}
      />

      <PageBody>
        <LearnerCoursesDashboard />
      </PageBody>
    </>
  );
}

export default withI18n(TeamMyLearningPage);