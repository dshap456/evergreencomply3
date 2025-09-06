import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const courseId = searchParams.get('courseId');
  
  const client = getSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' });
  }
  
  // Get enrollment with current lesson
  const { data: enrollment } = await client
    .from('course_enrollments')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single();
  
  // Get all lesson progress
  const { data: progress } = await client
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(10);
  
  return NextResponse.json({
    enrollment,
    progress,
    debug: {
      user_id: user.id,
      course_id: courseId,
      current_lesson_in_db: enrollment?.current_lesson_id,
      current_language_in_db: enrollment?.current_lesson_language
    }
  });
}

export async function POST(request: NextRequest) {
  const { lessonId, courseId } = await request.json();
  
  const client = getSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' });
  }
  
  // FORCE update the enrollment
  const { data, error } = await client
    .from('course_enrollments')
    .update({ 
      current_lesson_id: lessonId,
      current_lesson_language: 'en'
    })
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .select();
  
  return NextResponse.json({ 
    success: !error, 
    data, 
    error,
    message: `FORCED lesson to ${lessonId}`
  });
}