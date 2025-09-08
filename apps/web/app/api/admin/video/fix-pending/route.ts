import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    // Enforce super admin guard before using admin client
    const authClient = getSupabaseServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: isSuperAdmin, error: guardError } = await authClient.rpc('is_super_admin');
    if (guardError) {
      return NextResponse.json({ error: 'Failed to verify privileges' }, { status: 500 });
    }
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = getSupabaseServerAdminClient();

    // Update all pending videos to ready status
    const { data: updatedVideos, error } = await client
      .from('video_metadata')
      .update({ 
        processing_status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('processing_status', 'pending')
      .select();

    if (error) {
      console.error('Error updating pending videos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      updated_count: updatedVideos?.length || 0,
      videos: updatedVideos 
    });
  } catch (error) {
    console.error('Error in fix pending videos API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
