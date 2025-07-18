'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const UpdateModuleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  order_index: z.number().min(1),
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