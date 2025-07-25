'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const EnrollInCourseSchema = z.object({
  courseId: z.string().uuid(),
});

export const enrollInCourseAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();

    // enhanceAction with auth: true provides the user automatically

    // Check if course exists and is published
    const { data: course, error: courseError } = await client
      .from('courses')
      .select('id, title, is_published')
      .eq('id', data.courseId)
      .eq('is_published', true)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found or not available');
    }

    // Check if user is already enrolled
    const { data: existingEnrollment, error: enrollmentCheckError } = await client
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', data.courseId)
      .maybeSingle();

    if (enrollmentCheckError) {
      throw enrollmentCheckError;
    }

    if (existingEnrollment) {
      throw new Error('Already enrolled in this course');
    }

    // Create enrollment record
    const { error: enrollmentError } = await client
      .from('course_enrollments')
      .insert({
        user_id: user.id,
        course_id: data.courseId,
        progress_percentage: 0,
        enrolled_at: new Date().toISOString(),
      });

    if (enrollmentError) {
      throw enrollmentError;
    }

    // Revalidate the courses page to show updated enrollment
    revalidatePath('/home/(user)/courses');

    return { 
      success: true, 
      message: `Successfully enrolled in ${course.title}` 
    };
  },
  {
    auth: true,
    schema: EnrollInCourseSchema,
  }
);

const UnenrollFromCourseSchema = z.object({
  courseId: z.string().uuid(),
});

export const unenrollFromCourseAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();

    // enhanceAction with auth: true provides the user automatically

    // Check if user is enrolled and get enrollment details
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('id, completed_at')
      .eq('user_id', user.id)
      .eq('course_id', data.courseId)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('Not enrolled in this course');
    }

    // Prevent unenrollment from completed courses (optional business rule)
    if (enrollment.completed_at) {
      throw new Error('Cannot unenroll from completed courses');
    }

    // Delete enrollment record
    const { error: deleteError } = await client
      .from('course_enrollments')
      .delete()
      .eq('id', enrollment.id);

    if (deleteError) {
      throw deleteError;
    }

    // Revalidate the courses page
    revalidatePath('/home/(user)/courses');

    return { 
      success: true, 
      message: 'Successfully unenrolled from course' 
    };
  },
  {
    auth: true,
    schema: UnenrollFromCourseSchema,
  }
);