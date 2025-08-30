'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const UpdateModuleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  order_index: z.number().min(1),
  language: z.enum(['en', 'es']).optional(),
});

export const updateModuleAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    const { error } = await client
      .from('course_modules')
      .update({
        title: data.title,
        description: data.description,
        order_index: data.order_index,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (error) {
      throw new Error(`Failed to update module: ${error.message}`);
    }

    return { success: true };
  },
  {
    auth: true,
    schema: UpdateModuleSchema,
  }
);

const CreateModuleSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  order_index: z.number().min(1),
  language: z.enum(['en', 'es']),
});

export const createModuleAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    const { data: module, error } = await client
      .from('course_modules')
      .insert({
        course_id: data.course_id,
        title: data.title,
        description: data.description,
        order_index: data.order_index,
        language: data.language,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create module: ${error.message}`);
    }

    return { success: true, module };
  },
  {
    auth: true,
    schema: CreateModuleSchema,
  }
);

const UpdateLessonOrderSchema = z.object({
  moduleId: z.string().uuid(),
  lessons: z.array(z.object({
    id: z.string().uuid(),
    order_index: z.number().min(1),
  })),
});

export const updateLessonOrderAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    // Update each lesson's order_index in a transaction-like manner
    const updatePromises = data.lessons.map((lesson) =>
      client
        .from('lessons')
        .update({
          order_index: lesson.order_index,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lesson.id)
        .eq('module_id', data.moduleId) // Extra safety check
    );

    const results = await Promise.all(updatePromises);
    
    // Check if any updates failed
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      throw new Error(`Failed to update lesson order: ${errors[0].error.message}`);
    }

    return { success: true };
  },
  {
    auth: true,
    schema: UpdateLessonOrderSchema,
  }
);

const DeleteModuleSchema = z.object({
  id: z.string().uuid(),
});

export const deleteModuleAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    const { error } = await client
      .from('course_modules')
      .delete()
      .eq('id', data.id);

    if (error) {
      throw new Error(`Failed to delete module: ${error.message}`);
    }

    return { success: true };
  },
  {
    auth: true,
    schema: DeleteModuleSchema,
  }
);