import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseServerAdminClient();
    const body = await request.json();

    // Create video metadata with ready status since we're not doing background processing
    const { data: metadata, error } = await client
      .from('video_metadata')
      .insert({
        lesson_id: body.lesson_id,
        language_code: body.language_code || 'en',
        storage_path: body.storage_path,
        original_filename: body.original_filename,
        file_size: body.file_size,
        duration: body.duration || null,
        quality: body.quality || '720p',
        processing_status: 'ready', // Mark as ready immediately
        created_by: null
      })
      .select()
      .single();

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