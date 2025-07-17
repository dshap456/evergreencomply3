import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../_components/team-account-layout-page-header';
import { CoursesList } from './_components/courses-list';
import { loadTeamCourses } from './_lib/server/team-courses.loader';

interface TeamAccountCoursesPageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('courses:title');

  return {
    title,
  };
};

async function TeamAccountCoursesPage({ params }: TeamAccountCoursesPageProps) {
  const account = (await params).account;
  const courses = await loadTeamCourses(account);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'courses:title'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <CoursesList courses={courses} account={account} />
      </PageBody>
    </>
  );
}

export default withI18n(TeamAccountCoursesPage);