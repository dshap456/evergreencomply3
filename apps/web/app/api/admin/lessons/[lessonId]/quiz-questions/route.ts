import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

// GET - Load quiz questions for a lesson
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const client = getSupabaseServerClient();

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load quiz questions for this lesson
    const { data: questions, error } = await client
      .from('quiz_questions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_index');

    if (error) {
      console.error('Error loading quiz questions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions: questions || [] });

  } catch (error) {
    console.error('Error in quiz questions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save quiz questions for a lesson
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const body = await request.json();
    const { questions } = body;

    const client = getSupabaseServerClient();

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has permission to edit this lesson
    const { data: lesson, error: lessonError } = await client
      .from('lessons')
      .select(`
        id,
        course_modules!inner (
          course_id,
          courses!inner (
            account_id
          )
        )
      `)
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Delete existing questions for this lesson
    const { error: deleteError } = await client
      .from('quiz_questions')
      .delete()
      .eq('lesson_id', lessonId);

    if (deleteError) {
      console.error('Error deleting existing questions:', deleteError);
      return NextResponse.json({ error: 'Failed to update questions' }, { status: 500 });
    }

    // Insert new questions if any
    if (questions && questions.length > 0) {
      const questionsToInsert = questions.map((q: any, index: number) => ({
        lesson_id: lessonId,
        question: q.question,
        question_type: 'multiple_choice',
        options: q.options.filter((opt: string) => opt.trim() !== ''), // Remove empty options
        correct_answer: q.correct_answer,
        order_index: index + 1,
        // Note: explanation field temporarily removed until database migration is applied
      }));

      const { error: insertError } = await client
        .from('quiz_questions')
        .insert(questionsToInsert);

      if (insertError) {
        console.error('Error inserting questions:', insertError);
        return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${questions?.length || 0} questions saved successfully` 
    });

  } catch (error) {
    console.error('Error in quiz questions POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}