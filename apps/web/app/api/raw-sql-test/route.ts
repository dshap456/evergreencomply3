import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: Get table columns using information_schema
    const { data: columnsData, error: columnsError } = await supabase.rpc('get_courses_columns');

    // Test 2: Simple count
    const { data: countData, error: countError } = await supabase.rpc('count_courses');

    // Test 3: Get sample course
    const { data: sampleData, error: sampleError } = await supabase.rpc('get_sample_course');

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      columns: {
        data: columnsData,
        error: columnsError?.message
      },
      count: {
        data: countData,
        error: countError?.message
      },
      sample: {
        data: sampleData,
        error: sampleError?.message
      },
      sqlFunctions: `
-- Run these in Supabase SQL Editor first:

CREATE OR REPLACE FUNCTION get_courses_columns()
RETURNS TABLE(column_name text, data_type text) 
LANGUAGE sql
AS $$
  SELECT column_name::text, data_type::text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'courses'
  ORDER BY ordinal_position;
$$;

CREATE OR REPLACE FUNCTION count_courses()
RETURNS integer
LANGUAGE sql
AS $$
  SELECT COUNT(*)::integer FROM public.courses;
$$;

CREATE OR REPLACE FUNCTION get_sample_course()
RETURNS json
LANGUAGE sql
AS $$
  SELECT row_to_json(courses.*) FROM public.courses LIMIT 1;
$$;
      `
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack
    }, { status: 500 });
  }
}