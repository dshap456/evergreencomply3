import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    
    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated', details: userError }, { status: 401 });
    }

    // Fetch quiz questions for the lesson
    const { data: questions, error: questionsError } = await client
      .from('quiz_questions')
      .select(`
        id,
        question,
        question_type,
        options,
        correct_answer,
        points,
        order_index
      `)
      .eq('lesson_id', lessonId)
      .order('order_index');

    if (questionsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch quiz questions',
        details: questionsError
      }, { status: 500 });
    }

    // Transform the data to match the QuizQuestion interface
    const formattedQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      question_type: q.question_type,
      options: Array.isArray(q.options) ? q.options : [],
      correct_answer: q.correct_answer,
      points: q.points,
      order_index: q.order_index
    }));

    return NextResponse.json({ 
      success: true,
      questions: formattedQuestions
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}