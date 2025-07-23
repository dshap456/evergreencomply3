import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();

    // Check if quiz_questions table exists and get its structure
    const { data: tableInfo, error: tableError } = await client
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'quiz_questions')
      .eq('table_schema', 'public');

    if (tableError) {
      return NextResponse.json({ error: 'Failed to get table info', details: tableError }, { status: 500 });
    }

    // Try to insert a test row
    const testQuestion = {
      lesson_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      question: 'Test question',
      question_type: 'multiple_choice',
      options: ['A', 'B', 'C'],
      correct_answer: 'A',
      explanation: 'Test explanation',
      order_index: 1,
    };

    const { error: insertError } = await client
      .from('quiz_questions')
      .insert([testQuestion]);

    // Clean up - delete the test row (it will fail due to foreign key, but that's expected)
    await client
      .from('quiz_questions')
      .delete()
      .eq('lesson_id', '00000000-0000-0000-0000-000000000000');

    return NextResponse.json({
      tableExists: tableInfo && tableInfo.length > 0,
      columns: tableInfo,
      insertError: insertError ? insertError.message : null,
      testResult: insertError ? 'Insert failed as expected' : 'Insert succeeded'
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}