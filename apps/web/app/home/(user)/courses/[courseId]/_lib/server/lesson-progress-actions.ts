'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const UpdateLessonProgressSchema = z.object({
  lessonId: z.string().uuid(),
  courseId: z.string().uuid(),
  progress: z.number().min(0).max(100),
  timeSpent: z.number().optional().default(0),
});

const CompleteLessonSchema = z.object({
  lessonId: z.string().uuid(),
  courseId: z.string().uuid(),
  finalProgress: z.number().min(0).max(100),
  timeSpent: z.number().optional().default(0),
  quizScore: z.number().optional(),
});

// Update lesson progress in real-time
export const updateLessonProgressAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();

    // Verify user is enrolled in the course
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', data.courseId)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('User not enrolled in this course');
    }

    // Upsert lesson progress
    const { error: progressError } = await client
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: data.lessonId,
        progress_percentage: data.progress,
        time_spent: data.timeSpent,
        last_accessed: new Date().toISOString(),
        status: data.progress >= 95 ? 'completed' : 'in_progress', // Auto-complete at 95%
      }, {
        onConflict: 'user_id,lesson_id'
      });

    if (progressError) {
      throw progressError;
    }

    return { success: true };
  },
  {
    auth: true,
    schema: UpdateLessonProgressSchema,
  }
);

// Mark lesson as completed and update overall course progress
export const completeLessonAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();

    // Verify user is enrolled in the course
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', data.courseId)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('User not enrolled in this course');
    }

    // Mark lesson as completed
    const { error: progressError } = await client
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: data.lessonId,
        progress_percentage: data.finalProgress,
        time_spent: data.timeSpent,
        status: 'completed',
        completed_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        quiz_score: data.quizScore,
      }, {
        onConflict: 'user_id,lesson_id'
      });

    if (progressError) {
      throw progressError;
    }

    // Update overall course progress
    await updateCourseProgress(client, user.id, data.courseId);

    // Revalidate the course page to show updated progress
    revalidatePath(`/home/courses/${data.courseId}`);

    return { success: true, message: 'Lesson completed successfully!' };
  },
  {
    auth: true,
    schema: CompleteLessonSchema,
  }
);

// Helper function to calculate and update overall course progress
async function updateCourseProgress(client: any, userId: string, courseId: string) {
  try {
    // Get all lessons in the course
    const { data: courseLessons, error: lessonsError } = await client
      .from('lessons')
      .select('id')
      .eq('course_id', courseId);

    if (lessonsError || !courseLessons) {
      console.error('Error fetching course lessons:', lessonsError);
      return;
    }

    const totalLessons = courseLessons.length;
    
    if (totalLessons === 0) {
      return; // No lessons to track
    }

    // Get completed lessons for this user
    const { data: completedLessons, error: completedError } = await client
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .in('lesson_id', courseLessons.map(l => l.id));

    if (completedError) {
      console.error('Error fetching completed lessons:', completedError);
      return;
    }

    const completedCount = completedLessons?.length || 0;
    const overallProgress = Math.round((completedCount / totalLessons) * 100);

    // Check if course is now complete
    const isCompleted = completedCount === totalLessons;

    // Update course enrollment with new progress
    const updateData: any = {
      progress_percentage: overallProgress,
    };

    if (isCompleted) {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await client
      .from('course_enrollments')
      .update(updateData)
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (updateError) {
      console.error('Error updating course progress:', updateError);
    }

  } catch (error) {
    console.error('Error in updateCourseProgress:', error);
  }
}

// Get current lesson progress for a user
const GetLessonProgressSchema = z.object({
  courseId: z.string().uuid(),
});

export const getLessonProgressAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();

    // Get all lesson progress for this course
    const { data: progressData, error } = await client
      .from('lesson_progress')
      .select(`
        lesson_id,
        progress_percentage,
        status,
        completed_at,
        time_spent,
        quiz_score,
        last_accessed
      `)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    // Convert to a map for easy lookup
    const progressMap = new Map();
    progressData?.forEach(progress => {
      progressMap.set(progress.lesson_id, progress);
    });

    return { 
      success: true, 
      progressMap: Object.fromEntries(progressMap) 
    };
  },
  {
    auth: true,
    schema: GetLessonProgressSchema,
  }
);