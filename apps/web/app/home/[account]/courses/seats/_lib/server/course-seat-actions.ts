'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getLogger } from '@kit/shared/logger';

const UpdateCourseSeatsSchema = z.object({
  courseId: z.string().uuid(),
  accountId: z.string().uuid(),
  totalSeats: z.number().min(1),
});

export const updateCourseSeatsAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();
    const logger = await getLogger();
    
    const ctx = {
      name: 'course.seats.update',
      userId: user.id,
      ...data,
    };

    try {
      logger.info(ctx, 'Updating course seats');

      // Check if user is account owner
      const { data: isOwner } = await client.rpc('is_account_owner', {
        account_id: data.accountId,
      });

      if (!isOwner) {
        throw new Error('Only team owners can update course seats');
      }

      // Check if seat record exists
      const { data: existingSeats } = await client
        .from('course_seats')
        .select('id')
        .eq('account_id', data.accountId)
        .eq('course_id', data.courseId)
        .maybeSingle();

      if (existingSeats) {
        // Update existing record
        const { error } = await client
          .from('course_seats')
          .update({
            total_seats: data.totalSeats,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('account_id', data.accountId)
          .eq('course_id', data.courseId);

        if (error) {
          logger.error({ ...ctx, error }, 'Failed to update seats');
          throw error;
        }
      } else {
        // Create new record
        const { error } = await client
          .from('course_seats')
          .insert({
            account_id: data.accountId,
            course_id: data.courseId,
            total_seats: data.totalSeats,
            created_by: user.id,
            updated_by: user.id,
          });

        if (error) {
          logger.error({ ...ctx, error }, 'Failed to create seats');
          throw error;
        }
      }

      logger.info(ctx, 'Course seats updated successfully');

      revalidatePath(`/home/${data.accountId}/courses/seats`);

      return { success: true };
    } catch (error) {
      logger.error({ ...ctx, error }, 'Error in updateCourseSeatsAction');
      throw error;
    }
  },
  {
    auth: true,
    schema: UpdateCourseSeatsSchema,
  }
);