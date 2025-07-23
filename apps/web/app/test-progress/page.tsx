import { getSupabaseServerClient } from '@kit/supabase/server-client';

export default async function TestProgressPage() {
  const client = getSupabaseServerClient();
  
  // Get current user
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return <div className="p-8">Not authenticated</div>;
  }

  // Get enrollments
  const { data: enrollments } = await client
    .from('course_enrollments')
    .select(`
      *,
      courses (
        id,
        title,
        course_modules (
          id,
          title,
          lessons (
            id,
            title
          )
        )
      )
    `)
    .eq('user_id', user.id);

  // Get lesson progress
  const { data: lessonProgress } = await client
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Progress Test Page</h1>
      
      <section>
        <h2 className="text-xl font-semibold mb-4">Course Enrollments</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(enrollments, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Lesson Progress</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(lessonProgress, null, 2)}
        </pre>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Test Update Progress</h2>
        <p className="mb-4">To test progress update, complete a lesson and check if the enrollment progress_percentage updates.</p>
        
        {enrollments && enrollments.length > 0 && (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <div key={enrollment.course_id} className="border p-4 rounded">
                <h3 className="font-semibold">{enrollment.courses?.title}</h3>
                <p>Progress: {enrollment.progress_percentage}%</p>
                <p>Completed: {enrollment.completed_at ? 'Yes' : 'No'}</p>
                
                {enrollment.courses?.course_modules?.map((module: any) => (
                  <div key={module.id} className="ml-4 mt-2">
                    <h4 className="font-medium">{module.title}</h4>
                    {module.lessons?.map((lesson: any) => {
                      const progress = lessonProgress?.find(p => p.lesson_id === lesson.id);
                      return (
                        <div key={lesson.id} className="ml-4 text-sm">
                          {lesson.title} - {progress?.status || 'not started'}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}