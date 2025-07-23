import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  try {
    console.log('🔍 Admin debug route called');
    
    const client = getSupabaseServerAdminClient();
    console.log('✅ Admin client created');

    // Test basic query
    const { data: courses, error: coursesError } = await client
      .from('courses')
      .select('id, title, is_published')
      .limit(5);

    if (coursesError) {
      console.error('❌ Courses query error:', coursesError);
      return NextResponse.json({ 
        error: 'Courses query failed',
        details: coursesError
      }, { status: 500 });
    }

    console.log('✅ Courses query successful, found:', courses?.length);

    // Test specific course if any exist
    let testCourse = null;
    if (courses && courses.length > 0) {
      const { data: courseDetail, error: detailError } = await client
        .from('courses')
        .select('*')
        .eq('id', courses[0].id)
        .single();

      if (detailError) {
        console.error('❌ Course detail error:', detailError);
      } else {
        testCourse = courseDetail;
        console.log('✅ Course detail successful');
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      coursesCount: courses?.length || 0,
      courses: courses || [],
      testCourse: testCourse,
      message: 'Admin API is working correctly'
    });

  } catch (error) {
    console.error('❌ Admin debug error:', error);
    return NextResponse.json({ 
      error: 'Admin debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}