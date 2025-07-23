import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const client = getSupabaseServerClient();

    // First check if there's video metadata for this lesson
    const { data: metadata, error: metadataError } = await client
      .from('video_metadata')
      .select('storage_path, processing_status')
      .eq('lesson_id', lessonId)
      .eq('language_code', 'en')
      .maybeSingle();

    if (metadataError) {
      console.error('Error fetching video metadata:', metadataError);
      return NextResponse.json({ error: metadataError.message }, { status: 500 });
    }

    if (!metadata) {
      return NextResponse.json({ video_url: null, has_video: false });
    }

    // If video is not ready, return status but no URL
    if (metadata.processing_status !== 'ready') {
      return NextResponse.json({ 
        video_url: null, 
        has_video: true,
        status: metadata.processing_status 
      });
    }

    // Generate signed URL for the video
    const { data: signedUrlData, error: urlError } = await client.storage
      .from('course-videos')
      .createSignedUrl(metadata.storage_path, 3600); // 1 hour expiry

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      return NextResponse.json({ error: urlError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      video_url: signedUrlData.signedUrl,
      has_video: true,
      status: 'ready'
    });

  } catch (error) {
    console.error('Error in secure video URL API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}