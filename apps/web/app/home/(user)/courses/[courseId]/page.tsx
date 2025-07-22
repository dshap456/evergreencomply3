import { use } from 'react';
import { notFound } from 'next/navigation';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { HomeLayoutPageHeader } from '../../_components/home-page-header';
import { CourseViewerWorking } from './_components/course-viewer-working';
// import { loadLearnerCourseDetails } from './_lib/server/learner-course-details.loader';

interface LearnerCoursePageProps {
  params: Promise<{ courseId: string }>;
}

export const generateMetadata = async ({ params }: LearnerCoursePageProps) => {
  const { courseId } = use(params);
  const i18n = await createI18nServerInstance();
  
  // Temporarily disable to isolate error
  return {
    title: 'Course Page',
  };
  
  // try {
  //   const course = await loadLearnerCourseDetails(courseId);
  //   return {
  //     title: course.title,
  //   };
  // } catch {
  //   return {
  //     title: i18n.t('courses:learner.courseNotFound'),
  //   };
  // }
};

function LearnerCoursePage({ params }: LearnerCoursePageProps) {
  const { courseId } = use(params);

  return (
    <>
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'courses:learner.courseView'} />}
        description={<Trans i18nKey={'courses:learner.courseViewDescription'} />}
      />

      <PageBody>
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">Course Page Works!</h1>
          <p>Course ID: {courseId}</p>
          <p>If you see this, the page itself works fine.</p>
          <p>The issue is in any async database operations.</p>
        </div>
      </PageBody>
    </>
  );
}

// Temporarily removed - was causing the error
// async function CoursePageHeader({ courseId }: { courseId: string }) {
//   try {
//     const course = await loadLearnerCourseDetails(courseId);
//     return <span>{course.title}</span>;
//   } catch {
//     return <Trans i18nKey={'courses:learner.courseNotFound'} />;
//   }
// }

export default withI18n(LearnerCoursePage);