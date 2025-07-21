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
    try {
      const client = getSupabaseServerAdminClient();

      console.log('🔄 AdminEnrollUser: Starting enrollment...', data);

      // Find user by email
      const { data: user, error: userError } = await client.auth.admin.getUserByEmail(data.userEmail);
      
      if (userError) {
        console.error('❌ User lookup error:', userError);
        throw new Error(`User lookup failed: ${userError.message}`);
      }

      if (!user.user) {
        console.log('❌ User not found:', data.userEmail);
        throw new Error(`User not found: ${data.userEmail}`);
      }

      const userId = user.user.id;
      console.log('✅ Found user:', { id: userId, email: user.user.email });

      // Check if course exists and is published
      const { data: course, error: courseError } = await client
        .from('courses')
        .select('id, title, is_published')
        .eq('id', data.courseId)
        .single();

      if (courseError) {
        console.error('❌ Course lookup error:', courseError);
        throw new Error(`Course lookup failed: ${courseError.message}`);
      }

      if (!course) {
        throw new Error('Course not found');
      }

      if (!course.is_published) {
        throw new Error('Course is not published');
      }

      console.log('✅ Found course:', { id: course.id, title: course.title, published: course.is_published });

      // Check if already enrolled
      const { data: existing, error: existingError } = await client
        .from('course_enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', data.courseId)
        .maybeSingle();

      if (existingError) {
        console.error('❌ Enrollment check error:', existingError);
        throw new Error(`Enrollment check failed: ${existingError.message}`);
      }

      if (existing) {
        throw new Error('User already enrolled in this course');
      }

      console.log('✅ User not already enrolled, proceeding...');

      // Create enrollment
      const { data: enrollment, error: enrollError } = await client
        .from('course_enrollments')
        .insert({
          user_id: userId,
          course_id: data.courseId,
          progress_percentage: 0
        })
        .select()
        .single();

      if (enrollError) {
        console.error('❌ Enrollment creation error:', enrollError);
        throw new Error(`Failed to create enrollment: ${enrollError.message}`);
      }

      console.log('✅ User enrolled successfully:', enrollment);

      return { 
        success: true, 
        message: `Successfully enrolled ${data.userEmail} in "${course.title}"`,
        enrollment 
      };
    } catch (error) {
      console.error('❌ AdminEnrollUser: Unexpected error:', error);
      throw error;
    }
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

    try {
      console.log('🔄 Loading users for enrollment...');

      // Get all users with their personal accounts
      const { data: users, error } = await client
        .from('accounts')
        .select(`
          id,
          name,
          email,
          is_personal_account,
          primary_owner_user_id,
          created_at
        `)
        .eq('is_personal_account', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Users query error:', error);
        throw new Error(`Failed to load users: ${error.message}`);
      }

      console.log('✅ Found users:', users?.length || 0);
      console.log('User details:', users?.map(u => ({ email: u.email, name: u.name })));

      return users?.map(user => ({
        id: user.primary_owner_user_id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      })) || [];
    } catch (error) {
      console.error('❌ ListUsers: Unexpected error:', error);
      throw error;
    }
  },
  {
    auth: true,
  }
);

// Test enrollment with known test user
export const testEnrollmentAction = enhanceAction(
  async function (data: { courseId: string }) {
    const client = getSupabaseServerAdminClient();
    const testUserEmail = 'learner@test.com';
    
    console.log('🔄 Testing enrollment with:', testUserEmail);

    try {
      // Find test user
      const { data: user, error: userError } = await client.auth.admin.getUserByEmail(testUserEmail);
      
      if (userError || !user.user) {
        throw new Error(`Test user ${testUserEmail} not found. Please run seed file first.`);
      }

      // Try enrollment
      const result = await adminEnrollUserAction({
        userEmail: testUserEmail,
        courseId: data.courseId
      });

      return result;
    } catch (error) {
      console.error('❌ Test enrollment failed:', error);
      throw error;
    }
  },
  {
    auth: true,
  }
);