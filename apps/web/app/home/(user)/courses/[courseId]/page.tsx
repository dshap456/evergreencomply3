import { use } from 'react';
import { notFound } from 'next/navigation';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { HomeLayoutPageHeader } from '../../_components/home-page-header';
import { CourseViewerClient } from './_components/course-viewer-client';

interface LearnerCoursePageProps {
  params: Promise<{ courseId: string }>;
}

// Completely removed generateMetadata to isolate error

function LearnerCoursePage({ params }: LearnerCoursePageProps) {
  const { courseId } = use(params);

  return (
    <>
      <HomeLayoutPageHeader
        title="Course View"
        description="View your course content and progress"
      />

      <PageBody>
        <CourseViewerClient courseId={courseId} />
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

export default LearnerCoursePage;