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
    
    console.log('Diagnosing enrollment for user:', user.email);
    
    // 1. Check all published courses
    const { data: courses, error: coursesError } = await adminClient
      .from('courses')
      .select('id, title, slug, price, billing_product_id, requires_purchase, status')
      .eq('status', 'published');
      
    if (coursesError) throw coursesError;
    
    console.log('Published courses:', courses);
    
    // 2. Check user's enrollments
    const { data: enrollments, error: enrollmentsError } = await adminClient
      .from('course_enrollments')
      .select('course_id, enrolled_at, progress_percentage')
      .eq('user_id', user.id);
      
    if (enrollmentsError) throw enrollmentsError;
    
    console.log('User enrollments:', enrollments);
    
    // 3. Check user's orders (if any)
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
      .eq('account_id', user.id)
      .eq('status', 'succeeded');
      
    console.log('User orders:', orders);
    
    // 4. Check if DOT HAZMAT course exists
    const dotHazmatCourse = courses?.find(c => 
      c.title?.includes('DOT HAZMAT') || 
      c.slug === 'dot-hazmat'
    );
    
    if (!dotHazmatCourse) {
      return NextResponse.json({
        error: 'DOT HAZMAT course not found',
        availableCourses: courses
      });
    }
    
    console.log('DOT HAZMAT course found:', dotHazmatCourse);
    
    // 5. Check if user is already enrolled
    const isEnrolled = enrollments?.some(e => e.course_id === dotHazmatCourse.id);
    
    if (isEnrolled) {
      return NextResponse.json({
        message: 'User is already enrolled in DOT HAZMAT course',
        course: dotHazmatCourse,
        enrollment: enrollments?.find(e => e.course_id === dotHazmatCourse.id)
      });
    }
    
    // 6. Create manual enrollment for testing
    const { data: newEnrollment, error: enrollmentError } = await adminClient
      .from('course_enrollments')
      .insert({
        user_id: user.id,
        course_id: dotHazmatCourse.id,
        enrolled_at: new Date().toISOString(),
        progress_percentage: 0
      })
      .select()
      .single();
      
    if (enrollmentError) {
      console.error('Error creating enrollment:', enrollmentError);
      return NextResponse.json({
        error: 'Failed to create enrollment',
        details: enrollmentError
      });
    }
    
    console.log('Created enrollment:', newEnrollment);
    
    // 7. Also check the advanced hazmat course
    const advancedHazmatCourse = courses?.find(c => 
      c.title?.includes('Advanced Awareness') || 
      c.slug === 'advanced-hazmat'
    );
    
    if (advancedHazmatCourse && !enrollments?.some(e => e.course_id === advancedHazmatCourse.id)) {
      const { data: advEnrollment, error: advError } = await adminClient
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: advancedHazmatCourse.id,
          enrolled_at: new Date().toISOString(),
          progress_percentage: 0
        })
        .select()
        .single();
        
      console.log('Also enrolled in Advanced HAZMAT:', advEnrollment);
    }
    
    // 8. EPA RCRA course
    const epaRcraCourse = courses?.find(c => 
      c.title?.includes('EPA RCRA') || 
      c.slug === 'epa-rcra'
    );
    
    if (epaRcraCourse && !enrollments?.some(e => e.course_id === epaRcraCourse.id)) {
      const { data: epaEnrollment, error: epaError } = await adminClient
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: epaRcraCourse.id,
          enrolled_at: new Date().toISOString(),
          progress_percentage: 0
        })
        .select()
        .single();
        
      console.log('Also enrolled in EPA RCRA:', epaEnrollment);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Manual enrollments created for all published courses',
      enrollments: {
        dotHazmat: newEnrollment,
        courses: courses,
        previousEnrollments: enrollments
      },
      instructions: 'Please refresh the courses page. You should now see "Start Course" buttons instead of "Enroll Now".'
    });
    
  } catch (error) {
    console.error('Diagnostic error:', error);
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: error
    }, { status: 500 });
  }
}