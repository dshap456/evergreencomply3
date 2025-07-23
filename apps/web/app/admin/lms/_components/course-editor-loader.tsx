'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@kit/ui/spinner';
import { CourseEditor } from './course-editor';

interface CourseEditorLoaderProps {
  courseId: string;
  onBack: () => void;
}

export function CourseEditorLoader({ courseId, onBack }: CourseEditorLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<any>(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoading(true);
        setError(null);

        // Use API route to load course data
        const response = await fetch(`/api/admin/courses/${courseId}`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to load course');
        }
        
        if (result.success) {
          setCourseData(result);
        } else {
          throw new Error(result.error || 'Failed to load course data');
        }
      } catch (err) {
        console.error('Error loading course:', err);
        setError(err instanceof Error ? err.message : 'Failed to load course');
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [courseId]);

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
    <CourseEditor 
      course={courseData.course} 
      onBack={onBack} 
      onSave={(updatedCourse) => {
        console.log('Course saved from loader:', updatedCourse);
        // Could add additional logic here if needed
      }}
    />
  );
}