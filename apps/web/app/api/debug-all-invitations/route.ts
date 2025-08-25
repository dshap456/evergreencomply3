import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const adminClient = getSupabaseServerAdminClient();
  
  // Get ALL course invitations
  const { data: allInvitations } = await adminClient
    .from('course_invitations')
    .select(`
      *,
      courses (
        title,
        slug
      ),
      accounts (
        name,
        slug
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);
  
  // Get ALL pending tokens
  const { data: allPendingTokens } = await adminClient
    .from('pending_invitation_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  
  // Get recent enrollments
  const { data: recentEnrollments } = await adminClient
    .from('course_enrollments')
    .select(`
      *,
      courses (
        title,
        slug
      )
    `)
    .order('enrolled_at', { ascending: false })
    .limit(10);
  
  return NextResponse.json({
    allInvitations,
    allPendingTokens,
    recentEnrollments,
    summary: {
      totalInvitations: allInvitations?.length || 0,
      totalPendingTokens: allPendingTokens?.length || 0,
      totalRecentEnrollments: recentEnrollments?.length || 0,
    }
  }, { status: 200 });
}