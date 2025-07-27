import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    
    const client = getSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Query video metadata
    let query = client
      .from('video_metadata')
      .select('*')
      .order('created_at', { ascending: false });

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    const { data: videoMetadata, error: metadataError } = await query;

    if (metadataError) {
      return NextResponse.json({ 
        error: 'Failed to fetch video metadata',
        details: metadataError
      }, { status: 500 });
    }

    // Also check lessons table to see video_url values
    const { data: lessons, error: lessonsError } = await client
      .from('lessons')
      .select('id, title, video_url, content_type, language')
      .eq('content_type', 'video')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (lessonsError) {
      return NextResponse.json({ 
        error: 'Failed to fetch lessons',
        details: lessonsError
      }, { status: 500 });
    }

    // Check storage bucket for recent uploads
    const { data: storageFiles, error: storageError } = await client.storage
      .from('course-videos')
      .list('', {
        limit: 10,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    return NextResponse.json({ 
      success: true,
      videoMetadata: {
        count: videoMetadata?.length || 0,
        records: videoMetadata
      },
      lessons: {
        count: lessons?.length || 0,
        records: lessons
      },
      storage: {
        error: storageError,
        files: storageFiles
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}