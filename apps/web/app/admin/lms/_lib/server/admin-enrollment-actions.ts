'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const AdminEnrollUserSchema = z.object({
  userEmail: z.string().email(),
  courseId: z.string().uuid(),
});

export const adminEnrollUserAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    console.log('🔄 AdminEnrollUser: Starting enrollment...', data);

    // Find user by email
    const { data: user, error: userError } = await client.auth.admin.getUserByEmail(data.userEmail);
    
    if (userError || !user.user) {
      throw new Error(`User not found: ${data.userEmail}`);
    }

    const userId = user.user.id;

    // Check if course exists and is published
    const { data: course, error: courseError } = await client
      .from('courses')
      .select('id, title, is_published')
      .eq('id', data.courseId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    if (!course.is_published) {
      throw new Error('Course is not published');
    }

    // Check if already enrolled
    const { data: existing } = await client
      .from('course_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', data.courseId)
      .maybeSingle();

    if (existing) {
      throw new Error('User already enrolled in this course');
    }

    // Create enrollment
    const { data: enrollment, error: enrollError } = await client
      .from('course_enrollments')
      .insert({
        user_id: userId,
        course_id: data.courseId,
        enrolled_at: new Date().toISOString(),
        progress_percentage: 0
      })
      .select()
      .single();

    if (enrollError) {
      console.error('❌ Enrollment error:', enrollError);
      throw new Error(`Failed to enroll user: ${enrollError.message}`);
    }

    console.log('✅ User enrolled successfully:', enrollment);

    return { 
      success: true, 
      message: `Successfully enrolled ${data.userEmail} in "${course.title}"`,
      enrollment 
    };
  },
  {
    auth: true,
    schema: AdminEnrollUserSchema,
  }
);

// Helper to list all users for admin selection
export const listUsersForEnrollmentAction = enhanceAction(
  async function () {
    const client = getSupabaseServerAdminClient();

    // Get all users with their personal accounts
    const { data: users, error } = await client
      .from('accounts')
      .select(`
        id,
        name,
        email,
        is_personal_account,
        primary_owner_user_id
      `)
      .eq('is_personal_account', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load users: ${error.message}`);
    }

    return users.map(user => ({
      id: user.primary_owner_user_id,
      email: user.email,
      name: user.name
    }));
  },
  {
    auth: true,
  }
);