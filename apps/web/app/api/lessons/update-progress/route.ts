import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lessonId, courseId, language: requestedLanguage = 'en', updateLastAccessed = false } = body;

    if (!lessonId || !courseId) {
      return NextResponse.json({ success: false, error: 'Lesson ID and Course ID required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the actual lesson to find its language
    const { data: lessonData } = await client
      .from('lessons')
      .select('language')
      .eq('id', lessonId)
      .single();
    
    // Use the LESSON's language, not the requested language!
    const language = lessonData?.language || requestedLanguage;
    
    console.log('[UPDATE-PROGRESS] Language:', {
      requestedLanguage,
      lessonLanguage: lessonData?.language,
      usingLanguage: language
    });

    // Try to get enrollment (but don't fail if not found - RLS will protect the actual data)
    const { data: enrollment, error: enrollmentError } = await client
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    // Only log if there's no enrollment, don't block the progress update
    if (enrollmentError || !enrollment) {
      console.log('[API] No enrollment found, skipping enrollment update but continuing with progress update', {
        error: enrollmentError,
        userId: user.id,
        courseId,
        enrollmentFound: !!enrollment
      });
    }

    // Update current lesson in enrollment if requested and enrollment exists
    if (updateLastAccessed && enrollment) {
      console.log('[API] Updating enrollment current lesson:', { 
        enrollmentId: enrollment.id, 
        lessonId, 
        language,
        note: 'Saving exact lesson ID with its language'
      });
      
      const { data: updateData, error: updateEnrollmentError } = await client
        .from('course_enrollments')
        .update({ 
          current_lesson_id: lessonId,
          current_lesson_language: language
        })
        .eq('id', enrollment.id)
        .select();
      
      if (updateEnrollmentError) {
        console.error('Error updating enrollment current lesson:', updateEnrollmentError);
        // Don't fail the whole request if enrollment update fails
        console.log('Continuing despite enrollment update error');
      } else {
        console.log('[API] Successfully updated enrollment with lesson position');
      }
    }

    // First check if a record exists
    const { data: existingProgress } = await client
      .from('lesson_progress')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .eq('language', language)
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
      
      if (updateLastAccessed) {
        updateData.last_accessed = now;
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
        language,
        updated_at: now,
        created_at: now,
        status: 'in_progress'
      };
      
      if (updateLastAccessed) {
        insertData.last_accessed = now;
      }
      
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