'use server';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export const debugEnrollmentAction = enhanceAction(
  async function () {
    const client = getSupabaseServerAdminClient();

    try {
      // Test 1: Check if we can query course_enrollments at all
      const { data: allEnrollments, error: allError } = await client
        .from('course_enrollments')
        .select('*')
        .limit(5);

      console.log('🔬 Debug: All enrollments query:', { 
        success: !allError, 
        count: allEnrollments?.length || 0,
        error: allError?.message 
      });

      // Test 2: Check specifically for david's enrollment
      const { data: davidEnrollment, error: davidError } = await client
        .from('course_enrollments')
        .select('*')
        .eq('user_id', '1b66279f-f6eb-439b-8312-540e7d294518');

      console.log('🔬 Debug: David enrollment query:', { 
        success: !davidError, 
        count: davidEnrollment?.length || 0,
        error: davidError?.message,
        data: davidEnrollment
      });

      // Test 3: Check the exact query from load-users-action
      const { data: enrollmentStats, error: enrollmentError } = await client
        .from('course_enrollments')
        .select(`
          user_id,
          progress_percentage,
          created_at
        `);

      console.log('🔬 Debug: Enrollment stats query (exact copy):', { 
        success: !enrollmentError, 
        count: enrollmentStats?.length || 0,
        error: enrollmentError?.message
      });

      return {
        allEnrollments: {
          success: !allError,
          count: allEnrollments?.length || 0,
          error: allError?.message
        },
        davidEnrollment: {
          success: !davidError,
          count: davidEnrollment?.length || 0,
          error: davidError?.message,
          data: davidEnrollment
        },
        enrollmentStats: {
          success: !enrollmentError,
          count: enrollmentStats?.length || 0,
          error: enrollmentError?.message
        }
      };
    } catch (error) {
      console.error('🔬 Debug: Unexpected error:', error);
      throw error;
    }
  },
  {
    auth: true,
  }
);