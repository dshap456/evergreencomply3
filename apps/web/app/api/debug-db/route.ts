import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET() {
  try {
    const client = getSupabaseServerClient();
    
    // Test 1: Raw query to see what columns exist
    const { data: rawCourses, error: rawError } = await client
      .from('courses')
      .select('*')
      .limit(1);
    
    // Test 2: Check auth
    const { data: { user } } = await client.auth.getUser();
    
    // Test 3: Check if is_published exists
    const { data: publishedCheck, error: publishedError } = await client
      .from('courses')
      .select('id, title, is_published')
      .limit(1);
    
    // Test 4: Check RLS
    const { data: rlsCheck, error: rlsError } = await client
      .rpc('is_super_admin');
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: user ? { id: user.id, email: user.email } : 'Not authenticated',
      is_super_admin: rlsCheck,
      
      raw_courses: {
        data: rawCourses,
        error: rawError?.message,
        columns: rawCourses?.[0] ? Object.keys(rawCourses[0]) : []
      },
      
      published_check: {
        data: publishedCheck,
        error: publishedError?.message
      },
      
      sample_course: rawCourses?.[0] || null
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 });
  }
}