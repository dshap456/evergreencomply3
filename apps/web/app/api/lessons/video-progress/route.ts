import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lessonId = searchParams.get('lessonId');
    const language = searchParams.get('language') || 'en';

    if (!lessonId) {
      return NextResponse.json({ success: false, error: 'Lesson ID required' }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: progress, error } = await client
      .from('video_progress')
      .select('current_time, duration')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching video progress:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch video progress' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      current_time: progress?.current_time || 0,
      duration: progress?.duration || 0
    });

  } catch (error) {
    console.error('Error in video-progress GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lessonId, currentTime, duration, deviceInfo } = body;

    if (!lessonId || currentTime === undefined || duration === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const client = getSupabaseServerClient();
    
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await client.rpc('update_video_progress', {
      p_user_id: user.id,
      p_lesson_id: lessonId,
      p_current_time: currentTime,
      p_duration: duration,
      p_device_info: deviceInfo || {}
    });

    if (error) {
      console.error('Error updating video progress:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update video progress' 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error in video-progress POST:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}