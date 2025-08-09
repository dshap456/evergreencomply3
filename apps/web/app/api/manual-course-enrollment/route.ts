import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

// Simple manual enrollment creation for testing
export async function POST(request: NextRequest) {
  try {
    const { email, courseSlug } = await request.json();
    
    if (!email || !courseSlug) {
      return NextResponse.json({ 
        error: 'Missing email or courseSlug' 
      }, { status: 400 });
    }

    const adminClient = getSupabaseServerAdminClient();
    
    // Get user by email
    const { data: user, error: userError } = await adminClient
      .from('accounts')
      .select('id, name, email')
      .eq('email', email)
      .eq('is_personal_account', true)
      .single();
      
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'User not found',
        details: userError?.message 
      }, { status: 404 });
    }
    
    // Get course by slug
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('id, title, billing_product_id')
      .eq('billing_product_id', courseSlug)
      .single();
      
    if (courseError || !course) {
      return NextResponse.json({ 
        error: 'Course not found',
        details: courseError?.message,
        searchedFor: courseSlug
      }, { status: 404 });
    }
    
    // Check if enrollment already exists
    const { data: existingEnrollment } = await adminClient
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .single();
      
    if (existingEnrollment) {
      return NextResponse.json({ 
        message: 'Already enrolled',
        enrollment: existingEnrollment,
        user,
        course
      });
    }
    
    // Create enrollment
    const { data: enrollment, error: enrollError } = await adminClient
      .from('course_enrollments')
      .insert({
        user_id: user.id,
        course_id: course.id,
        enrolled_at: new Date().toISOString(),
        progress_percentage: 0
      })
      .select()
      .single();
      
    if (enrollError) {
      return NextResponse.json({ 
        error: 'Failed to create enrollment',
        details: enrollError.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Enrollment created successfully',
      enrollment,
      user,
      course
    });
    
  } catch (error) {
    console.error('Manual enrollment error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}