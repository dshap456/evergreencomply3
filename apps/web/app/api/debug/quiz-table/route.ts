import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();

    // Check if we can access the quiz_questions table
    const { data: existingRows, error: selectError } = await client
      .from('quiz_questions')
      .select('*')
      .limit(5);

    if (selectError) {
      return NextResponse.json({ 
        error: 'Cannot access quiz_questions table', 
        details: selectError,
        step: 'select_check'
      }, { status: 500 });
    }

    // Try to insert a test row with all fields
    const testQuestion = {
      lesson_id: '123e4567-e89b-12d3-a456-426614174000', // dummy UUID
      question: 'Test question',
      question_type: 'multiple_choice',
      options: ['A', 'B', 'C'],
      correct_answer: 'A',
      explanation: 'Test explanation',
      order_index: 999,
    };

    const { data: insertData, error: insertError } = await client
      .from('quiz_questions')
      .insert([testQuestion])
      .select();

    // Try to clean up the test row
    if (insertData && insertData.length > 0) {
      await client
        .from('quiz_questions')
        .delete()
        .eq('id', insertData[0].id);
    }

    return NextResponse.json({
      tableAccessible: !selectError,
      existingRowsCount: existingRows?.length || 0,
      existingRows: existingRows,
      insertTest: {
        success: !insertError,
        error: insertError ? insertError.message : null,
        errorCode: insertError ? insertError.code : null,
        errorDetails: insertError ? insertError.details : null,
        insertedData: insertData
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}