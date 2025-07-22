import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { HomeLayoutPageHeader } from '../_components/home-page-header';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('courses:learner.coursesPage');

  return {
    title,
  };
};

function LearnerCoursesPageSimpleTest() {
  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'courses:learner.myLearning'} />}
        description={<Trans i18nKey={'courses:learner.learnerDashboardDescription'} />}
      />

      <PageBody>
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Simple Test Page</h1>
          <p>If you can see this, the basic page structure works.</p>
          <p>The issue might be in the data loading or specific components.</p>
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(LearnerCoursesPageSimpleTest);