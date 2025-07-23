import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const client = getSupabaseServerClient();

    // Get course modules and lessons
    const { data: modules, error: modulesError } = await client
      .from('course_modules')
      .select(`
        id,
        title,
        description,
        order_index,
        lessons (
          id,
          title,
          description,
          content_type,
          video_url,
          asset_url,
          content,
          order_index,
          is_final_quiz,
          passing_score
        )
      `)
      .eq('course_id', courseId)
      .order('order_index');

    if (modulesError) {
      return NextResponse.json({ error: modulesError.message }, { status: 500 });
    }

    return NextResponse.json({ modules });
  } catch (error) {
    console.error('Error fetching course lessons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const client = getSupabaseServerClient();
    const body = await request.json();

    if (body.type === 'module') {
      // Create new module
      const { data: module, error } = await client
        .from('course_modules')
        .insert({
          course_id: courseId,
          title: body.title,
          description: body.description,
          order_index: body.order_index || 0
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ module });
    } else if (body.type === 'lesson') {
      // Create new lesson
      const { data: lesson, error } = await client
        .from('lessons')
        .insert({
          module_id: body.module_id,
          title: body.title,
          description: body.description,
          content_type: body.content_type || 'video',
          video_url: body.video_url,
          asset_url: body.asset_url,
          content: body.content,
          order_index: body.order_index || 0,
          is_final_quiz: body.is_final_quiz || false,
          passing_score: body.passing_score || 80
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ lesson });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error creating lesson/module:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}