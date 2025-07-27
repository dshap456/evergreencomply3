import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Create a direct Supabase client to bypass any type issues
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: Raw SQL query to see actual table structure
    const { data: tableStructure, error: structureError } = await supabase
      .rpc('get_table_structure', { table_name: 'courses' })
      .single();

    // Test 2: Direct query without types
    const { data: rawCourses, error: rawError } = await supabase
      .from('courses')
      .select('*')
      .limit(3);

    // Test 3: Check current user
    const { data: { user } } = await supabase.auth.getUser();

    // Test 4: Check if we can query with explicit columns
    const { data: explicitCourses, error: explicitError } = await supabase
      .from('courses')
      .select('id, title, is_published')
      .limit(3);

    // Test 5: Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'courses' });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl,
        hasAnonKey: !!supabaseKey,
        nodeEnv: process.env.NODE_ENV
      },
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role
      } : 'Not authenticated',
      tableStructure: {
        data: tableStructure,
        error: structureError?.message
      },
      rawCourses: {
        data: rawCourses,
        error: rawError?.message,
        count: rawCourses?.length || 0,
        sampleCourse: rawCourses?.[0],
        columns: rawCourses?.[0] ? Object.keys(rawCourses[0]) : []
      },
      explicitCourses: {
        data: explicitCourses,
        error: explicitError?.message
      },
      policies: {
        data: policies,
        error: policiesError?.message
      }
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
      name: error.name,
      code: error.code
    }, { status: 500 });
  }
}

// Add RPC function if it doesn't exist
export async function POST() {
  const rpcFunctions = `
-- Function to get table structure
CREATE OR REPLACE FUNCTION get_table_structure(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
    AND c.table_name = get_table_structure.table_name
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get policies
CREATE OR REPLACE FUNCTION get_policies_for_table(table_name text)
RETURNS TABLE (
  policyname text,
  cmd text,
  qual text,
  with_check text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pol.policyname::text,
    pol.cmd::text,
    pol.qual::text,
    pol.with_check::text
  FROM pg_policies pol
  WHERE pol.schemaname = 'public' 
    AND pol.tablename = get_policies_for_table.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

  return NextResponse.json({ 
    message: 'Copy and run these SQL functions in Supabase SQL editor',
    sql: rpcFunctions 
  });
}