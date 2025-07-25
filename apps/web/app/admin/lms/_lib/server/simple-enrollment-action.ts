'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function simpleEnrollUserAction(userEmail: string, courseId: string) {
  console.log('🚀 SimpleEnroll: Called with:', { userEmail, courseId });
  
  try {
    // Use admin client to bypass RLS when looking up users
    const adminClient = getSupabaseServerAdminClient();
    const client = getSupabaseServerClient();
    
    // Find user by email using admin client
    const { data: userAccount, error: userError } = await adminClient
      .from('accounts')
      .select('primary_owner_user_id')
      .eq('email', userEmail)
      .eq('is_personal_account', true)
      .single();
    
    if (userError || !userAccount) {
      console.error('❌ User lookup error:', userError);
      throw new Error(`User not found: ${userEmail}`);
    }
    
    const userId = userAccount.primary_owner_user_id;
    
    // Create enrollment
    const { data: enrollment, error: enrollError } = await client
      .from('course_enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        progress_percentage: 0
      })
      .select()
      .single();
    
    if (enrollError) {
      throw new Error(`Enrollment failed: ${enrollError.message}`);
    }
    
    return {
      success: true,
      message: `Successfully enrolled ${userEmail}`,
      enrollment
    };
  } catch (error) {
    console.error('❌ SimpleEnroll Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}