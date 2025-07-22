import { Suspense } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';

import { loadLearnerCourseDetails } from '../_lib/server/learner-course-details.loader';

interface CourseViewerProps {
  courseId: string;
}

export function CourseViewerDebug({ courseId }: CourseViewerProps) {
  return (
    <Suspense fallback={<CourseViewerSkeleton />}>
      <CourseViewerContent courseId={courseId} />
    </Suspense>
  );
}

async function CourseViewerContent({ courseId }: { courseId: string }) {
  try {
    const course = await loadLearnerCourseDetails(courseId);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Debug: Course Data Loaded Successfully</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium">Course Info:</h3>
            <p className="text-sm">ID: {course.id}</p>
            <p className="text-sm">Title: {course.title}</p>
            <p className="text-sm">Progress: {course.progress_percentage}%</p>
          </div>
          
          <div>
            <h3 className="font-medium">Modules ({course.modules.length}):</h3>
            {course.modules.map((module, idx) => (
              <div key={module.id} className="text-sm ml-4">
                <p>Module {idx + 1}: {module.title} ({module.lessons.length} lessons)</p>
                <div className="ml-4">
                  {module.lessons.map((lesson, lessonIdx) => (
                    <p key={lesson.id} className="text-xs">
                      Lesson {lessonIdx + 1}: {lesson.title} - {lesson.content_type} 
                      {lesson.completed ? ' ✅' : ' ⏳'}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-green-50 rounded">
            <p className="text-green-800 font-medium">
              ✅ Data loading works! The error is in the learning interface components.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">Debug: Error Loading Course</h3>
          <pre className="text-sm bg-gray-100 p-4 rounded text-left">
            {JSON.stringify(error, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }
}

function CourseViewerSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-muted rounded animate-pulse w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}