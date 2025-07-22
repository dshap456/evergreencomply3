import { Suspense } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';

import { loadLearnerCourseDetails } from '../_lib/server/learner-course-details.loader';
import { CourseLearningInterface } from './course-learning-interface';

interface CourseViewerProps {
  courseId: string;
}

export function CourseViewer({ courseId }: CourseViewerProps) {
  return (
    <Suspense fallback={<CourseViewerSkeleton />}>
      <CourseViewerContent courseId={courseId} />
    </Suspense>
  );
}

async function CourseViewerContent({ courseId }: { courseId: string }) {
  try {
    const course = await loadLearnerCourseDetails(courseId);
    
    return <CourseLearningInterface course={course} />;
  } catch (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">Course Not Found</h3>
          <p className="text-muted-foreground">
            This course may not exist or you may not have access to it.
          </p>
        </CardContent>
      </Card>
    );
  }
}

function CourseViewerSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content skeleton */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="h-8 bg-muted rounded animate-pulse w-48" />
            <div className="h-4 bg-muted rounded animate-pulse w-full mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded animate-pulse w-24" />
              <div className="h-2 bg-muted rounded animate-pulse w-full" />
              <div className="flex items-center justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation skeleton */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}