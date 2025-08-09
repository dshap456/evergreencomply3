import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';

// This is a temporary endpoint to fix missing enrollments for users who purchased courses
// before the webhook was set up

export async function POST(request: NextRequest) {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  
  if (!auth.data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseServerAdminClient();
  
  try {
    const { courseTitle } = await request.json();
    
    // Find the course by title
    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('id, title, billing_product_id')
      .ilike('title', `%${courseTitle}%`)
      .single();
      
    if (courseError || !course) {
      return NextResponse.json({ 
        error: 'Course not found', 
        details: courseError?.message 
      }, { status: 404 });
    }
    
    // Check if enrollment already exists
    const { data: existingEnrollment } = await adminClient
      .from('course_enrollments')
      .select('id')
      .eq('user_id', auth.data.id)
      .eq('course_id', course.id)
      .single();
      
    if (existingEnrollment) {
      return NextResponse.json({ 
        message: 'Enrollment already exists',
        enrollment: existingEnrollment 
      });
    }
    
    // Create the enrollment
    const { data: newEnrollment, error: enrollError } = await adminClient
      .from('course_enrollments')
      .insert({
        user_id: auth.data.id,
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
      message: `Successfully enrolled in ${course.title}`,
      enrollment: newEnrollment,
      course: course
    });
    
  } catch (error) {
    console.error('Error creating enrollment:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET method to check current enrollment status
export async function GET(request: NextRequest) {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  
  if (!auth.data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseServerAdminClient();
  
  // Get all courses and user's enrollments
  const [coursesResult, enrollmentsResult] = await Promise.all([
    adminClient.from('courses').select('id, title, billing_product_id, price'),
    adminClient.from('course_enrollments')
      .select('course_id, enrolled_at')
      .eq('user_id', auth.data.id)
  ]);
  
  return NextResponse.json({
    user: {
      id: auth.data.id,
      email: auth.data.email
    },
    courses: coursesResult.data || [],
    enrollments: enrollmentsResult.data || [],
    enrolledCourseIds: (enrollmentsResult.data || []).map(e => e.course_id)
  });
}