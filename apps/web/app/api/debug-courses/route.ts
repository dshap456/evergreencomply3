import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET() {
  const supabase = getSupabaseServerClient();
  
  // Fetch all courses
  const { data: allCourses, error: allError } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch published courses
  const { data: publishedCourses, error: pubError } = await supabase
    .from('courses')
    .select('*')
    .eq('status', 'published');

  return NextResponse.json({
    allCourses: allCourses || [],
    allCoursesError: allError?.message || null,
    publishedCourses: publishedCourses || [],
    publishedCoursesError: pubError?.message || null,
    courseCount: allCourses?.length || 0,
    publishedCount: publishedCourses?.length || 0,
    slugInfo: {
      allSlugs: allCourses?.map(c => ({ 
        id: c.id, 
        title: c.title, 
        slug: c.slug, 
        status: c.status,
        sku: c.sku 
      })) || [],
      nullSlugs: allCourses?.filter(c => !c.slug).map(c => ({ 
        id: c.id, 
        title: c.title,
        status: c.status 
      })) || []
    }
  });
}