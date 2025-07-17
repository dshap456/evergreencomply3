import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createTeamAccountsApi } from '@kit/team-accounts/api';

/**
 * @description Loads courses for a team account
 */
export const loadTeamCourses = cache(async (account: string) => {
  const client = getSupabaseServerClient();
  const api = createTeamAccountsApi(client);
  
  // Get team account by slug
  const teamAccount = await api.getTeamAccount(account);
  
  // Load courses for this account
  const { data: courses, error } = await client
    .from('courses')
    .select(`
      *,
      modules:course_modules(
        id,
        title,
        order_index,
        lessons(id, title, content_type, order_index)
      )
    `)
    .eq('account_id', teamAccount.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return courses || [];
});

/**
 * @description Loads a specific course with its modules and lessons
 */
export const loadTeamCourse = cache(async (account: string, courseId: string) => {
  const client = getSupabaseServerClient();
  const api = createTeamAccountsApi(client);
  
  // Get team account by slug
  const teamAccount = await api.getTeamAccount(account);
  
  // Load specific course
  const { data: course, error } = await client
    .from('courses')
    .select(`
      *,
      modules:course_modules(
        *,
        lessons(
          *,
          quiz_questions(*)
        )
      )
    `)
    .eq('account_id', teamAccount.id)
    .eq('id', courseId)
    .order('order_index', { 
      referencedTable: 'course_modules',
      ascending: true 
    })
    .order('order_index', { 
      referencedTable: 'course_modules.lessons',
      ascending: true 
    })
    .single();

  if (error) {
    throw error;
  }

  return course;
});