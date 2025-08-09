import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

export async function POST(request: NextRequest) {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  
  if (!auth.data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseServerAdminClient();
  const { courseTitle } = await request.json();
  
  // Debug info collection
  const debugInfo: any = {
    user: {
      id: auth.data.id,
      email: auth.data.email,
    },
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Find the course
    const { data: courses, error: courseError } = await adminClient
      .from('courses')
      .select('id, title, status, price, billing_product_id, sku')
      .ilike('title', `%${courseTitle}%`);
    
    debugInfo.courseSearchResult = { courses, error: courseError };
    
    if (!courses || courses.length === 0) {
      return NextResponse.json({ 
        error: 'Course not found',
        debugInfo 
      }, { status: 404 });
    }
    
    const course = courses[0];
    debugInfo.selectedCourse = course;
    
    // 2. Check if enrollment exists
    const { data: enrollment, error: enrollmentError } = await adminClient
      .from('course_enrollments')
      .select('*')
      .eq('user_id', auth.data.id)
      .eq('course_id', course.id)
      .single();
    
    debugInfo.enrollmentCheck = { enrollment, error: enrollmentError };
    
    // 3. Check has_course_access function
    const { data: hasAccess, error: accessError } = await adminClient
      .rpc('has_course_access', {
        p_user_id: auth.data.id,
        p_course_id: course.id,
      });
    
    debugInfo.hasAccessCheck = { hasAccess, error: accessError };
    
    // 4. Check if user has any purchase records (course_seats for teams)
    const { data: personalAccount } = await adminClient
      .from('accounts')
      .select('id')
      .eq('id', auth.data.id)
      .eq('is_personal_account', true)
      .single();
      
    debugInfo.personalAccount = personalAccount;
    
    // 5. Try to check course_seats if this is a team purchase
    const { data: teamAccounts } = await adminClient
      .from('accounts_memberships')
      .select('account_id')
      .eq('user_id', auth.data.id);
      
    if (teamAccounts && teamAccounts.length > 0) {
      const accountIds = teamAccounts.map(ta => ta.account_id);
      const { data: courseSeats } = await adminClient
        .from('course_seats')
        .select('*')
        .eq('course_id', course.id)
        .in('account_id', accountIds);
        
      debugInfo.teamCourseSeats = courseSeats;
    }
    
    // 6. Check what happens when we try to enroll
    if (!enrollment) {
      debugInfo.enrollmentAttemptReason = 'No existing enrollment found, will attempt to create';
      
      // Check if course is published
      const isPublished = course.status === 'published' || 
                         (course as any).is_published === true;
      debugInfo.isPublished = isPublished;
      
      if (!isPublished) {
        debugInfo.enrollmentAttemptResult = 'Course is not published';
      } else if (!hasAccess) {
        debugInfo.enrollmentAttemptResult = 'User does not have access (needs purchase)';
      } else {
        // Try to create enrollment
        const { data: newEnrollment, error: createError } = await adminClient
          .from('course_enrollments')
          .insert({
            user_id: auth.data.id,
            course_id: course.id,
            enrolled_at: new Date().toISOString(),
            progress_percentage: 0
          })
          .select()
          .single();
          
        debugInfo.enrollmentCreation = { newEnrollment, error: createError };
      }
    }
    
    return NextResponse.json({ 
      debugInfo,
      recommendation: getRecommendation(debugInfo)
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug process failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      debugInfo
    }, { status: 500 });
  }
}

function getRecommendation(debugInfo: any): string {
  if (debugInfo.enrollmentCheck?.enrollment) {
    return 'Enrollment exists - user should be able to access the course';
  }
  
  if (!debugInfo.hasAccessCheck?.hasAccess) {
    return 'User does not have access - webhook likely failed to process the purchase';
  }
  
  if (!debugInfo.isPublished) {
    return 'Course is not published - check course status in database';
  }
  
  if (debugInfo.enrollmentCreation?.error) {
    return `Failed to create enrollment: ${debugInfo.enrollmentCreation.error.message}`;
  }
  
  if (debugInfo.enrollmentCreation?.newEnrollment) {
    return 'Successfully created enrollment - user should now be able to access the course';
  }
  
  return 'Unknown issue - check debug info for details';
}