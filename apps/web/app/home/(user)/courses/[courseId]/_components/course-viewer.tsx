import { Suspense } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';

import { CourseContent } from './course-content';
import { CourseSidebar } from './course-sidebar';

interface CourseViewerProps {
  courseId: string;
}

export function CourseViewer({ courseId }: CourseViewerProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Course Content */}
      <div className="lg:col-span-2">
        <Suspense fallback={<CourseContentSkeleton />}>
          <CourseContent courseId={courseId} />
        </Suspense>
      </div>

      {/* Course Navigation */}
      <div className="lg:col-span-1">
        <Suspense fallback={<CourseSidebarSkeleton />}>
          <CourseSidebar courseId={courseId} />
        </Suspense>
      </div>
    </div>
  );
}

function CourseContentSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-muted rounded animate-pulse w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function CourseSidebarSkeleton() {
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