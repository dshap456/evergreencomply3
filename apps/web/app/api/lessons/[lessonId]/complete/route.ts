import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const client = getSupabaseServerClient();
    const body = await request.json();

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract quiz score and language if provided
    const { time_spent, quiz_score, is_quiz, language: requestedLanguage = 'en' } = body;
    
    // Get the actual lesson to find its language
    const { data: lessonData, error: lessonError } = await client
      .from('lessons')
      .select('id, language, title')
      .eq('id', lessonId)
      .single();
    
    if (lessonError || !lessonData) {
      console.error('[COMPLETE] Failed to get lesson:', lessonError);
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    
    // Use the LESSON's language, not the requested language!
    const language = lessonData.language || requestedLanguage;
    
    console.log('[COMPLETE] Language resolution:', {
      requestedLanguage,
      lessonLanguage: lessonData.language,
      usingLanguage: language
    });

    // CRITICAL DEBUG: Log exactly what we're saving
    console.log('[COMPLETE] ============ SAVING COMPLETION ============');
    console.log('[COMPLETE] Lesson ID:', lessonId);
    console.log('[COMPLETE] User ID:', user.id);
    console.log('[COMPLETE] Language:', language);
    console.log('[COMPLETE] Body received:', body);
    
    // First check what's already in the database
    const { data: existingProgress } = await client
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId);
    
    console.log('[COMPLETE] Existing progress records for this lesson:', existingProgress);
    
    // Update or create lesson progress WITH last_accessed timestamp
    const now = new Date().toISOString();
    const { data: progress, error: progressError } = await client
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        status: 'completed',
        completed_at: now,
        time_spent: time_spent || 0,
        updated_at: now,
        last_accessed: now,  // CRITICAL: Set last_accessed so we can restore to this lesson
        language: language
      }, {
        onConflict: 'user_id,lesson_id,language'
      })
      .select()
      .single();

    if (progressError) {
      console.error('[COMPLETE] Error updating lesson progress:', progressError);
      return NextResponse.json({ error: progressError.message }, { status: 500 });
    }
    
    console.log('[COMPLETE] Progress saved successfully!');
    console.log('[COMPLETE] Saved record:', progress);
    console.log('[COMPLETE] =========================================');

    // Debug: Check progress before update
    const { data: beforeProgress } = await client
      .from('course_enrollments')
      .select('progress_percentage')
      .eq('user_id', user.id)
      .eq('course_id', (
        await client
          .from('lessons')
          .select('course_modules!inner(course_id)')
          .eq('id', lessonId)
          .single()
      ).data?.course_modules?.course_id)
      .single();

    console.log('🔍 Debug - Progress BEFORE update:', {
      lessonId,
      userId: user.id,
      beforeProgress: beforeProgress?.progress_percentage
    });

    // Update course enrollment to remember current lesson
    const { data: courseInfo } = await client
      .from('lessons')
      .select('course_modules!inner(course_id)')
      .eq('id', lessonId)
      .single();
    
    if (courseInfo?.course_modules?.course_id) {
      await client
        .from('course_enrollments')
        .update({ 
          current_lesson_id: lessonId,
          current_lesson_language: language
        })
        .eq('user_id', user.id)
        .eq('course_id', courseInfo.course_modules.course_id);
    }
    
    // Update course enrollment progress WITH LANGUAGE PARAMETER
    console.log('[COMPLETE] Calling update_course_progress RPC with:', {
      p_user_id: user.id,
      p_lesson_id: lessonId,
      p_language: language
    });
    
    const { data: rpcData, error: enrollmentError } = await client.rpc('update_course_progress', {
      p_user_id: user.id,
      p_lesson_id: lessonId,
      p_language: language  // Pass the language to calculate progress correctly
    });

    if (enrollmentError) {
      console.error('[COMPLETE] ❌ RPC FAILED:', enrollmentError);
      console.error('[COMPLETE] RPC error details:', JSON.stringify(enrollmentError, null, 2));
      // Don't fail the request if this fails, as the lesson is still marked complete
    } else {
      console.log('[COMPLETE] ✅ RPC succeeded, returned:', rpcData);
    }

    // Get lesson details to check if it's a quiz and get course ID
    const lessonDetails = await client
      .from('lessons')
      .select('course_modules!inner(course_id), is_final_quiz, content_type')
      .eq('id', lessonId)
      .single();

    const courseId = lessonDetails.data?.course_modules?.course_id;
    const isQuizLesson = lessonDetails.data?.content_type === 'quiz';
    const isFinalQuiz = lessonDetails.data?.is_final_quiz || false;

    // If this is a quiz lesson and we have a score, save it
    if (isQuizLesson && quiz_score !== undefined) {
      console.log('💯 Saving quiz score:', { 
        lessonId, 
        userId: user.id, 
        score: quiz_score,
        isFinalQuiz 
      });

      // Save quiz attempt
      const { error: quizError } = await client
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          score: quiz_score,
          total_points: 100, // Assuming 100 point scale
          passed: quiz_score >= 80,
          answers: {}, // Empty for now
          attempt_number: 1, // Can be enhanced to track multiple attempts
          language: language
        });

      if (quizError) {
        console.error('❌ Error saving quiz attempt:', quizError);
      }

      // If it's a final quiz, update the enrollment with the final score
      if (isFinalQuiz && courseId) {
        console.log('🎯 Updating final quiz score in enrollment');
        
        const { error: enrollmentError } = await client
          .from('course_enrollments')
          .update({ 
            final_score: quiz_score
          })
          .eq('user_id', user.id)
          .eq('course_id', courseId);

        if (enrollmentError) {
          console.error('❌ Error updating enrollment final score:', enrollmentError);
        }

        // Check if course is complete for current language
        const { data: allProgress } = await client
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .eq('language', language);

        const { data: allLessons } = await client
          .from('lessons')
          .select('id, module_id')
          .eq('language', language)
          .in('module_id', (
            await client
              .from('course_modules')
              .select('id')
              .eq('course_id', courseId)
              .eq('language', language)
          ).data?.map(m => m.id) || []);

        const allLessonsCompleted = allLessons?.length === allProgress?.length;

        if (allLessonsCompleted && quiz_score >= 80) {
          console.log('🎉 Course completed with passing final quiz score');
          
          // Trigger course completion and update completed_language
          const { error: completionError } = await client
            .from('course_enrollments')
            .update({
              completed_at: new Date().toISOString(),
              completed_language: language
            })
            .eq('user_id', user.id)
            .eq('course_id', courseId);

          if (completionError) {
            console.error('❌ Error completing course:', completionError);
          }

          // Create course_completions entry for reporting
          const { data: userAccount } = await client
            .from('accounts')
            .select('name, email')
            .eq('primary_owner_user_id', user.id)
            .single();

          const { data: courseData } = await client
            .from('courses')
            .select('title')
            .eq('id', courseId)
            .single();

          const { data: enrollmentData } = await client
            .from('course_enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .single();

          if (userAccount && courseData && enrollmentData) {
            const { error: completionRecordError } = await client
              .from('course_completions')
              .insert({
                user_id: user.id,
                course_id: courseId,
                enrollment_id: enrollmentData.id,
                student_name: userAccount.name || userAccount.email,
                student_email: userAccount.email,
                course_name: courseData.title,
                final_quiz_score: quiz_score,
                final_quiz_passed: true,
                completion_percentage: 100,
                completed_at: new Date().toISOString()
              });

            if (completionRecordError) {
              console.error('❌ Error creating course completion record:', completionRecordError);
            } else {
              console.log('✅ Course completion record created successfully');
            }
          }
        }
      }
    }

    const { data: courseProgress, error: courseProgressError } = await client
      .from('course_enrollments')
      .select('progress_percentage, completed_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    console.log('🔍 Debug - Progress AFTER update:', {
      lessonId,
      userId: user.id,
      courseId,
      afterProgress: courseProgress?.progress_percentage,
      completed_at: courseProgress?.completed_at,
      changed: beforeProgress?.progress_percentage !== courseProgress?.progress_percentage
    });

    // Revalidate relevant pages to show updated progress
    if (courseId) {
      console.log('🔄 Revalidating paths:', [`/home/courses/${courseId}`, '/home/courses']);
      revalidatePath(`/home/courses/${courseId}`);
      revalidatePath('/home/courses');
    }

    return NextResponse.json({ 
      success: true, 
      progress,
      courseProgress: courseProgress || null,
      message: 'Lesson completed successfully'
    });

  } catch (error) {
    console.error('Error in lesson completion API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}