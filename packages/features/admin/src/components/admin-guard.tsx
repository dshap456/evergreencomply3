import { notFound, redirect } from 'next/navigation';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { isSuperAdmin } from '../lib/server/utils/is-super-admin';

type LayoutOrPageComponent<Params> = React.ComponentType<Params>;

/**
 * AdminGuard is a server component wrapper that checks if the user is a super-admin before rendering the component.
 * If the user is not a super-admin, we redirect to a 404.
 * @param Component - The Page or Layout component to wrap
 */
export function AdminGuard<Params extends object>(
  Component: LayoutOrPageComponent<Params>,
) {
  return async function AdminGuardServerComponentWrapper(params: Params) {
    const client = getSupabaseServerClient();
    
    // Check if user is authenticated
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) {
      notFound();
    }
    
    // Check if user has super-admin role (without MFA check)
    const { data: userData } = await client.auth.getUser();
    const hasAdminRole = userData?.user?.app_metadata?.role === 'super-admin' || 
                        userData?.user?.user_metadata?.role === 'super-admin';
    
    // Check if user is a super admin (with MFA)
    const isUserSuperAdmin = await isSuperAdmin(client);

    // If user has admin role but not MFA, redirect to setup page
    if (hasAdminRole && !isUserSuperAdmin) {
      redirect('/admin/setup-mfa');
    }
    
    // if the user is not a super-admin at all, we redirect to a 404
    if (!isUserSuperAdmin) {
      notFound();
    }

    return <Component {...params} />;
  };
}
