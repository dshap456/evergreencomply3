import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const diagnostics: any = {
      user: {
        id: user.id,
        email: user.email
      },
      timestamp: new Date().toISOString()
    };
    
    // 1. Get all published courses with full details
    const { data: courses, error: coursesError } = await adminClient
      .from('courses')
      .select('*')
      .eq('status', 'published');
      
    if (coursesError) {
      diagnostics.coursesError = coursesError;
    } else {
      diagnostics.publishedCourses = courses?.map(c => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        price: c.price,
        billing_product_id: c.billing_product_id,
        requires_purchase: c.requires_purchase
      }));
    }
    
    // 2. Check user's enrollments
    const { data: enrollments, error: enrollmentsError } = await adminClient
      .from('course_enrollments')
      .select(`
        course_id,
        enrolled_at,
        progress_percentage,
        courses!inner (
          title,
          slug
        )
      `)
      .eq('user_id', user.id);
      
    diagnostics.userEnrollments = enrollments || [];
    if (enrollmentsError) diagnostics.enrollmentsError = enrollmentsError;
    
    // 3. Test has_course_access function for each course
    diagnostics.accessChecks = [];
    if (courses) {
      for (const course of courses) {
        const { data: hasAccess, error: accessError } = await adminClient
          .rpc('has_course_access', {
            p_user_id: user.id,
            p_course_id: course.id
          });
        
        diagnostics.accessChecks.push({
          courseTitle: course.title,
          courseId: course.id,
          courseSlug: course.slug,
          hasAccess: hasAccess,
          error: accessError
        });
      }
    }
    
    // 4. Check user's orders
    const { data: orders, error: ordersError } = await adminClient
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        order_items (
          product_id,
          quantity
        )
      `)
      .eq('account_id', user.id);
      
    diagnostics.userOrders = orders || [];
    if (ordersError) diagnostics.ordersError = ordersError;
    
    // 5. Check if user is in accounts table
    const { data: account, error: accountError } = await adminClient
      .from('accounts')
      .select('*')
      .eq('id', user.id)
      .single();
      
    diagnostics.userAccount = account ? {
      id: account.id,
      email: account.email,
      is_personal_account: account.is_personal_account
    } : null;
    if (accountError) diagnostics.accountError = accountError;
    
    // 6. Check course_seats for any team access
    const { data: teamSeats, error: teamSeatsError } = await adminClient
      .from('accounts_memberships')
      .select(`
        account_id,
        role,
        accounts!inner (
          name
        )
      `)
      .eq('user_id', user.id);
      
    if (teamSeats && teamSeats.length > 0) {
      diagnostics.userTeams = teamSeats;
      
      // Check team course seats
      const teamAccountIds = teamSeats.map(t => t.account_id);
      const { data: courseSeats, error: seatsError } = await adminClient
        .from('course_seats')
        .select(`
          account_id,
          course_id,
          total_seats,
          courses!inner (
            title,
            slug
          )
        `)
        .in('account_id', teamAccountIds);
        
      diagnostics.teamCourseSeats = courseSeats || [];
      if (seatsError) diagnostics.seatsError = seatsError;
    }
    
    // 7. Identify the issue with DOT HAZMAT specifically
    const dotHazmatCourse = courses?.find(c => 
      c.slug === 'dot-hazmat' || c.title?.includes('DOT HAZMAT')
    );
    
    if (dotHazmatCourse) {
      const isEnrolled = enrollments?.some(e => e.course_id === dotHazmatCourse.id);
      const hasAccess = diagnostics.accessChecks?.find(a => a.courseId === dotHazmatCourse.id)?.hasAccess;
      
      diagnostics.dotHazmatStatus = {
        courseFound: true,
        courseId: dotHazmatCourse.id,
        courseSlug: dotHazmatCourse.slug,
        isEnrolled: isEnrolled,
        hasAccess: hasAccess,
        requiresPurchase: dotHazmatCourse.requires_purchase,
        price: dotHazmatCourse.price,
        billingProductId: dotHazmatCourse.billing_product_id
      };
      
      // Check for any orders with this product
      if (dotHazmatCourse.billing_product_id) {
        const hasOrder = orders?.some(o => 
          o.order_items?.some(i => i.product_id === dotHazmatCourse.billing_product_id)
        );
        diagnostics.dotHazmatStatus.hasOrder = hasOrder;
      }
    }
    
    // 8. Summary and recommendations
    diagnostics.summary = {
      totalPublishedCourses: courses?.length || 0,
      userEnrollments: enrollments?.length || 0,
      coursesWithAccess: diagnostics.accessChecks?.filter(a => a.hasAccess).length || 0,
      coursesWithoutAccess: diagnostics.accessChecks?.filter(a => !a.hasAccess).length || 0,
      totalOrders: orders?.length || 0,
      succeededOrders: orders?.filter(o => o.status === 'succeeded').length || 0
    };
    
    // Provide actionable recommendations
    diagnostics.recommendations = [];
    
    if (dotHazmatCourse && !enrollments?.some(e => e.course_id === dotHazmatCourse.id)) {
      if (!diagnostics.dotHazmatStatus.hasAccess) {
        diagnostics.recommendations.push('User does not have access to DOT HAZMAT course - needs purchase or manual enrollment');
      } else {
        diagnostics.recommendations.push('User has access to DOT HAZMAT but is not enrolled - enrollment should be created');
      }
    }
    
    return NextResponse.json(diagnostics, { status: 200 });
    
  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}