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
      .select('id, title, status, price, billing_product_id')
      .eq('id', data.courseId)
      .eq('status', 'published')
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

    // Check if user has access to the course (handles both free and paid courses)
    const { data: hasAccess, error: accessError } = await client
      .rpc('has_course_access', {
        p_user_id: user.id,
        p_course_id: data.courseId,
      });

    if (accessError) {
      throw accessError;
    }

    if (!hasAccess) {
      // Course requires purchase
      if (course.price && course.price > 0) {
        throw new Error('This course requires purchase. Please complete the checkout process to gain access.');
      } else {
        throw new Error('You do not have access to this course.');
      }
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