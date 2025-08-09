import { loadCourseAction } from '../_lib/server/load-course-action';
// import { CourseEditor } from './course-editor'; // Removed - using CourseEditorClient instead

interface CourseEditorWrapperProps {
  courseId: string;
  onBack: () => void;
}

export async function CourseEditorWrapper({ courseId, onBack }: CourseEditorWrapperProps) {
  try {
    const { course, modules } = await loadCourseAction({ courseId });
    
    return (
      <div>CourseEditorWrapper is deprecated - use CourseEditorLoader instead</div>
      // <CourseEditor 
      //   course={course} 
      //   onBack={onBack} 
      //   onSave={(updatedCourse) => {
      //     // Handle course save completion - could refresh the course list
      //     console.log('Course saved:', updatedCourse);
      //   }}
      // />
    );
  } catch (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-lg font-medium text-red-600 mb-2">Error Loading Course</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Failed to load course data'}
          </p>
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
}