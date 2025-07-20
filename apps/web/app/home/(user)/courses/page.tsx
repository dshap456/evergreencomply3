import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { HomeLayoutPageHeader } from '../_components/home-page-header';
import { LearnerCoursesDashboard } from './_components/learner-courses-dashboard';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('courses:learner.coursesPage');

  return {
    title,
  };
};

function LearnerCoursesPage() {
  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'courses:learner.myLearning'} />}
        description={<Trans i18nKey={'courses:learner.learnerDashboardDescription'} />}
      />

      <PageBody>
        <LearnerCoursesDashboard />
      </PageBody>
    </>
  );
}

export default withI18n(LearnerCoursesPage);