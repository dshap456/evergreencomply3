import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

interface CourseViewerWorkingProps {
  courseId: string;
}

export async function CourseViewerWorking({ courseId }: CourseViewerWorkingProps) {
  try {
    const client = getSupabaseServerClient();
    
    // Get current user from Supabase auth
    const { data: { user }, error: userError } = await client.auth.getUser();

    if (!user || userError) {
      throw new Error('User not authenticated');
    }

    // Get enrollment info with course data - EXACT same query that works in API
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select(`
        id,
        progress_percentage,
        enrolled_at,
        completed_at,
        final_score,
        courses!inner (
          id,
          title,
          description,
          status
        )
      `)
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('Course not found or user not enrolled');
    }

    // Just return basic data without complex processing
    return (
      <Card>
        <CardHeader>
          <CardTitle>✅ Working Course Viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Course:</strong> {enrollment.courses.title}</p>
            <p><strong>Description:</strong> {enrollment.courses.description}</p>
            <p><strong>Progress:</strong> {enrollment.progress_percentage}%</p>
            <p><strong>Enrolled:</strong> {new Date(enrollment.enrolled_at).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {enrollment.courses.status}</p>
          </div>
        </CardContent>
      </Card>
    );

  } catch (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium text-red-600 mb-2">Server Component Error</h3>
          <p className="text-sm">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </CardContent>
      </Card>
    );
  }
}