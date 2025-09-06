import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Not authenticated', userError }, { status: 401 });
    }

    // Try to update the first enrollment
    console.log('User ID:', user.id);
    
    // First, get an enrollment
    const { data: enrollments, error: fetchError } = await client
      .from('course_enrollments')
      .select('id, course_id, current_lesson_id')
      .eq('user_id', user.id)
      .limit(1);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch enrollments', details: fetchError });
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ error: 'No enrollments found for user' });
    }

    const enrollment = enrollments[0];
    console.log('Found enrollment:', enrollment);

    // Get a lesson from this course
    const { data: lessons, error: lessonError } = await client
      .from('lessons')
      .select('id, title')
      .limit(1);

    if (lessonError || !lessons || lessons.length === 0) {
      return NextResponse.json({ error: 'No lessons found', lessonError });
    }

    const testLessonId = lessons[0].id;
    console.log('Test lesson ID:', testLessonId);

    // Now try to update the enrollment
    const { data: updateResult, error: updateError } = await client
      .from('course_enrollments')
      .update({ 
        current_lesson_id: testLessonId,
        current_lesson_language: 'en'
      })
      .eq('id', enrollment.id)
      .select();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update enrollment',
        details: updateError,
        enrollment_id: enrollment.id,
        lesson_id: testLessonId
      });
    }

    // Verify the update
    const { data: verifyData, error: verifyError } = await client
      .from('course_enrollments')
      .select('id, current_lesson_id, current_lesson_language')
      .eq('id', enrollment.id)
      .single();

    return NextResponse.json({
      success: true,
      enrollment_id: enrollment.id,
      lesson_id_used: testLessonId,
      update_result: updateResult,
      verified: verifyData,
      message: 'Check if current_lesson_id was updated'
    });

  } catch (error) {
    console.error('Error in test:', error);
    return NextResponse.json({ error: 'Internal error', details: error }, { status: 500 });
  }
}