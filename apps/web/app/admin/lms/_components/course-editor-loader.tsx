'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Spinner } from '@kit/ui/spinner';
import { CourseEditorClient } from './course-editor-client';

interface CourseEditorLoaderProps {
  courseId: string;
  onBack: () => void;
}

export function CourseEditorLoader({ courseId, onBack }: CourseEditorLoaderProps) {
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<any>(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoading(true);
        setError(null);

        // Load course data
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (courseError) {
          throw new Error(`Failed to load course: ${courseError.message}`);
        }

        // Load modules with lessons
        const { data: modules, error: modulesError } = await supabase
          .from('course_modules')
          .select(`
            *,
            lessons (
              *
            )
          `)
          .eq('course_id', courseId)
          .order('order_index');

        if (modulesError) {
          throw new Error(`Failed to load modules: ${modulesError.message}`);
        }

        // Format the data
        const formattedModules = modules.map(module => ({
          ...module,
          lessons: module.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []
        }));

        setCourseData({ course, modules: formattedModules });
      } catch (err) {
        console.error('Error loading course:', err);
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [courseId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-lg font-medium text-red-600 mb-2">Error Loading Course</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-600 mb-2">Course Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">The requested course could not be found.</p>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <CourseEditorClient 
      course={courseData.course} 
      modules={courseData.modules} 
      onBack={onBack} 
    />
  );
}