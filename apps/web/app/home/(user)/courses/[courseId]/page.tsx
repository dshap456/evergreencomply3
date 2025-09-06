import { use } from 'react';
import { notFound } from 'next/navigation';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { CourseViewerClient } from './_components/course-viewer-client';

interface LearnerCoursePageProps {
  params: Promise<{ courseId: string }>;
}

// Completely removed generateMetadata to isolate error

async function LearnerCoursePage({ params }: LearnerCoursePageProps) {
  const { courseId } = use(params);
  
  console.log('[PAGE] courseId from params:', courseId);
  
  if (!courseId) {
    console.error('[PAGE] No courseId found in params!');
    notFound();
  }
  
  // Get the saved lesson on the SERVER
  const client = getSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  
  let savedLessonId = null;
  if (user) {
    const { data: enrollment } = await client
      .from('course_enrollments')
      .select('current_lesson_id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();
    
    savedLessonId = enrollment?.current_lesson_id;
    console.log('[PAGE] Found saved lesson on server:', savedLessonId);
  }

  return (
    <PageBody className="pt-0">
      <CourseViewerWithSavedLesson courseId={courseId} savedLessonId={savedLessonId} />
    </PageBody>
  );
}

// Wrapper to pass the saved lesson
function CourseViewerWithSavedLesson({ courseId, savedLessonId }: { courseId: string; savedLessonId: string | null }) {
  return <CourseViewerClient courseId={courseId} initialLessonId={savedLessonId} />;
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