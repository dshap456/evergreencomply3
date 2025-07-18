'use server';

import { z } from 'zod';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

const UpdateCourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  sku: z.string().optional(),
  price: z.number().min(0).optional(),
});

export const updateCourseAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    console.log('🔄 UpdateCourseAction: Updating course:', { id: data.id, title: data.title, status: data.status });

    // Convert status enum to is_published boolean for database
    const is_published = data.status === 'published';

    const { error } = await client
      .from('courses')
      .update({
        title: data.title,
        description: data.description,
        is_published: is_published,
        sku: data.sku,
        price: data.price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (error) {
      console.error('❌ UpdateCourseAction: Failed to update course:', error);
      throw new Error(`Failed to update course: ${error.message}`);
    }

    console.log('✅ UpdateCourseAction: Course updated successfully');
    return { success: true };
  },
  {
    auth: true,
    schema: UpdateCourseSchema,
  }
);

const CreateCourseSchema = z.object({
  account_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().min(0).optional(),
});

export const createCourseAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    const { data: course, error } = await client
      .from('courses')
      .insert({
        account_id: data.account_id,
        title: data.title,
        description: data.description,
        sku: data.sku,
        price: data.price,
        is_published: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create course: ${error.message}`);
    }

    return { success: true, course };
  },
  {
    auth: true,
    schema: CreateCourseSchema,
  }
);

const DeleteCourseSchema = z.object({
  id: z.string().uuid(),
});

export const deleteCourseAction = enhanceAction(
  async function (data) {
    const client = getSupabaseServerAdminClient();

    const { error } = await client
      .from('courses')
      .delete()
      .eq('id', data.id);

    if (error) {
      throw new Error(`Failed to delete course: ${error.message}`);
    }

    return { success: true };
  },
  {
    auth: true,
    schema: DeleteCourseSchema,
  }
);