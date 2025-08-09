'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { CourseTransformer } from '../transformers/data-transformers';
import { UICourse, CourseStatus } from '../types/data-contracts';
import { handleTransformationError } from '../utils/data-consistency';

const UpdateCourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  slug: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  sku: z.string().optional(),
  price: z.number().min(0).optional(),
});

export const updateCourseAction = enhanceAction(
  async function (data: Partial<UICourse>, user) {
    const client = getSupabaseServerClient();

    // Simple update with just the fields we need
    const updateData = {
      title: data.title,
      description: data.description,
      slug: data.slug,
      status: data.status,
      updated_at: new Date().toISOString(),
    };

    const { error, data: updateResult } = await client
      .from('courses')
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update course: ${error.message}`);
    }

    return { 
      success: true, 
      updatedCourse: CourseTransformer.toUI(updateResult)
    };
  },
  {
    auth: true,
    schema: UpdateCourseSchema,
  }
);

const CreateCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const createCourseAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerAdminClient();

    console.log('🔄 CreateCourseAction: Starting course creation with data:', data);
    console.log('🔄 CreateCourseAction: User:', user?.id);

    // Get the user's personal account ID (same as user ID for personal accounts)
    const userAccountId = user?.id;
    
    if (!userAccountId) {
      throw new Error('User account not found');
    }

    // Force new schema since the database has been migrated
    const useOldSchema = false;
    console.log('🔍 CreateCourseAction: Using new schema with status field');

    const insertData: any = {
      account_id: userAccountId,
      title: data.title,
      description: data.description,
      status: 'draft',
    };

    const { data: course, error } = await client
      .from('courses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ CreateCourseAction: Failed to create course:', error);
      throw new Error(`Failed to create course: ${error.message}`);
    }

    console.log('✅ CreateCourseAction: Course created successfully:', course);

    // Revalidate the admin LMS page to refresh cached data
    revalidatePath('/admin/lms');

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