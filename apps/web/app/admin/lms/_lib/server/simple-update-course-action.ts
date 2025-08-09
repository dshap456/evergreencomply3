'use server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { CourseTransformer } from '../transformers/data-transformers';

export async function simpleUpdateCourseAction(data: any) {
  console.log('🔵 SimpleUpdateCourseAction: Called with data:', data);
  
  try {
    const client = getSupabaseServerAdminClient();
    
    // Update the course
    const { data: updateResult, error } = await client
      .from('courses')
      .update({
        title: data.title,
        description: data.description,
        status: data.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id)
      .select()
      .single();
      
    console.log('🔵 SimpleUpdateCourseAction: Update result:', { updateResult, error });
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    const transformedCourse = CourseTransformer.toUI(updateResult);
    console.log('🔵 SimpleUpdateCourseAction: Transformed course:', transformedCourse);
    
    return { 
      success: true, 
      updatedCourse: transformedCourse 
    };
  } catch (error) {
    console.error('🔴 SimpleUpdateCourseAction: Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}