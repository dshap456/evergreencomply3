import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated', userError }, { status: 401 });
    }
    
    // Get user's team account
    const { data: membership, error: membershipError } = await client
      .from('accounts_memberships')
      .select('account_id, account_role')
      .eq('user_id', user.id)
      .single();
    
    if (membershipError) {
      return NextResponse.json({ 
        error: 'No team membership found', 
        details: membershipError 
      }, { status: 404 });
    }
    
    // Test 1: Check if course_seats table exists
    const { data: seatsTableTest, error: seatsTableError } = await client
      .from('course_seats')
      .select('*')
      .limit(1);
    
    // Test 2: Check if course_invitations table exists  
    const { data: invitationsTableTest, error: invitationsTableError } = await client
      .from('course_invitations')
      .select('*')
      .limit(1);
    
    // Test 3: Check course_enrollments columns
    const { data: enrollmentsTest, error: enrollmentsError } = await client
      .from('course_enrollments')
      .select('id, account_id, invited_by, invitation_id')
      .limit(1);
    
    // Test 4: Try the actual query from course-seat-management
    const { data: courseSeatData, error: seatQueryError } = await client
      .from('course_seats')
      .select(`
        id,
        course_id,
        total_seats
      `)
      .eq('account_id', membership.account_id);
    
    // Test 5: Get courses
    const courseIds = courseSeatData?.map(s => s.course_id) || [];
    let courseData = null;
    let courseError = null;
    
    if (courseIds.length > 0) {
      const { data, error } = await client
        .from('courses')
        .select('id, title, status')
        .in('id', courseIds);
      
      courseData = data;
      courseError = error;
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      membership: membership,
      tests: {
        course_seats_table: {
          exists: !seatsTableError,
          error: seatsTableError?.message,
          data: seatsTableTest,
        },
        course_invitations_table: {
          exists: !invitationsTableError,
          error: invitationsTableError?.message,
          data: invitationsTableTest,
        },
        course_enrollments_columns: {
          exists: !enrollmentsError,
          error: enrollmentsError?.message,
          hasNewColumns: enrollmentsTest?.[0] ? {
            has_account_id: 'account_id' in enrollmentsTest[0],
            has_invited_by: 'invited_by' in enrollmentsTest[0],
            has_invitation_id: 'invitation_id' in enrollmentsTest[0],
          } : null,
        },
        course_seats_query: {
          success: !seatQueryError,
          error: seatQueryError?.message,
          count: courseSeatData?.length || 0,
          data: courseSeatData,
        },
        courses_query: {
          success: !courseError,
          error: courseError?.message,
          data: courseData,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}