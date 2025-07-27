import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function POST(request: Request) {
  try {
    // Use admin client to bypass RLS
    const client = getSupabaseServerAdminClient();
    
    // Update all pending videos to ready status
    const { data: updatedVideos, error: updateError } = await client
      .from('video_metadata')
      .update({ 
        processing_status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('processing_status', 'pending')
      .select();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update videos',
        details: updateError
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: `Updated ${updatedVideos?.length || 0} videos from pending to ready`,
      updatedVideos: updatedVideos?.map(v => ({
        id: v.id,
        lesson_id: v.lesson_id,
        language_code: v.language_code,
        storage_path: v.storage_path
      }))
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}