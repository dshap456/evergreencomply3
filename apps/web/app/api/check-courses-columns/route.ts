import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: Get ANY course without specifying columns
    const { data: anyCourse, error: anyError } = await supabase
      .from('courses')
      .select('*')
      .limit(1)
      .single();

    // Test 2: Try to select status column
    const { data: statusTest, error: statusError } = await supabase
      .from('courses')
      .select('id, title, status')
      .limit(1);

    // Test 3: Try to select is_published column
    const { data: publishedTest, error: publishedError } = await supabase
      .from('courses')
      .select('id, title, is_published')
      .limit(1);

    // Test 4: Get count of courses
    const { count, error: countError } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      
      anyCourse: {
        data: anyCourse,
        error: anyError?.message,
        columns: anyCourse ? Object.keys(anyCourse) : 'No course found'
      },
      
      statusColumnTest: {
        data: statusTest,
        error: statusError?.message,
        exists: !statusError
      },
      
      isPublishedColumnTest: {
        data: publishedTest,
        error: publishedError?.message,
        exists: !publishedError
      },
      
      coursesCount: {
        count,
        error: countError?.message
      },
      
      conclusion: {
        hasStatusColumn: !statusError,
        hasIsPublishedColumn: !publishedError,
        actualColumns: anyCourse ? Object.keys(anyCourse) : []
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 });
  }
}