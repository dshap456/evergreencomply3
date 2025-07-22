import { use } from 'react';
import { CourseViewerMinimal } from './_components/course-viewer-minimal';

export default function TestCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Course Page - With Debug Component</h1>
      <p>Course ID from URL: {courseId}</p>
      <hr style={{ margin: '20px 0' }} />
      <CourseViewerMinimal courseId={courseId} />
    </div>
  );
}
