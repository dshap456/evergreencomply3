'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const AdminEnrollUserSchema = z.object({
  userEmail: z.string().email(),
  courseId: z.string().uuid(),
});

export const adminEnrollUserAction = enhanceAction(
  async function (data) {
    console.log('🚀 AdminEnrollUser: Action called with data:', data);
    
    try {
      const client = getSupabaseServerClient();
      console.log('✅ AdminEnrollUser: Got client');

      console.log('🔄 AdminEnrollUser: Starting enrollment...', data);

      // Find user by email using accounts table
      const { data: userAccount, error: userError } = await client
        .from('accounts')
        .select('primary_owner_user_id, email, name')
        .eq('email', data.userEmail)
        .eq('is_personal_account', true)
        .single();
      
      if (userError) {
        console.error('❌ User lookup error:', userError);
        throw new Error(`User lookup failed: ${userError.message}`);
      }

      if (!userAccount) {
        console.log('❌ User not found:', data.userEmail);
        throw new Error(`User not found: ${data.userEmail}`);
      }

      const userId = userAccount.primary_owner_user_id;
      console.log('✅ Found user:', { id: userId, email: userAccount.email, name: userAccount.name });

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
      console.error('❌ AdminEnrollUser: Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });
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
    console.log('🚀 ListUsersForEnrollment: Action called');
    
    const client = getSupabaseServerClient();
    console.log('✅ ListUsersForEnrollment: Got client');

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
    const testUserEmail = 'learner@test.com';
    
    console.log('🔄 Testing enrollment with:', testUserEmail);

    try {
      // Use the main enrollment action which already handles user lookup properly
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