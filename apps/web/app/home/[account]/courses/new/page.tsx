import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { TeamAccountLayoutPageHeader } from '../../_components/team-account-layout-page-header';
import { CreateCourseForm } from '../_components/create-course-form';

interface CreateCoursePageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('courses:createCourse');

  return {
    title,
  };
};

async function CreateCoursePage({ params }: CreateCoursePageProps) {
  const account = (await params).account;

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'courses:createCourse'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <div className="max-w-2xl">
          <CreateCourseForm account={account} />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(CreateCoursePage);