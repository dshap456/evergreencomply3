import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params;
    const client = getSupabaseServerClient();
    const body = await request.json();

    const { data: module, error } = await client
      .from('course_modules')
      .update({
        title: body.title,
        description: body.description,
        order_index: body.order_index
      })
      .eq('id', moduleId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ module });
  } catch (error) {
    console.error('Error updating module:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params;
    const client = getSupabaseServerClient();

    // First delete all lessons in this module
    const { error: lessonsError } = await client
      .from('lessons')
      .delete()
      .eq('module_id', moduleId);

    if (lessonsError) {
      return NextResponse.json({ error: lessonsError.message }, { status: 500 });
    }

    // Then delete the module
    const { error } = await client
      .from('course_modules')
      .delete()
      .eq('id', moduleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting module:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}