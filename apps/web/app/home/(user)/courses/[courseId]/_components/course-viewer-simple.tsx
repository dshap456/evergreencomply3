import { Suspense } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

interface CourseViewerProps {
  courseId: string;
}

export function CourseViewerSimple({ courseId }: CourseViewerProps) {
  return (
    <Suspense fallback={<CourseViewerSkeleton />}>
      <CourseViewerContent courseId={courseId} />
    </Suspense>
  );
}

async function CourseViewerContent({ courseId }: { courseId: string }) {
  try {
    const client = getSupabaseServerClient();
    
    // Test 1: Can we get the user?
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-red-600 mb-2">Debug: User Authentication Issue</h3>
            <p>User Error: {userError?.message || 'No user found'}</p>
          </CardContent>
        </Card>
      );
    }

    // Test 2: Can we query courses table?
    const { data: course, error: courseError } = await client
      .from('courses')
      .select('id, title, description, status')
      .eq('id', courseId)
      .single();

    if (courseError) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-red-600 mb-2">Debug: Course Query Error</h3>
            <pre className="text-sm bg-gray-100 p-4 rounded text-left">
              {JSON.stringify(courseError, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }

    // Test 3: Can we query enrollment?
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('id, progress_percentage, enrolled_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-red-600 mb-2">Debug: Enrollment Query Error</h3>
            <pre className="text-sm bg-gray-100 p-4 rounded text-left">
              {JSON.stringify(enrollmentError, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }

    // Test 4: Success!
    return (
      <Card>
        <CardHeader>
          <CardTitle>✅ Debug: All Basic Queries Work!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium">User:</h3>
            <p className="text-sm">ID: {user.id}</p>
            <p className="text-sm">Email: {user.email}</p>
          </div>
          
          <div>
            <h3 className="font-medium">Course:</h3>
            <p className="text-sm">ID: {course?.id}</p>
            <p className="text-sm">Title: {course?.title}</p>
            <p className="text-sm">Status: {course?.status}</p>
          </div>

          <div>
            <h3 className="font-medium">Enrollment:</h3>
            <p className="text-sm">ID: {enrollment?.id}</p>
            <p className="text-sm">Progress: {enrollment?.progress_percentage}%</p>
            <p className="text-sm">Enrolled: {enrollment?.enrolled_at}</p>
          </div>
          
          <div className="mt-4 p-4 bg-green-50 rounded">
            <p className="text-green-800 font-medium">
              ✅ Basic data loading works! Issue must be in the complex module/lesson queries.
            </p>
          </div>
        </CardContent>
      </Card>
    );

  } catch (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">Debug: Unexpected Error</h3>
          <pre className="text-sm bg-gray-100 p-4 rounded text-left">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
            Stack: {error instanceof Error ? error.stack : 'No stack trace'}
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