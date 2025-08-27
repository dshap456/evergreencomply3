import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  try {
    const { accountId, courseId } = await request.json();
    
    if (!accountId || !courseId) {
      return NextResponse.json({ error: 'accountId and courseId required' });
    }
    
    const client = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    
    // Get seat info
    const { data: seatInfo } = await client
      .from('course_seats')
      .select('*')
      .eq('account_id', accountId)
      .eq('course_id', courseId)
      .single();
    
    // Get enrollments with both clients to check for RLS issues
    const { data: enrollmentsRegular } = await client
      .from('course_enrollments')
      .select('*')
      .eq('account_id', accountId)
      .eq('course_id', courseId);
    
    const { data: enrollmentsAdmin } = await adminClient
      .from('course_enrollments')
      .select('*')
      .eq('account_id', accountId)
      .eq('course_id', courseId);
    
    // Get pending invitations with both clients
    const { data: invitationsRegular } = await client
      .from('course_invitations')
      .select('*')
      .eq('account_id', accountId)
      .eq('course_id', courseId)
      .is('accepted_at', null);
    
    const { data: invitationsAdmin } = await adminClient
      .from('course_invitations')
      .select('*')
      .eq('account_id', accountId)
      .eq('course_id', courseId)
      .is('accepted_at', null);
    
    // Calculate seats
    const totalSeats = seatInfo?.total_seats || 0;
    const enrolledCountRegular = enrollmentsRegular?.length || 0;
    const enrolledCountAdmin = enrollmentsAdmin?.length || 0;
    const pendingCountRegular = invitationsRegular?.length || 0;
    const pendingCountAdmin = invitationsAdmin?.length || 0;
    
    const usedSeatsRegular = enrolledCountRegular + pendingCountRegular;
    const usedSeatsAdmin = enrolledCountAdmin + pendingCountAdmin;
    const availableSeatsRegular = totalSeats - usedSeatsRegular;
    const availableSeatsAdmin = totalSeats - usedSeatsAdmin;
    
    return NextResponse.json({
      seatInfo: {
        total_seats: totalSeats,
        account_id: seatInfo?.account_id,
        course_id: seatInfo?.course_id
      },
      enrollments: {
        regularClient: {
          count: enrolledCountRegular,
          data: enrollmentsRegular
        },
        adminClient: {
          count: enrolledCountAdmin,
          data: enrollmentsAdmin
        },
        hasRLSIssue: enrolledCountAdmin !== enrolledCountRegular
      },
      invitations: {
        regularClient: {
          count: pendingCountRegular,
          data: invitationsRegular
        },
        adminClient: {
          count: pendingCountAdmin,
          data: invitationsAdmin
        },
        hasRLSIssue: pendingCountAdmin !== pendingCountRegular
      },
      calculation: {
        withRegularClient: {
          totalSeats,
          enrolledUsers: enrolledCountRegular,
          pendingInvitations: pendingCountRegular,
          usedSeats: usedSeatsRegular,
          availableSeats: availableSeatsRegular
        },
        withAdminClient: {
          totalSeats,
          enrolledUsers: enrolledCountAdmin,
          pendingInvitations: pendingCountAdmin,
          usedSeats: usedSeatsAdmin,
          availableSeats: availableSeatsAdmin
        },
        correctAnswer: {
          formula: 'available = total - (enrolled + pending)',
          calculation: `${totalSeats} - (${enrolledCountAdmin} + ${pendingCountAdmin}) = ${availableSeatsAdmin}`
        }
      },
      diagnosis: {
        hasIssue: availableSeatsRegular !== availableSeatsAdmin,
        issue: availableSeatsRegular !== availableSeatsAdmin 
          ? 'RLS policies are affecting the seat calculation'
          : 'Calculation appears correct'
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Debug seat calculation',
    usage: 'POST with { "accountId": "xxx", "courseId": "xxx" }'
  });
}