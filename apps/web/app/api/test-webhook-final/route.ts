// Final test - simulate exact Stripe webhook call
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: NextRequest) {
  console.error('🧪 FINAL TEST: Testing webhook processing directly');
  
  const adminClient = getSupabaseServerAdminClient();
  
  // Test data matching real Stripe event
  const courseSlug = 'advanced-hazmat';
  const accountId = 'b6c5a2cb-d4d7-4ac4-9296-85a5ea0b55bd';
  const sessionId = 'cs_test_final_' + Date.now();
  const quantity = 2;
  const customerEmail = 'testbrittnay@gmail.com';
  
  try {
    console.error('Testing stored procedure call...');
    
    // Call the stored procedure exactly as webhook does
    const { data, error } = await adminClient.rpc('process_course_purchase_by_slug', {
      p_course_slug: courseSlug,
      p_account_id: accountId,
      p_payment_id: sessionId,
      p_quantity: quantity,
      p_customer_name: customerEmail,
    });
    
    if (error) {
      console.error('❌ Stored procedure error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error,
      });
    }
    
    console.error('✅ Stored procedure success:', data);
    
    // Now test team account creation
    console.error('Testing team account logic...');
    
    if (quantity >= 2) {
      // Check for existing team
      const { data: existingTeam } = await adminClient
        .from('accounts_memberships')
        .select('account_id')
        .eq('user_id', accountId)
        .eq('account_role', 'team_manager')
        .single();
      
      if (!existingTeam) {
        // Create team account
        const emailPrefix = customerEmail.split('@')[0];
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        
        const { data: newTeam, error: teamError } = await adminClient
          .from('accounts')
          .insert({
            primary_owner_user_id: accountId,
            name: `${emailPrefix}'s Team`,
            slug: `${emailPrefix}-team-${randomSuffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            is_personal_account: false,
          })
          .select()
          .single();
        
        if (teamError) {
          console.error('❌ Team creation error:', teamError);
        } else {
          console.error('✅ Team created:', newTeam?.id);
          
          // Add membership
          const { error: memberError } = await adminClient
            .from('accounts_memberships')
            .insert({
              user_id: accountId,
              account_id: newTeam.id,
              account_role: 'team_manager',
            });
          
          if (memberError) {
            console.error('❌ Membership error:', memberError);
          } else {
            console.error('✅ Membership created');
          }
        }
      } else {
        console.error('✅ Existing team found:', existingTeam.account_id);
      }
    }
    
    return NextResponse.json({
      success: true,
      storedProcResult: data,
      message: 'Test completed successfully',
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// GET endpoint to verify setup
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Test endpoint ready to simulate webhook processing',
  });
}