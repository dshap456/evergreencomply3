import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { CourseBuilder } from '../_components/course-builder';
import { loadTeamCourse } from '../_lib/server/team-courses.loader';

interface CourseDetailPageProps {
  params: Promise<{ account: string; courseId: string }>;
}

export const generateMetadata = async (props: CourseDetailPageProps) => {
  const { account, courseId } = await props.params;
  const course = await loadTeamCourse(account, courseId);
  const i18n = await createI18nServerInstance();
  
  const title = i18n.t('courses:title') + ' - ' + course.title;

  return {
    title,
  };
};

async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { account, courseId } = await params;
  const course = await loadTeamCourse(account, courseId);

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={course.title}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <CourseBuilder course={course} account={account} />
      </PageBody>
    </>
  );
}

export default withI18n(CourseDetailPage);