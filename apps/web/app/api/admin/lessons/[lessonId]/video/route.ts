import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const client = getSupabaseServerClient();

    const { data: metadata, error } = await client
      .from('video_metadata')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('language_code', 'en')
      .maybeSingle();

    if (error) {
      console.error('Error fetching video metadata:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ metadata });
  } catch (error) {
    console.error('Error in video metadata API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}