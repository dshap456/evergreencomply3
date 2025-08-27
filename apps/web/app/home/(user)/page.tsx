import { redirect } from 'next/navigation';
import pathsConfig from '~/config/paths.config';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export default async function UserHomePage() {
  const client = getSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    redirect('/auth/sign-in');
  }
  
  // Check if user has a team account they manage
  const { data: teamMemberships } = await client
    .from('accounts_memberships')
    .select(`
      account_id,
      account_role,
      accounts!inner(
        id,
        name,
        slug,
        is_personal_account
      )
    `)
    .eq('user_id', user.id)
    .eq('account_role', 'team_manager')
    .eq('accounts.is_personal_account', false)
    .limit(1);
  
  // If user manages a team, redirect to team courses page
  if (teamMemberships && teamMemberships.length > 0) {
    const teamAccount = teamMemberships[0].accounts;
    const teamSlug = teamAccount.slug || teamAccount.id;
    redirect(`/home/${teamSlug}/courses`);
  }
  
  // Otherwise redirect to personal courses page
  redirect(pathsConfig.app.personalAccountCourses);
}
