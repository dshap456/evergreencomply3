'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const GetUserDetailsSchema = z.object({
  userId: z.string(), // Changed from uuid() to handle mock data
});

interface UserCourseCompletion {
  courseName: string;
  completionDate: string;
  finalQuizScore: number | null;
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
  courseCompletions: UserCourseCompletion[];
}

export const getUserDetailsAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    console.log('🔄 GetUserDetailsAction: Fetching user details for:', data.userId);

    try {
      // For mock data, return mock user details
      if (!data.userId.includes('-')) { // Simple check for non-UUID (mock) IDs
        console.log('ℹ️ GetUserDetailsAction: Detected mock user ID, returning mock data');
        
        const mockUserDetails: UserDetails = {
          id: data.userId,
          name: 'Mock User ' + data.userId,
          email: `user${data.userId}@example.com`,
          courseCompletions: [
            {
              courseName: 'Safety Compliance Fundamentals',
              completionDate: '2024-01-15T10:30:00Z',
              finalQuizScore: 85,
            },
            {
              courseName: 'Advanced OSHA Training',
              completionDate: '2024-01-10T14:45:00Z',
              finalQuizScore: 92,
            },
            {
              courseName: 'Emergency Response Procedures',
              completionDate: '2023-12-20T09:15:00Z',
              finalQuizScore: 78,
            },
          ],
        };
        
        return { success: true, data: mockUserDetails };
      }

      // For real UUIDs, get user info from accounts table
      const { data: account, error: accountError } = await client
        .from('accounts')
        .select('id, name, email, primary_owner_user_id')
        .eq('primary_owner_user_id', data.userId)
        .eq('is_personal_account', true)
        .single();
        
      if (accountError || !account) {
        console.error('❌ GetUserDetailsAction: User not found in accounts:', accountError);
        throw new Error('User not found');
      }
        
      // Use account data
      const user = {
        id: account.primary_owner_user_id,
        name: account.name || account.email?.split('@')[0] || 'Unknown',
        email: account.email || 'No email',
      };

      console.log('✅ GetUserDetailsAction: Found user:', user);

      // Get course completions with quiz scores - try both tables
      // First, get enrollments
      const { data: enrollments, error: enrollmentsError } = await client
        .from('course_enrollments')
        .select(`
          completed_at,
          final_score,
          course_id,
          courses!inner (
            title
          )
        `)
        .eq('user_id', data.userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (enrollmentsError) {
        console.error('❌ GetUserDetailsAction: Error fetching enrollments:', enrollmentsError);
      }

      // Also get completions from course_completions table
      const { data: completions, error: completionsError } = await client
        .from('course_completions')
        .select(`
          completed_at,
          final_quiz_score,
          final_quiz_passed,
          course_name,
          course_id
        `)
        .eq('user_id', data.userId)
        .order('completed_at', { ascending: false });

      if (completionsError) {
        console.error('❌ GetUserDetailsAction: Error fetching completions:', completionsError);
      }

      // Create a map to combine data from both sources
      const courseScoresMap = new Map<string, UserCourseCompletion>();

      // Process enrollments first
      (enrollments || []).forEach(enrollment => {
        const courseId = enrollment.course_id;
        courseScoresMap.set(courseId, {
          courseName: enrollment.courses?.title || 'Unknown Course',
          completionDate: enrollment.completed_at,
          finalQuizScore: enrollment.final_score ? Number(enrollment.final_score) : null,
        });
      });

      // Then update with completion data (which may have more accurate quiz scores)
      (completions || []).forEach(completion => {
        const courseId = completion.course_id;
        const existing = courseScoresMap.get(courseId) || {
          courseName: completion.course_name,
          completionDate: completion.completed_at,
          finalQuizScore: null,
        };
        
        // Update with final quiz score from completions if available
        if (completion.final_quiz_score !== null) {
          existing.finalQuizScore = Number(completion.final_quiz_score);
        }
        
        courseScoresMap.set(courseId, existing);
      });

      const courseCompletions: UserCourseCompletion[] = Array.from(courseScoresMap.values());

      console.log('✅ GetUserDetailsAction: Found enrollments:', {
        count: enrollments?.length || 0,
        enrollments: enrollments?.map(e => ({ 
          course: e.courses?.title, 
          finalScore: e.final_score
        }))
      });
      
      console.log('✅ GetUserDetailsAction: Found completions:', {
        count: completions?.length || 0,
        completions: completions?.map(c => ({ 
          course: c.course_name, 
          finalQuizScore: c.final_quiz_score
        }))
      });
      
      console.log('✅ GetUserDetailsAction: Combined course completions:', {
        count: courseCompletions.length,
        completions: courseCompletions.map(c => ({ 
          course: c.courseName, 
          date: c.completionDate,
          score: c.finalQuizScore 
        }))
      });

      const userDetails: UserDetails = {
        id: user.id,
        name: user.name,
        email: user.email,
        courseCompletions,
      };

      return { success: true, data: userDetails };

    } catch (error) {
      console.error('❌ GetUserDetailsAction: Unexpected error:', error);
      throw error;
    }
  },
  {
    auth: true,
    schema: GetUserDetailsSchema,
  }
);