'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getLogger } from '@kit/shared/logger';

const InviteToCourseSchema = z.object({
  email: z.string().email(),
  courseId: z.string().uuid(),
  accountId: z.string().uuid(),
});

export const inviteToCourseAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();
    const logger = await getLogger();
    
    const ctx = {
      name: 'course.invitation.create',
      userId: user.id,
      ...data,
    };

    try {
      logger.info(ctx, 'Creating course invitation');

      // Check if user is account owner
      const { data: isOwner } = await client.rpc('is_account_owner', {
        account_id: data.accountId,
      });

      if (!isOwner) {
        throw new Error('Only team owners can invite members to courses');
      }

      // Check available seats
      const { data: availableSeats } = await client.rpc('get_available_course_seats', {
        p_account_id: data.accountId,
        p_course_id: data.courseId,
      });

      if (!availableSeats || availableSeats <= 0) {
        throw new Error('No available seats for this course');
      }

      // Check if invitation already exists
      const { data: existingInvite } = await client
        .from('course_invitations')
        .select('id')
        .eq('email', data.email)
        .eq('course_id', data.courseId)
        .eq('account_id', data.accountId)
        .is('accepted_at', null)
        .maybeSingle();

      if (existingInvite) {
        throw new Error('An invitation for this email already exists');
      }

      // Create invitation
      const { error } = await client
        .from('course_invitations')
        .insert({
          email: data.email,
          course_id: data.courseId,
          account_id: data.accountId,
          invited_by: user.id,
        });

      if (error) {
        logger.error({ ...ctx, error }, 'Failed to create invitation');
        throw error;
      }

      logger.info(ctx, 'Course invitation created successfully');

      // TODO: Send invitation email

      revalidatePath(`/home/${data.accountId}/courses/seats`);

      return { success: true };
    } catch (error) {
      logger.error({ ...ctx, error }, 'Error in inviteToCourseAction');
      throw error;
    }
  },
  {
    auth: true,
    schema: InviteToCourseSchema,
  }
);

const RemoveFromCourseSchema = z.object({
  userId: z.string().uuid(),
  courseId: z.string().uuid(),
  accountId: z.string().uuid(),
});

export const removeFromCourseAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient();
    const logger = await getLogger();
    
    const ctx = {
      name: 'course.enrollment.remove',
      userId: user.id,
      ...data,
    };

    try {
      logger.info(ctx, 'Removing user from course');

      // Check if user is account owner
      const { data: isOwner } = await client.rpc('is_account_owner', {
        account_id: data.accountId,
      });

      if (!isOwner) {
        throw new Error('Only team owners can remove members from courses');
      }

      // Don't allow removing the owner themselves
      if (data.userId === user.id) {
        throw new Error('You cannot remove yourself from a course');
      }

      // Remove enrollment
      const { error } = await client
        .from('course_enrollments')
        .delete()
        .eq('user_id', data.userId)
        .eq('course_id', data.courseId)
        .eq('account_id', data.accountId);

      if (error) {
        logger.error({ ...ctx, error }, 'Failed to remove enrollment');
        throw error;
      }

      logger.info(ctx, 'User removed from course successfully');

      revalidatePath(`/home/${data.accountId}/courses/seats`);

      return { success: true };
    } catch (error) {
      logger.error({ ...ctx, error }, 'Error in removeFromCourseAction');
      throw error;
    }
  },
  {
    auth: true,
    schema: RemoveFromCourseSchema,
  }
);