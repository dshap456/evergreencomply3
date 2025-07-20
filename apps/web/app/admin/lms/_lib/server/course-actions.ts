'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
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
  async function (data, user) {
    const client = getSupabaseServerAdminClient();

    console.log('🔄 UpdateCourseAction: Starting update...', { 
      id: data.id, 
      title: data.title, 
      status: data.status,
      userId: user?.id 
    });

    // First, verify the course exists and get current state
    const { data: currentCourse, error: fetchError } = await client
      .from('courses')
      .select('id, title, is_published, account_id')
      .eq('id', data.id)
      .single();

    if (fetchError || !currentCourse) {
      console.error('❌ UpdateCourseAction: Course not found:', fetchError);
      throw new Error(`Course not found: ${fetchError?.message || 'Unknown error'}`);
    }

    console.log('📋 UpdateCourseAction: Current course state:', currentCourse);

    // Convert status enum to is_published boolean for database
    const is_published = data.status === 'published';
    
    console.log('🔄 UpdateCourseAction: Converting status:', { 
      statusEnum: data.status, 
      booleanValue: is_published,
      currentIsPublished: currentCourse.is_published
    });

    const updateData = {
      title: data.title,
      description: data.description,
      is_published: is_published,
      sku: data.sku,
      price: data.price,
      updated_at: new Date().toISOString(),
    };

    console.log('📝 UpdateCourseAction: Update payload:', updateData);

    const { error, data: updateResult } = await client
      .from('courses')
      .update(updateData)
      .eq('id', data.id)
      .select();

    if (error) {
      console.error('❌ UpdateCourseAction: Failed to update course:', error);
      throw new Error(`Failed to update course: ${error.message}`);
    }

    console.log('✅ UpdateCourseAction: Course updated successfully');
    console.log('📊 UpdateCourseAction: Update result:', updateResult);
    
    // Revalidate the admin LMS pages to refresh cached data
    revalidatePath('/admin/lms');
    revalidatePath('/admin/lms/courses');
    
    return { success: true, updatedCourse: updateResult?.[0] };
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