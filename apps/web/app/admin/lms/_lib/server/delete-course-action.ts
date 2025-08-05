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
    
    try {
      // Check if course has active enrollments
      const { count: enrollmentCount } = await client
        .from('course_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', data.courseId);
      
      if (enrollmentCount && enrollmentCount > 0) {
        throw new Error(`Cannot delete course with ${enrollmentCount} active enrollments. Please remove all enrollments first.`);
      }
      
      // Since all foreign keys have ON DELETE CASCADE, we can simply delete the course
      // and let the database handle cascading deletes for related tables:
      // - course_modules (and their lessons, quiz_questions, video_metadata)
      // - course_seats
      // - course_invitations
      // - course_completions
      
      const { error: courseError } = await client
        .from('courses')
        .delete()
        .eq('id', data.courseId);
      
      if (courseError) {
        console.error('Error deleting course:', courseError);
        throw new Error(`Failed to delete course: ${courseError.message}`);
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