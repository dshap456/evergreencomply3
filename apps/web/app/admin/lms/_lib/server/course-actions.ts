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

    // Check if slug is already taken by another course
    if (data.slug) {
      const { data: existingCourse } = await client
        .from('courses')
        .select('id')
        .eq('slug', data.slug)
        .neq('id', data.id)
        .single();
        
      if (existingCourse) {
        throw new Error(`The URL slug "${data.slug}" is already in use by another course. Please choose a different slug.`);
      }
    }

    // Simple update with just the fields we need
    const updateData: any = {};
    
    // Only include fields that are actually being updated
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.status !== undefined) updateData.status = data.status;
    
    updateData.updated_at = new Date().toISOString();
    
    console.log('🔄 UpdateCourseAction: Updating with data:', updateData);

    const { error, data: updateResult } = await client
      .from('courses')
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single();

    if (error) {
      // Handle specific error cases
      if (error.code === '23505' && error.message.includes('courses_slug_unique')) {
        throw new Error(`The URL slug "${data.slug}" is already in use. Please choose a different slug.`);
      }
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