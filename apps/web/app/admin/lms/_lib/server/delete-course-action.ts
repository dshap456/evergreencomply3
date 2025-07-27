'use server';

import { z } from 'zod';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { enhanceAction } from '@kit/next/actions';

const DeleteCourseSchema = z.object({
  courseId: z.string().uuid(),
});

export const deleteCourseAction = enhanceAction(
  async function deleteCourse(data) {
    const client = getSupabaseServerAdminClient();
    
    console.log('🗑️ Deleting course:', data.courseId);
    
    // Start a transaction to delete the course and all related data
    try {
      // Check if course has active enrollments
      const { count: enrollmentCount } = await client
        .from('course_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', data.courseId);
      
      if (enrollmentCount && enrollmentCount > 0) {
        throw new Error(`Cannot delete course with ${enrollmentCount} active enrollments. Please remove all enrollments first.`);
      }
      
      // Delete in order of dependencies (reverse of foreign key relationships)
      
      // 1. Delete quiz questions (if any)
      const { error: quizError } = await client
        .from('quiz_questions')
        .delete()
        .in('lesson_id', 
          client
            .from('lessons')
            .select('id')
            .in('module_id', 
              client
                .from('course_modules')
                .select('id')
                .eq('course_id', data.courseId)
            )
        );
      
      if (quizError) {
        console.error('Error deleting quiz questions:', quizError);
      }
      
      // 2. Delete video metadata
      const { error: videoError } = await client
        .from('video_metadata')
        .delete()
        .in('lesson_id',
          client
            .from('lessons')
            .select('id')
            .in('module_id',
              client
                .from('course_modules')
                .select('id')
                .eq('course_id', data.courseId)
            )
        );
      
      if (videoError) {
        console.error('Error deleting video metadata:', videoError);
      }
      
      // 3. Delete lessons
      const { error: lessonsError } = await client
        .from('lessons')
        .delete()
        .in('module_id',
          client
            .from('course_modules')
            .select('id')
            .eq('course_id', data.courseId)
        );
      
      if (lessonsError) {
        console.error('Error deleting lessons:', lessonsError);
        throw new Error('Failed to delete course lessons');
      }
      
      // 4. Delete modules
      const { error: modulesError } = await client
        .from('course_modules')
        .delete()
        .eq('course_id', data.courseId);
      
      if (modulesError) {
        console.error('Error deleting modules:', modulesError);
        throw new Error('Failed to delete course modules');
      }
      
      // 5. Finally, delete the course itself
      const { error: courseError } = await client
        .from('courses')
        .delete()
        .eq('id', data.courseId);
      
      if (courseError) {
        console.error('Error deleting course:', courseError);
        throw new Error('Failed to delete course');
      }
      
      console.log('✅ Course deleted successfully');
      
      return {
        success: true,
        message: 'Course deleted successfully',
      };
    } catch (error) {
      console.error('❌ Error in deleteCourseAction:', error);
      throw error;
    }
  },
  {
    auth: true,
    schema: DeleteCourseSchema,
  },
);