import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function loadCoursesByIds(courseIds: string[]) {
  if (!courseIds || courseIds.length === 0) {
    return [];
  }

  const client = getSupabaseServerClient();
  
  const { data, error } = await client
    .from('courses')
    .select('id, title, slug, price, description')
    .in('id', courseIds)
    .eq('status', 'published');

  if (error) {
    console.error('Error loading courses:', error);
    return [];
  }

  return data || [];
}