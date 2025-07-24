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
    
    console.log('🔍 AdminGuard: Starting authentication check...');
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    console.log('👤 AdminGuard: User auth result:', { 
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      userError: userError?.message,
      appMetadata: user?.app_metadata,
      userMetadata: user?.user_metadata
    });
    
    if (!user) {
      console.log('❌ AdminGuard: No user found - calling notFound()');
      notFound();
    }
    
    // Check if user has super-admin role (without MFA check)
    const { data: userData } = await client.auth.getUser();
    const hasAdminRole = userData?.user?.app_metadata?.role === 'super-admin' || 
                        userData?.user?.user_metadata?.role === 'super-admin';
    
    console.log('🔑 AdminGuard: Admin role check:', { 
      hasAdminRole,
      appMetadataRole: userData?.user?.app_metadata?.role,
      userMetadataRole: userData?.user?.user_metadata?.role 
    });
    
    // Check if user is a super admin (with MFA)
    let isUserSuperAdmin = false;
    try {
      isUserSuperAdmin = await isSuperAdmin(client);
      console.log('🛡️ AdminGuard: isSuperAdmin result:', isUserSuperAdmin);
    } catch (error) {
      console.error('❌ AdminGuard: isSuperAdmin error:', error);
    }

    // If user has admin role but not MFA, redirect to setup page
    if (hasAdminRole && !isUserSuperAdmin) {
      console.log('🔐 AdminGuard: Has admin role but no MFA - redirecting to setup');
      redirect('/admin/setup-mfa');
    }
    
    // if the user is not a super-admin at all, we redirect to a 404
    if (!isUserSuperAdmin) {
      console.log('❌ AdminGuard: User is not super admin - calling notFound()');
      notFound();
    }

    console.log('✅ AdminGuard: All checks passed - rendering component');
    return <Component {...params} />;
  };
}
