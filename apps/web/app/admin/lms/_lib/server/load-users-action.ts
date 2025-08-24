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
  currentEnrollments?: Array<{
    courseName: string;
    progress: number;
    enrolledAt: string;
  }>;
  finalQuizScores?: Array<{
    courseName: string;
    score: number;
    passed: boolean;
    completedAt: string;
  }>;
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
        console.warn('💡 LoadUsersAction: If you expect users to exist, ensure personal accounts are properly created during signup.');
        return [];
      }

      console.log(`📊 LoadUsersAction: Found ${accounts.length} user accounts`);

      // Load enrollment stats for all users
      const { data: enrollmentStats, error: enrollmentError } = await client
        .from('course_enrollments')
        .select(`
          user_id,
          progress_percentage,
          enrolled_at,
          completed_at,
          final_score,
          course_id,
          courses(
            title
          )
        `);

      // Also load final quiz scores from course completions
      const { data: completions, error: completionsError } = await client
        .from('course_completions')
        .select(`
          user_id,
          course_name,
          final_quiz_score,
          final_quiz_passed,
          completed_at
        `);

      if (enrollmentError) {
        console.error('❌ LoadUsersAction: Error loading enrollment stats:', enrollmentError);
        console.error('❌ LoadUsersAction: Enrollment error details:', {
          message: enrollmentError.message,
          code: enrollmentError.code,
          details: enrollmentError.details
        });
        // Continue without enrollment data
      } else {
        console.log(`✅ LoadUsersAction: Successfully loaded ${enrollmentStats?.length || 0} enrollment records`);
      }

      if (completionsError) {
        console.error('❌ LoadUsersAction: Error loading completions:', completionsError);
        // Continue without completion data
      } else {
        console.log(`✅ LoadUsersAction: Successfully loaded ${completions?.length || 0} completion records`);
      }

      // Process enrollment stats
      const userEnrollmentStats: Record<string, { 
        enrollments: number; 
        completions: number; 
        lastActive: string;
        currentEnrollments: Array<{
          courseName: string;
          progress: number;
          enrolledAt: string;
        }>;
        finalQuizScores: Array<{
          courseName: string;
          score: number;
          passed: boolean;
          completedAt: string;
        }>;
      }> = {};
      
      if (enrollmentStats) {
        console.log(`📊 LoadUsersAction: Processing ${enrollmentStats.length} enrollment records`);
        
        enrollmentStats.forEach(enrollment => {
          console.log(`📝 Processing enrollment: user_id=${enrollment.user_id}, progress=${enrollment.progress_percentage}%`);
          
          if (!userEnrollmentStats[enrollment.user_id]) {
            userEnrollmentStats[enrollment.user_id] = {
              enrollments: 0,
              completions: 0,
              lastActive: enrollment.enrolled_at,
              currentEnrollments: [],
              finalQuizScores: []
            };
          }
          
          userEnrollmentStats[enrollment.user_id].enrollments++;
          
          // Consider completed if progress is 100% or has completed_at
          if ((enrollment.progress_percentage && enrollment.progress_percentage >= 100) || enrollment.completed_at) {
            userEnrollmentStats[enrollment.user_id].completions++;
            
            // If there's a final score, add it to the quiz scores
            if (enrollment.final_score !== null && enrollment.final_score !== undefined) {
              userEnrollmentStats[enrollment.user_id].finalQuizScores.push({
                courseName: enrollment.courses?.title || 'Unknown Course',
                score: Number(enrollment.final_score),
                passed: Number(enrollment.final_score) >= 80,
                completedAt: enrollment.completed_at || enrollment.enrolled_at
              });
            }
          } else {
            // Add to current enrollments if not completed
            userEnrollmentStats[enrollment.user_id].currentEnrollments.push({
              courseName: enrollment.courses?.title || 'Unknown Course',
              progress: enrollment.progress_percentage || 0,
              enrolledAt: enrollment.enrolled_at
            });
          }

          // Track most recent activity
          if (new Date(enrollment.enrolled_at) > new Date(userEnrollmentStats[enrollment.user_id].lastActive)) {
            userEnrollmentStats[enrollment.user_id].lastActive = enrollment.enrolled_at;
          }
        });
        
        // Process completion records for final quiz scores
        if (completions) {
          console.log(`📊 LoadUsersAction: Processing ${completions.length} completion records`);
          
          completions.forEach(completion => {
            if (!userEnrollmentStats[completion.user_id]) {
              userEnrollmentStats[completion.user_id] = {
                enrollments: 0,
                completions: 0,
                lastActive: completion.completed_at,
                currentEnrollments: [],
                finalQuizScores: []
              };
            }
            
            // Add final quiz score from completions if not already present
            if (completion.final_quiz_score !== null && completion.final_quiz_score !== undefined) {
              const alreadyHasScore = userEnrollmentStats[completion.user_id].finalQuizScores.some(
                score => score.courseName === completion.course_name
              );
              
              if (!alreadyHasScore) {
                userEnrollmentStats[completion.user_id].finalQuizScores.push({
                  courseName: completion.course_name,
                  score: Number(completion.final_quiz_score),
                  passed: completion.final_quiz_passed || false,
                  completedAt: completion.completed_at
                });
              }
            }
          });
        }
        
        console.log('📊 Enrollment stats by user:', userEnrollmentStats);
        
        // Check specifically for david's enrollment
        const davidEnrollment = enrollmentStats.find(e => e.user_id === '1b66279f-f6eb-439b-8312-540e7d294518');
        if (davidEnrollment) {
          console.log('🔍 Found davidbannon010 enrollment:', davidEnrollment);
        } else {
          console.log('❌ No enrollment found for davidbannon010 (user_id: 1b66279f-f6eb-439b-8312-540e7d294518)');
        }
      } else {
        console.log('⚠️ LoadUsersAction: No enrollment stats to process');
      }

      // Format user data
      const formattedUsers: UserWithStats[] = accounts.map(account => {
        const authUserId = account.primary_owner_user_id; // This is the auth.users.id
        const stats = userEnrollmentStats[authUserId] || { 
          enrollments: 0, 
          completions: 0, 
          lastActive: account.created_at,
          currentEnrollments: [],
          finalQuizScores: []
        };
        
        console.log(`👤 Processing account: ${account.email} (auth_id: ${authUserId}) -> enrollments: ${stats.enrollments}`);
        
        // Special check for david
        if (account.email === 'davidbannon010@gmail.com') {
          console.log('🔍 David account processing:', {
            authUserId,
            hasStatsInMap: authUserId in userEnrollmentStats,
            stats
          });
        }
        
        return {
          id: account.id, // Account ID for display
          name: account.name || 'Unknown User',
          email: account.email || 'No email',
          role: 'learner', // Default role for individual accounts
          account: 'Individual', // Individual accounts
          enrollments: stats.enrollments,
          completions: stats.completions,
          last_active: stats.lastActive || account.created_at || new Date().toISOString(),
          status: 'active', // Default status
          created_at: account.created_at || new Date().toISOString(),
          currentEnrollments: stats.currentEnrollments,
          finalQuizScores: stats.finalQuizScores
        };
      });

      console.log('✅ LoadUsersAction: Returning formatted users:', {
        count: formattedUsers.length,
        withEnrollments: formattedUsers.filter(u => u.enrollments > 0).length,
        withFinalScores: formattedUsers.filter(u => u.finalQuizScores && u.finalQuizScores.length > 0).length
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