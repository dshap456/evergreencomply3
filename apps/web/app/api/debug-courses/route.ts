import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const useAdmin = searchParams.get('admin') === 'true';
    
    const client = useAdmin ? getSupabaseServerAdminClient() : getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    // Test 1: Check if courses table is accessible
    const { data: coursesTest, error: coursesError } = await client
      .from('courses')
      .select('id, title, status')
      .limit(5);
    
    // Test 2: Check column structure
    let columnInfo = null;
    try {
      const { data: columns } = await client.rpc('get_table_columns', {
        table_name: 'courses',
        schema_name: 'public'
      });
      columnInfo = columns;
    } catch (e) {
      // RPC might not exist, try direct query
      const { data: cols } = await client
        .from('information_schema.columns' as any)
        .select('column_name, data_type')
        .eq('table_name', 'courses')
        .eq('table_schema', 'public');
      columnInfo = cols;
    }
    
    // Test 3: Check RLS policies
    let rlsInfo = null;
    if (useAdmin) {
      const { data: policies } = await client
        .from('pg_policies' as any)
        .select('*')
        .eq('tablename', 'courses');
      rlsInfo = policies;
    }
    
    // Test 4: Raw SQL query to check data
    let rawQueryResult = null;
    if (useAdmin) {
      try {
        const { data, error } = await client.rpc('execute_sql', {
          query: "SELECT id, title, status, created_at FROM courses LIMIT 5"
        });
        rawQueryResult = { data, error };
      } catch (e) {
        // If RPC doesn't exist, that's ok
        rawQueryResult = { error: 'RPC not available' };
      }
    }
    
    // Test 5: Check if enum exists
    let enumInfo = null;
    try {
      const { data: enums } = await client
        .from('pg_type' as any)
        .select('typname')
        .eq('typname', 'course_status');
      enumInfo = enums;
    } catch (e) {
      enumInfo = { error: 'Could not check enum' };
    }
    
    return NextResponse.json({
      user: user ? { id: user.id, email: user.email } : null,
      userError,
      tests: {
        coursesAccess: {
          success: !coursesError,
          data: coursesTest,
          error: coursesError
        },
        columnInfo,
        rlsInfo,
        rawQueryResult,
        enumInfo
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}