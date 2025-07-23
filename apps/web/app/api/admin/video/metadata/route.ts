import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseServerClient();
    const body = await request.json();

    const { data: metadata, error } = await client.rpc('create_video_metadata', {
      p_lesson_id: body.lesson_id,
      p_language_code: body.language_code || 'en',
      p_storage_path: body.storage_path,
      p_original_filename: body.original_filename,
      p_file_size: body.file_size,
      p_duration: body.duration || null,
      p_quality: body.quality || '720p'
    });

    if (error) {
      console.error('Error creating video metadata:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, metadata });
  } catch (error) {
    console.error('Error in video metadata API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}