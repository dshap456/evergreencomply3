import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const supabase = getSupabaseServerAdminClient();
  
  try {
    // Get all courses
    const { data: courses, error: fetchError } = await supabase
      .from('courses')
      .select('id, title, slug, status')
      .order('title');
      
    if (fetchError) {
      return NextResponse.json({ error: fetchError }, { status: 500 });
    }
    
    // Fix specific slugs
    const updates = [
      {
        id: '5e6ae121-8f89-4786-95a6-1e823c21a22e',
        title: 'DOT HAZMAT - Advanced Awareness',
        newSlug: 'advanced-hazmat',
        currentSlug: 'dot-hazmat---advanced-awareness'
      }
    ];
    
    const results = [];
    
    for (const update of updates) {
      const course = courses?.find(c => c.id === update.id);
      if (course) {
        const { data, error } = await supabase
          .from('courses')
          .update({ slug: update.newSlug })
          .eq('id', update.id)
          .select();
          
        results.push({
          course: course.title,
          oldSlug: course.slug,
          newSlug: update.newSlug,
          success: !error,
          data,
          error
        });
      }
    }
    
    // Also update EPA RCRA to published
    const { data: epaCourse, error: epaError } = await supabase
      .from('courses')
      .update({ status: 'published' })
      .eq('slug', 'epa-rcra')
      .select();
      
    // Get final state
    const { data: finalCourses } = await supabase
      .from('courses')
      .select('id, title, slug, status')
      .in('slug', ['dot-hazmat', 'dot-hazmat-general', 'advanced-hazmat', 'epa-rcra'])
      .order('title');
    
    return NextResponse.json({
      updates: results,
      epaPublishResult: { data: epaCourse, error: epaError },
      relevantCoursesAfterUpdate: finalCourses,
      message: 'Course slugs updated with admin privileges'
    });
    
  } catch (error) {
    console.error('Fix slugs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}