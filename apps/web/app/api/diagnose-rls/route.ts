import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET() {
  try {
    const adminClient = getSupabaseServerAdminClient();
    const regularClient = getSupabaseServerClient();
    
    // Get current user
    const { data: { user } } = await regularClient.auth.getUser();
    
    // Test 1: List all policies on courses table
    const { data: policies, error: policiesError } = await adminClient
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'courses')
      .eq('schemaname', 'public');
    
    // Test 2: Try different queries to isolate the issue
    const tests = {
      // Simple count with admin
      adminCount: await adminClient
        .from('courses')
        .select('*', { count: 'exact', head: true }),
      
      // Simple select with admin
      adminSelect: await adminClient
        .from('courses')
        .select('id, title')
        .limit(3),
      
      // Try with regular client - just id
      regularJustId: await regularClient
        .from('courses')
        .select('id')
        .limit(1),
      
      // Try with regular client - specific columns
      regularSpecific: await regularClient
        .from('courses')
        .select('id, title, status')
        .limit(1),
      
      // Check if user has super admin
      isSuperAdmin: await regularClient.rpc('is_super_admin'),
      
      // Check if user has any role
      userRoles: await regularClient
        .from('accounts_memberships')
        .select('account_id, account_role')
        .eq('user_id', user?.id || ''),
    };
    
    // Test 3: Raw SQL query to check policies
    const { data: rawPolicies, error: rawPoliciesError } = await adminClient.rpc('get_policies_debug');
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: user ? {
        id: user.id,
        email: user.email
      } : null,
      
      policies: {
        count: policies?.length || 0,
        data: policies,
        error: policiesError?.message
      },
      
      tests,
      
      rawPolicies: {
        data: rawPolicies,
        error: rawPoliciesError?.message
      },
      
      sqlToCreateDebugFunction: `
-- Run this in Supabase SQL editor first:
CREATE OR REPLACE FUNCTION get_policies_debug()
RETURNS TABLE(
  policyname text,
  tablename text,
  cmd text,
  qual text,
  with_check text
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pol.policyname::text,
    pol.tablename::text,
    pol.cmd::text,
    pol.qual::text,
    pol.with_check::text
  FROM pg_policies pol
  WHERE pol.schemaname = 'public' 
    AND pol.tablename = 'courses';
END;
$$ LANGUAGE plpgsql;
      `
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
      details: error
    }, { status: 500 });
  }
}