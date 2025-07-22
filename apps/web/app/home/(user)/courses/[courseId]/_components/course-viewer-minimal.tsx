import { Suspense } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

interface CourseViewerProps {
  courseId: string;
}

export function CourseViewerMinimal({ courseId }: CourseViewerProps) {
  return (
    <Suspense fallback={<CourseViewerSkeleton />}>
      <CourseViewerContent courseId={courseId} />
    </Suspense>
  );
}

async function CourseViewerContent({ courseId }: { courseId: string }) {
  try {
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      return (
        <Card>
          <CardContent className="p-8">
            <h3 className="text-lg font-medium text-red-600 mb-4">❌ User Authentication Failed</h3>
            <p>Error: {userError?.message || 'No user found'}</p>
          </CardContent>
        </Card>
      );
    }

    // Show what course ID we're looking for
    return (
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug: Course ID Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium">Requested Course ID:</h3>
            <p className="text-sm font-mono bg-gray-100 p-2 rounded">{courseId}</p>
            <p className="text-xs text-muted-foreground">Length: {courseId.length} characters</p>
          </div>
          
          <div>
            <h3 className="font-medium">User Info:</h3>
            <p className="text-sm">ID: {user.id}</p>
            <p className="text-sm">Email: {user.email}</p>
          </div>

          <CourseAnalysis courseId={courseId} userId={user.id} />
        </CardContent>
      </Card>
    );

  } catch (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">❌ Unexpected Error</h3>
          <pre className="text-sm bg-gray-100 p-4 rounded text-left">
            {error instanceof Error ? error.message : JSON.stringify(error)}
          </pre>
        </CardContent>
      </Card>
    );
  }
}

async function CourseAnalysis({ courseId, userId }: { courseId: string; userId: string }) {
  try {
    const client = getSupabaseServerClient();

    // Check if course exists at all
    const { data: course, error: courseError } = await client
      .from('courses')
      .select('id, title, is_published')
      .eq('id', courseId)
      .maybeSingle();

    // Get all courses for comparison
    const { data: allCourses } = await client
      .from('courses')
      .select('id, title')
      .limit(10);

    // Check enrollment
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('id, progress_percentage')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Course Lookup Result:</h3>
          {courseError ? (
            <div className="text-red-600">
              <p className="text-sm">❌ Error: {courseError.message}</p>
              <pre className="text-xs bg-red-50 p-2 rounded mt-2">
                {JSON.stringify(courseError, null, 2)}
              </pre>
            </div>
          ) : course ? (
            <div className="text-green-600">
              <p className="text-sm">✅ Found: {course.title}</p>
              <p className="text-sm">Published: {course.is_published ? 'Yes' : 'No'}</p>
            </div>
          ) : (
            <p className="text-yellow-600">⚠️ Course not found with this exact ID</p>
          )}
        </div>

        <div>
          <h3 className="font-medium">Available Courses (first 10):</h3>
          <div className="text-sm">
            {allCourses?.map(c => (
              <div key={c.id} className="font-mono text-xs bg-gray-50 p-1 rounded mb-1">
                {c.id} - {c.title}
              </div>
            )) || 'No courses found'}
          </div>
        </div>

        <div>
          <h3 className="font-medium">Enrollment Check:</h3>
          {enrollmentError ? (
            <p className="text-red-600 text-sm">❌ Error: {enrollmentError.message}</p>
          ) : enrollment ? (
            <p className="text-green-600 text-sm">✅ Enrolled (Progress: {enrollment.progress_percentage}%)</p>
          ) : (
            <p className="text-yellow-600 text-sm">⚠️ Not enrolled in this course</p>
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="text-red-600">
        <p className="text-sm">❌ Analysis failed: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
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