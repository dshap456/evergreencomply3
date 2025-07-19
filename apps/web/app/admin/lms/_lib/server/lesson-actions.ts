'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const UpdateLessonSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  content_type: z.enum(['video', 'text', 'quiz']),
  order_index: z.number().min(1),
  is_final_quiz: z.boolean().optional(),
});

export const updateLessonAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    const { error } = await client
      .from('lessons')
      .update({
        title: data.title,
        description: data.description,
        content_type: data.content_type,
        order_index: data.order_index,
        is_final_quiz: data.is_final_quiz,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (error) {
      throw new Error(`Failed to update lesson: ${error.message}`);
    }

    return { success: true };
  },
  {
    auth: true,
    schema: UpdateLessonSchema,
  }
);

const CreateLessonSchema = z.object({
  module_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  content_type: z.enum(['video', 'text', 'quiz']),
  order_index: z.number().min(1),
  is_final_quiz: z.boolean().optional(),
});

export const createLessonAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    console.log('🔄 CreateLessonAction: Creating lesson in database...', {
      module_id: data.module_id,
      title: data.title,
      content_type: data.content_type,
      order_index: data.order_index
    });

    const { data: lesson, error } = await client
      .from('lessons')
      .insert({
        module_id: data.module_id,
        title: data.title,
        description: data.description,
        content_type: data.content_type,
        order_index: data.order_index,
        is_final_quiz: data.is_final_quiz || false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ CreateLessonAction: Database error:', error);
      throw new Error(`Failed to create lesson: ${error.message}`);
    }

    console.log('✅ CreateLessonAction: Lesson created successfully:', lesson);
    return { success: true, lesson };
  },
  {
    auth: true,
    schema: CreateLessonSchema,
  }
);

const DeleteLessonSchema = z.object({
  id: z.string().uuid(),
});

export const deleteLessonAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    const { error } = await client
      .from('lessons')
      .delete()
      .eq('id', data.id);

    if (error) {
      throw new Error(`Failed to delete lesson: ${error.message}`);
    }

    return { success: true };
  },
  {
    auth: true,
    schema: DeleteLessonSchema,
  }
);