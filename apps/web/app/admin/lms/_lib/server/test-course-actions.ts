'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

// Test 1: Completely raw server action without ANY wrapper
export async function testRawUpdateCourse(courseId: string, slug: string, status: string) {
  console.log('🔴 TEST RAW UPDATE - Input:', { courseId, slug, status });
  
  try {
    const client = getSupabaseServerClient();
    
    const { data, error } = await client
      .from('courses')
      .update({
        slug: slug,
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select()
      .single();
      
    console.log('🔴 TEST RAW UPDATE - Result:', { data, error });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err) {
    console.log('🔴 TEST RAW UPDATE - Catch error:', err);
    return { success: false, error: String(err) };
  }
}

// Test 2: Direct SQL query
export async function testDirectSQL(courseId: string) {
  console.log('🟡 TEST DIRECT SQL - Input:', { courseId });
  
  try {
    const client = getSupabaseServerClient();
    
    // First, check if course exists
    const { data: checkData, error: checkError } = await client
      .from('courses')
      .select('id, title, slug, status')
      .eq('id', courseId)
      .single();
      
    console.log('🟡 TEST DIRECT SQL - Course exists:', { checkData, checkError });
    
    return { success: true, course: checkData };
  } catch (err) {
    console.log('🟡 TEST DIRECT SQL - Catch error:', err);
    return { success: false, error: String(err) };
  }
}