'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { CourseTransformer } from '../transformers/data-transformers';
import { UICourse, CourseStatus } from '../types/data-contracts';
import { handleTransformationError } from '../utils/data-consistency';

const UpdateCourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum([CourseStatus.DRAFT, CourseStatus.PUBLISHED, CourseStatus.ARCHIVED]).optional(),
  sku: z.string().optional(),
  price: z.number().min(0).optional(),
});

export const updateCourseAction = enhanceAction(
  async function (data: Partial<UICourse>, user) {
    try {
      const client = getSupabaseServerAdminClient();

      console.log('🔄 UpdateCourseAction: Starting update with data contracts...', { 
        id: data.id, 
        title: data.title, 
        status: data.status,
        userId: user?.id 
      });

      // First, verify the course exists and get current state
      const { data: currentCourse, error: fetchError } = await client
        .from('courses')
        .select('*')
        .eq('id', data.id!)
        .single();

      if (fetchError || !currentCourse) {
        console.error('❌ UpdateCourseAction: Course not found:', fetchError);
        throw new Error(`Course not found: ${fetchError?.message || 'Unknown error'}`);
      }

      console.log('📋 UpdateCourseAction: Current course state:', currentCourse);

      // Use data transformer for safe conversion
      const updateData = CourseTransformer.toDatabase(data);
      
      console.log('🔄 UpdateCourseAction: Transformed data:', updateData);

      const { error, data: updateResult } = await client
        .from('courses')
        .update(updateData)
        .eq('id', data.id!)
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
      
      return { 
        success: true, 
        updatedCourse: updateResult?.[0] ? CourseTransformer.toUI(updateResult[0]) : undefined 
      };
    } catch (error) {
      handleTransformationError(error as Error, 'updateCourseAction');
      throw error;
    }
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

    const { data: course, error } = await client
      .from('courses')
      .insert({
        account_id: userAccountId,
        title: data.title,
        description: data.description,
        is_published: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ CreateCourseAction: Failed to create course:', error);
      throw new Error(`Failed to create course: ${error.message}`);
    }

    console.log('✅ CreateCourseAction: Course created successfully:', course);

    // Revalidate the admin LMS pages to refresh cached data
    revalidatePath('/admin/lms');
    revalidatePath('/admin/lms/courses');

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