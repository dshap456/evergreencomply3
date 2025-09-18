'use server';

import { z } from 'zod';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { revalidatePath } from 'next/cache';

const InviteToCourseSchema = z.object({
  email: z.string().email(),
  courseId: z.string().uuid(),
  accountId: z.string().uuid(),
});

export async function inviteToCourseActionSimple(data: z.infer<typeof InviteToCourseSchema>) {
  try {
    const client = getSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is account owner
    const { data: account, error: accountError } = await client
      .from('accounts')
      .select('primary_owner_user_id')
      .eq('id', data.accountId)
      .single();

    if (accountError || !account) {
      return { success: false, error: 'Account not found' };
    }

    if (account.primary_owner_user_id !== user.id) {
      return { success: false, error: 'Only team owners can invite members' };
    }

    // Create invitation
    const { error: insertError } = await client
      .from('course_invitations')
      .insert({
        email: data.email,
        course_id: data.courseId,
        account_id: data.accountId,
        invited_by: user.id,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    // Get account slug for revalidation
    const { data: accountSlug } = await client
      .from('accounts')
      .select('slug')
      .eq('id', data.accountId)
      .single();

    // Try to revalidate the page
    try {
      if (accountSlug?.slug) {
        revalidatePath(`/home/${accountSlug.slug}/courses/seats`);
      }
    } catch (revalidateError) {
      console.error('Revalidate error:', revalidateError);
      // Continue anyway - the invitation was created successfully
    }

    return { success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
