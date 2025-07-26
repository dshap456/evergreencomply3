import { Suspense } from 'react';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';
import { Spinner } from '@kit/ui/spinner';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

// local imports
import { HomeLayoutPageHeader } from './_components/home-page-header';
import { HomeAvailableCourses } from './_components/home-available-courses';
import { loadAvailableCourses } from './_lib/server/load-available-courses';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:homePage');

  return {
    title,
  };
};

function UserHomePage() {
  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'common:routes.home'} />}
        description={<Trans i18nKey={'common:homeTabDescription'} />}
      />

      <PageBody>
        <Suspense fallback={<LoadingSpinner />}>
          <AvailableCoursesContent />
        </Suspense>
      </PageBody>
    </>
  );
}

async function AvailableCoursesContent() {
  try {
    const courses = await loadAvailableCourses();
    return <HomeAvailableCourses courses={courses} />;
  } catch (error) {
    console.error('Error loading available courses:', error);
    // Return empty array on error to prevent page crash
    return <HomeAvailableCourses courses={[]} />;
  }
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

export default withI18n(UserHomePage);
