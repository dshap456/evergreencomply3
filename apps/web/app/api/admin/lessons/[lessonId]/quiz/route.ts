import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const client = getSupabaseServerClient();

    const { data: questions, error } = await client
      .from('quiz_questions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_index');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const client = getSupabaseServerClient();
    const body = await request.json();

    const { data: question, error } = await client
      .from('quiz_questions')
      .insert({
        lesson_id: lessonId,
        question: body.question,
        question_type: body.question_type || 'multiple_choice',
        options: body.options,
        correct_answer: body.correct_answer,
        points: body.points || 1,
        order_index: body.order_index || 0
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    console.error('Error creating quiz question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}