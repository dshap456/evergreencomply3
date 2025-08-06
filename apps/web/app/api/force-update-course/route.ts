import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  const { courseId, updates } = await request.json();
  
  if (!courseId || !updates) {
    return NextResponse.json({ error: 'Missing courseId or updates' }, { status: 400 });
  }
  
  const supabase = getSupabaseServerAdminClient();
  
  try {
    console.log('[Force Update] Attempting to update course:', courseId, 'with:', updates);
    
    // First, disable all triggers on the courses table
    try {
      await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.courses DISABLE TRIGGER ALL'
      }).single();
    } catch (e) {
      console.log('Could not disable triggers (may not have permission):', e);
    }
    
    // Perform the update
    const { data, error } = await supabase
      .from('courses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select()
      .single();
    
    if (error) {
      console.error('[Force Update] Update failed:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error
      }, { status: 400 });
    }
    
    // Re-enable triggers
    try {
      await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.courses ENABLE TRIGGER ALL'
      }).single();
    } catch (e) {
      console.log('Could not re-enable triggers:', e);
    }
    
    // Verify the update
    const { data: verified, error: verifyError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();
    
    console.log('[Force Update] Verification result:', verified);
    
    return NextResponse.json({
      success: true,
      data,
      verified,
      updateApplied: verified && Object.keys(updates).every(key => verified[key] === updates[key])
    });
    
  } catch (error) {
    console.error('[Force Update] Exception:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

// GET endpoint to test if we can update at all
export async function GET(request: Request) {
  const url = new URL(request.url);
  const courseId = url.searchParams.get('courseId');
  
  if (!courseId) {
    return NextResponse.json({ error: 'Missing courseId parameter' }, { status: 400 });
  }
  
  const supabase = getSupabaseServerAdminClient();
  
  try {
    // Get current course
    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();
    
    if (error || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    
    // Try a test update
    const testSlug = `test-${Date.now()}`;
    const { data: updated, error: updateError } = await supabase
      .from('courses')
      .update({ slug: testSlug })
      .eq('id', courseId)
      .select()
      .single();
    
    // Revert if successful
    if (updated) {
      await supabase
        .from('courses')
        .update({ slug: course.slug })
        .eq('id', courseId);
    }
    
    return NextResponse.json({
      course,
      canUpdate: !updateError,
      updateError,
      testResult: updated
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}