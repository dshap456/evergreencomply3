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
      // language intentionally not stored (no column in schema)
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

  // First, verify all lessons belong to the module
  const { data: existingLessons, error: fetchError } = await adminClient
    .from('lessons')
    .select('id')
    .eq('module_id', validated.moduleId)
    .in('id', validated.lessons.map(l => l.id));

  if (fetchError) {
    console.error('Failed to fetch lessons:', fetchError);
    throw new Error(`Failed to fetch lessons: ${fetchError.message}`);
  }

  const existingLessonIds = new Set(existingLessons?.map(l => l.id) || []);
  const requestedLessonIds = validated.lessons.map(l => l.id);
  const missingLessons = requestedLessonIds.filter(id => !existingLessonIds.has(id));

  if (missingLessons.length > 0) {
    console.error('Lessons not found in module:', missingLessons);
    throw new Error(`Some lessons do not belong to this module or do not exist: ${missingLessons.join(', ')}`);
  }

  // Update each lesson's order_index with verification
  const updatePromises = validated.lessons.map((lesson) =>
    adminClient
      .from('lessons')
      .update({
        order_index: lesson.order_index,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lesson.id)
      .eq('module_id', validated.moduleId)
      .select() // Add select to verify the update
  );

  const results = await Promise.all(updatePromises);
  
  // Check if any updates failed or returned no data
  const failedUpdates = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const lesson = validated.lessons[i];
    
    if (result.error) {
      failedUpdates.push({
        lessonId: lesson.id,
        error: result.error.message
      });
    } else if (!result.data || result.data.length === 0) {
      failedUpdates.push({
        lessonId: lesson.id,
        error: 'No rows updated - lesson may not exist or not belong to this module'
      });
    }
  }

  if (failedUpdates.length > 0) {
    console.error('Lesson order update failures:', failedUpdates);
    const errorMessage = failedUpdates
      .map(f => `Lesson ${f.lessonId}: ${f.error}`)
      .join('; ');
    throw new Error(`Failed to update lesson order: ${errorMessage}`);
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
