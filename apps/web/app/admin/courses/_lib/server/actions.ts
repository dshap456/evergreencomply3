'use server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { revalidatePath } from 'next/cache';

export async function updateCourseAction(courseId: string, updates: any) {
  const supabase = getSupabaseServerAdminClient();
  
  console.log('[Server Action] Updating course:', courseId, 'with:', updates);
  
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', courseId)
    .select()
    .single();
    
  if (error) {
    console.error('[Server Action] Update error:', error);
    return { success: false, error: error.message };
  }
  
  console.log('[Server Action] Update successful:', data);
  
  // Revalidate the admin courses page
  revalidatePath('/admin/courses');
  
  return { success: true, data };
}