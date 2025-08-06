import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET() {
  const supabase = getSupabaseServerClient();
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        userError 
      }, { status: 401 });
    }
    
    // Check super admin status
    const { data: isSuperAdmin, error: adminError } = await supabase
      .rpc('is_super_admin');
      
    // Get user's account memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('accounts_memberships')
      .select(`
        account_id,
        account_role,
        accounts:account_id (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', user.id);
      
    // Check permissions on a specific account (if any)
    let permissions = null;
    if (memberships && memberships.length > 0) {
      const accountId = memberships[0].account_id;
      const { data: hasSettingsManage } = await supabase
        .rpc('has_permission', {
          user_id: user.id,
          account_id: accountId,
          permission_name: 'settings.manage'
        });
        
      permissions = {
        accountId,
        hasSettingsManage
      };
    }
    
    // Try to update a course to test
    let updateTest = null;
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, slug')
      .limit(1);
      
    if (courses && courses.length > 0) {
      const testSlug = `test-${Date.now()}`;
      const { data: updateData, error: updateError } = await supabase
        .from('courses')
        .update({ slug: testSlug })
        .eq('id', courses[0].id)
        .select();
        
      // Revert the change
      if (updateData) {
        await supabase
          .from('courses')
          .update({ slug: courses[0].slug })
          .eq('id', courses[0].id);
      }
        
      updateTest = {
        course: courses[0],
        testSlug,
        updateSuccess: !updateError,
        updateError
      };
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      isSuperAdmin,
      adminError,
      memberships: memberships?.map(m => ({
        accountId: m.account_id,
        accountName: m.accounts?.name,
        role: m.account_role
      })),
      membershipError,
      permissions,
      updateTest,
      diagnosis: {
        authenticationOk: true,
        superAdminStatus: isSuperAdmin ? 'YES' : 'NO',
        canUpdateCourses: updateTest?.updateSuccess ? 'YES' : 'NO',
        issue: !isSuperAdmin && !updateTest?.updateSuccess 
          ? 'RLS policy not checking for super admin status'
          : 'Unknown'
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}