import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated', details: userError });
    }

    // 1. Check if user has an account
    const { data: userAccount, error: accountError } = await client
      .from('accounts')
      .select('*')
      .eq('id', user.id)
      .eq('is_personal_account', true)
      .single();

    // 2. Get team accounts where user is owner
    const { data: teamAccounts, error: teamError } = await client
      .from('accounts')
      .select('*')
      .eq('primary_owner_user_id', user.id)
      .eq('is_personal_account', false);

    // 3. Test the course seats query
    let courseSeatsError = null;
    let courseSeatsData = null;
    
    if (teamAccounts && teamAccounts.length > 0) {
      const testAccountId = teamAccounts[0].id;
      
      const { data, error } = await client
        .from('course_seats')
        .select(`
          *,
          courses!inner (
            id,
            title,
            description,
            status
          )
        `)
        .eq('account_id', testAccountId);
      
      courseSeatsData = data;
      courseSeatsError = error;
    }

    // 4. Test course invitations query
    let invitationsError = null;
    let invitationsData = null;
    
    if (teamAccounts && teamAccounts.length > 0) {
      const testAccountId = teamAccounts[0].id;
      
      const { data, error } = await client
        .from('course_invitations')
        .select('*')
        .eq('account_id', testAccountId);
      
      invitationsData = data;
      invitationsError = error;
    }

    // 5. Test team course enrollments view
    let enrollmentsError = null;
    let enrollmentsData = null;
    
    try {
      const { data, error } = await client
        .from('team_course_enrollments')
        .select('*')
        .limit(5);
      
      enrollmentsData = data;
      enrollmentsError = error;
    } catch (e) {
      enrollmentsError = e;
    }

    // 6. Test the loadCourseSeats function logic
    let loadCourseSeatsTest = null;
    
    if (teamAccounts && teamAccounts.length > 0) {
      const testAccountId = teamAccounts[0].id;
      
      try {
        // Test the exact query from loadCourseSeats
        const { data: courses } = await client
          .from('course_seats')
          .select(`
            *,
            courses!inner (
              id,
              title,
              description,
              status
            )
          `)
          .eq('account_id', testAccountId)
          .eq('courses.status', 'published');

        if (courses && courses.length > 0) {
          // Test enrollment count for first course
          const { count } = await client
            .from('course_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('account_id', testAccountId)
            .eq('course_id', courses[0].course_id);

          loadCourseSeatsTest = {
            coursesFound: courses.length,
            firstCourse: courses[0],
            enrollmentCount: count,
            availableSeats: courses[0].total_seats - (count || 0)
          };
        }
      } catch (e) {
        loadCourseSeatsTest = { error: String(e) };
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      userAccount: userAccount || 'No personal account found',
      teamAccounts: teamAccounts || [],
      courseSeats: {
        data: courseSeatsData,
        error: courseSeatsError
      },
      invitations: {
        data: invitationsData,
        error: invitationsError
      },
      enrollments: {
        data: enrollmentsData,
        error: enrollmentsError
      },
      loadCourseSeatsTest
    }, { status: 200 });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}