import { Suspense } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

export function LearnerCoursesDashboardDebug() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <LearnerCoursesContentDebug />
      </Suspense>
    </div>
  );
}

async function LearnerCoursesContentDebug() {
  try {
    // Test 1: Can we get the client?
    const client = getSupabaseServerClient();
    
    // Test 2: Can we get the user?
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError) {
      return (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-lg font-medium text-red-600 mb-4">Debug: User Auth Error</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded">
              {JSON.stringify(userError, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }

    if (!user) {
      return (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-lg font-medium text-yellow-600">Debug: No User Found</h2>
            <p>User authentication returned null</p>
          </CardContent>
        </Card>
      );
    }

    // Test 3: Can we query course_enrollments?
    const { data: enrolledCoursesData, error: enrolledError } = await client
      .from('course_enrollments')
      .select(`
        enrollment_date: enrolled_at,
        progress_percentage,
        completed_at,
        final_score,
        course:courses!inner (
          id,
          title,
          description,
          is_published
        )
      `)
      .eq('user_id', user.id)
      .eq('courses.is_published', true);

    if (enrolledError) {
      return (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-lg font-medium text-red-600 mb-4">Debug: Enrollment Query Error</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded">
              {JSON.stringify(enrolledError, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }

    // Test 4: Can we query courses?
    const enrolledCourseIds = enrolledCoursesData?.map(enrollment => enrollment.course.id) || [];
    
    let availableCoursesQuery = client
      .from('courses')
      .select(`
        id,
        title,
        description,
        is_published
      `)
      .eq('is_published', true);

    if (enrolledCourseIds.length > 0) {
      availableCoursesQuery = availableCoursesQuery.not('id', 'in', `(${enrolledCourseIds.join(',')})`);
    }

    const { data: availableCoursesData, error: availableError } = await availableCoursesQuery;

    if (availableError) {
      return (
        <Card>
          <CardContent className="p-8">
            <h2 className="text-lg font-medium text-red-600 mb-4">Debug: Available Courses Query Error</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded">
              {JSON.stringify(availableError, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }

    // Test 5: Success - show data summary
    return (
      <Card>
        <CardContent className="p-8">
          <h2 className="text-lg font-medium text-green-600 mb-4">Debug: Success! Data Loaded</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">User ID:</h3>
              <p className="text-sm text-gray-600">{user.id}</p>
            </div>
            
            <div>
              <h3 className="font-medium">Enrolled Courses:</h3>
              <p className="text-sm text-gray-600">
                {enrolledCoursesData?.length || 0} courses found
              </p>
              {enrolledCoursesData && enrolledCoursesData.length > 0 && (
                <pre className="text-xs bg-gray-100 p-2 rounded mt-2">
                  {JSON.stringify(enrolledCoursesData, null, 2)}
                </pre>
              )}
            </div>
            
            <div>
              <h3 className="font-medium">Available Courses:</h3>
              <p className="text-sm text-gray-600">
                {availableCoursesData?.length || 0} courses found
              </p>
              {availableCoursesData && availableCoursesData.length > 0 && (
                <pre className="text-xs bg-gray-100 p-2 rounded mt-2">
                  {JSON.stringify(availableCoursesData, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );

  } catch (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <h2 className="text-lg font-medium text-red-600 mb-4">Debug: Unexpected Error</h2>
          <pre className="text-sm bg-gray-100 p-4 rounded">
            {JSON.stringify(error, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }
}

function DashboardSkeleton() {
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