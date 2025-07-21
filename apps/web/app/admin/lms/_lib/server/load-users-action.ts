'use server';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

interface UserWithStats {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'team_manager' | 'learner';
  account: string;
  enrollments: number;
  completions: number;
  last_active: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export const loadUsersAction = enhanceAction(
  async function () {
    const client = getSupabaseServerAdminClient();

    console.log('🔍 LoadUsersAction: Starting to load users with enrollment stats...');

    try {
      // Load all personal accounts (users) with basic info
      const { data: accounts, error: accountsError } = await client
        .from('accounts')
        .select(`
          id,
          name,
          email,
          created_at,
          is_personal_account,
          primary_owner_user_id
        `)
        .eq('is_personal_account', true)
        .order('created_at', { ascending: false });

      if (accountsError) {
        console.error('❌ LoadUsersAction: Error loading accounts:', accountsError);
        throw new Error(`Failed to load accounts: ${accountsError.message}`);
      }

      if (!accounts || accounts.length === 0) {
        console.log('ℹ️ LoadUsersAction: No user accounts found');
        return [];
      }

      console.log(`📊 LoadUsersAction: Found ${accounts.length} user accounts`);

      // Load enrollment stats for all users
      const { data: enrollmentStats, error: enrollmentError } = await client
        .from('course_enrollments')
        .select(`
          user_id,
          completion_percentage,
          created_at
        `);

      if (enrollmentError) {
        console.warn('⚠️ LoadUsersAction: Error loading enrollment stats:', enrollmentError);
        // Continue without enrollment data
      }

      // Process enrollment stats
      const userEnrollmentStats: Record<string, { enrollments: number; completions: number; lastActive: string }> = {};
      
      if (enrollmentStats) {
        enrollmentStats.forEach(enrollment => {
          if (!userEnrollmentStats[enrollment.user_id]) {
            userEnrollmentStats[enrollment.user_id] = {
              enrollments: 0,
              completions: 0,
              lastActive: enrollment.created_at
            };
          }
          
          userEnrollmentStats[enrollment.user_id].enrollments++;
          
          // Consider completed if progress is 100%
          if (enrollment.completion_percentage >= 100) {
            userEnrollmentStats[enrollment.user_id].completions++;
          }

          // Track most recent activity
          if (new Date(enrollment.created_at) > new Date(userEnrollmentStats[enrollment.user_id].lastActive)) {
            userEnrollmentStats[enrollment.user_id].lastActive = enrollment.created_at;
          }
        });
      }

      // Format user data
      const formattedUsers: UserWithStats[] = accounts.map(account => {
        const userId = account.primary_owner_user_id;
        const stats = userEnrollmentStats[userId] || { enrollments: 0, completions: 0, lastActive: account.created_at };
        
        return {
          id: account.id,
          name: account.name || 'Unknown User',
          email: account.email || 'No email',
          role: 'learner', // Default role for personal accounts
          account: 'Personal', // Personal accounts
          enrollments: stats.enrollments,
          completions: stats.completions,
          last_active: stats.lastActive,
          status: 'active', // Default status
          created_at: account.created_at
        };
      });

      console.log('✅ LoadUsersAction: Returning formatted users:', {
        count: formattedUsers.length,
        withEnrollments: formattedUsers.filter(u => u.enrollments > 0).length
      });

      return formattedUsers;
    } catch (error) {
      console.error('❌ LoadUsersAction: Unexpected error:', error);
      throw error;
    }
  },
  {
    auth: true,
  }
);