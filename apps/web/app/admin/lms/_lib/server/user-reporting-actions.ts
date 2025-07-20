'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const GetUserDetailsSchema = z.object({
  userId: z.string().uuid(),
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
      // Get basic user info
      const { data: user, error: userError } = await client
        .from('accounts')
        .select('id, name, email')
        .eq('id', data.userId)
        .eq('is_personal_account', true)
        .single();

      if (userError || !user) {
        console.error('❌ GetUserDetailsAction: User not found:', userError);
        throw new Error('User not found');
      }

      console.log('✅ GetUserDetailsAction: Found user:', user);

      // Get course completions with quiz scores
      const { data: completions, error: completionsError } = await client
        .from('course_progress')
        .select(`
          completed_at,
          final_quiz_score,
          course_id,
          courses!inner (
            title
          )
        `)
        .eq('user_id', data.userId)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (completionsError) {
        console.error('❌ GetUserDetailsAction: Error fetching completions:', completionsError);
        // Don't throw error, just log and continue with empty completions
      }

      const courseCompletions: UserCourseCompletion[] = (completions || []).map(completion => ({
        courseName: completion.courses?.title || 'Unknown Course',
        completionDate: completion.completed_at,
        finalQuizScore: completion.final_quiz_score,
      }));

      console.log('✅ GetUserDetailsAction: Found completions:', {
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