'use server';

import { z } from 'zod';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const UpdateModuleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  order_index: z.number().min(0),
  language: z.enum(['en', 'es']).optional(),
});

export async function updateModuleAction(data: z.infer<typeof UpdateModuleSchema>) {
  // Validate input
  const validated = UpdateModuleSchema.parse(data);
  
  // Check auth
  const regularClient = getSupabaseServerClient();
  const { data: { user } } = await regularClient.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const adminClient = getSupabaseServerAdminClient();

  const { error } = await adminClient
    .from('course_modules')
    .update({
      title: validated.title,
      description: validated.description,
      order_index: validated.order_index,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.id);

  if (error) {
    console.error('Module update error:', error);
    throw new Error(`Failed to update module: ${error.message}`);
  }

  return { success: true };
}

const CreateModuleSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  order_index: z.number().min(0),
  language: z.enum(['en', 'es']),
});

export async function createModuleAction(data: z.infer<typeof CreateModuleSchema>) {
  const validated = CreateModuleSchema.parse(data);
  
  const regularClient = getSupabaseServerClient();
  const { data: { user } } = await regularClient.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const adminClient = getSupabaseServerAdminClient();

  const { data: module, error } = await adminClient
    .from('course_modules')
    .insert({
      course_id: validated.course_id,
      title: validated.title,
      description: validated.description,
      order_index: validated.order_index,
      language: validated.language,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create module: ${error.message}`);
  }

  return { success: true, module };
}

const UpdateLessonOrderSchema = z.object({
  moduleId: z.string().uuid(),
  lessons: z.array(z.object({
    id: z.string().uuid(),
    order_index: z.number().min(0),
  })),
});

export async function updateLessonOrderAction(data: z.infer<typeof UpdateLessonOrderSchema>) {
  // Validate input
  const validated = UpdateLessonOrderSchema.parse(data);
  
  // Check auth
  const regularClient = getSupabaseServerClient();
  const { data: { user } } = await regularClient.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const adminClient = getSupabaseServerAdminClient();

  console.log('Updating lesson order for module:', validated.moduleId);
  console.log('Lessons to update:', validated.lessons);

  // Update each lesson's order_index in a transaction-like manner
  const updatePromises = validated.lessons.map((lesson) =>
    adminClient
      .from('lessons')
      .update({
        order_index: lesson.order_index,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lesson.id)
      .eq('module_id', validated.moduleId) // Extra safety check
  );

  const results = await Promise.all(updatePromises);
  
  // Check if any updates failed
  const errors = results.filter(result => result.error);
  if (errors.length > 0) {
    console.error('Lesson order update errors:', errors);
    throw new Error(`Failed to update lesson order: ${errors[0].error.message}`);
  }

  console.log('Successfully updated lesson order');
  return { success: true };
}

const DeleteModuleSchema = z.object({
  id: z.string().uuid(),
});

export async function deleteModuleAction(data: z.infer<typeof DeleteModuleSchema>) {
  const validated = DeleteModuleSchema.parse(data);
  
  const regularClient = getSupabaseServerClient();
  const { data: { user } } = await regularClient.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const adminClient = getSupabaseServerAdminClient();

  const { error } = await adminClient
    .from('course_modules')
    .delete()
    .eq('id', validated.id);

  if (error) {
    throw new Error(`Failed to delete module: ${error.message}`);
  }

  return { success: true };
}