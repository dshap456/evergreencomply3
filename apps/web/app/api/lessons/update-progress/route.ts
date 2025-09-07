import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lessonId, courseId } = body;

    if (!lessonId || !courseId) {
      return NextResponse.json({ success: false, error: 'Lesson ID and Course ID required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is enrolled in the course
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ success: false, error: 'User not enrolled in this course' }, { status: 403 });
    }

    // Update current lesson in enrollment
    console.log('[API] Updating enrollment current lesson:', { enrollmentId: enrollment.id, lessonId });
    const { data: updateData, error: updateEnrollmentError } = await client
      .from('course_enrollments')
      .update({ 
        current_lesson_id: lessonId
      })
      .eq('id', enrollment.id)
      .select();
    
    if (updateEnrollmentError) {
      console.error('Error updating enrollment current lesson:', updateEnrollmentError);
      // Don't fail the request if enrollment update fails
    } else {
      console.log('[API] Successfully updated enrollment:', updateData);
    }

    // First check if a record exists
    const { data: existingProgress } = await client
      .from('lesson_progress')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .single();

    const now = new Date().toISOString();
    
    if (existingProgress) {
      // Update existing record WITHOUT changing status if already completed
      const updateData: any = {
        updated_at: now
      };
      
      // Only set to in_progress if not already completed
      if (existingProgress.status !== 'completed') {
        updateData.status = 'in_progress';
      }
      
      const { error: updateError } = await client
        .from('lesson_progress')
        .update(updateData)
        .eq('id', existingProgress.id);
      
      if (updateError) {
        console.error('Error updating lesson progress:', updateError);
        return NextResponse.json({ success: false, error: 'Failed to update progress' }, { status: 500 });
      }
    } else {
      // Insert new record
      const insertData: any = {
        user_id: user.id,
        lesson_id: lessonId,
        updated_at: now,
        created_at: now,
        status: 'in_progress'
      };
      
      const { error: insertError } = await client
        .from('lesson_progress')
        .insert(insertData);
      
      if (insertError) {
        console.error('Error inserting lesson progress:', insertError);
        return NextResponse.json({ success: false, error: 'Failed to insert progress' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in update-progress route:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}