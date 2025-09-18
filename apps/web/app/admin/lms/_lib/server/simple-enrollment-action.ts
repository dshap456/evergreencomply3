'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import pathsConfig from '~/config/paths.config';
import {
  sendCourseEnrollmentEmail,
  sendCourseInvitationEmail,
} from '~/lib/email/resend';

const INVITATION_EXPIRATION_DAYS = 30;

function buildAbsoluteUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return new URL(path, baseUrl).toString();
}

function deriveNameFromEmail(email: string) {
  const [localPart] = email.split('@');

  if (!localPart) {
    return undefined;
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export async function simpleEnrollUserAction(
  userEmail: string,
  courseId: string,
) {
  console.log('🚀 SimpleEnroll: Called with:', { userEmail, courseId });

  try {
    const normalizedEmail = userEmail.trim().toLowerCase();
    const adminClient = getSupabaseServerAdminClient();
    const client = getSupabaseServerClient();

    const {
      data: { user: currentUser },
      error: currentUserError,
    } = await client.auth.getUser();

    if (currentUserError || !currentUser?.id) {
      throw new Error('Unable to determine the current admin user. Please sign in again.');
    }

    const { data: course, error: courseError } = await adminClient
      .from('courses')
      .select('id, title, slug, account_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('❌ SimpleEnroll: Course lookup failed', courseError);
      throw new Error('Course not found');
    }

    const { data: courseAccount } = await adminClient
      .from('accounts')
      .select('id, name')
      .eq('id', course.account_id)
      .single();

    const teamName = courseAccount?.name || 'Evergreen Comply';

    const { data: personalAccount, error: personalAccountError } = await adminClient
      .from('accounts')
      .select('id, primary_owner_user_id, name')
      .eq('email', normalizedEmail)
      .eq('is_personal_account', true)
      .maybeSingle();

    if (personalAccountError) {
      console.error('❌ SimpleEnroll: Personal account lookup failed', personalAccountError);
      throw new Error('Failed to look up user account');
    }

    if (personalAccount?.primary_owner_user_id) {
      const userId = personalAccount.primary_owner_user_id;

      const { data: existingEnrollment, error: existingEnrollmentError } =
        await adminClient
          .from('course_enrollments')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();

      if (existingEnrollmentError) {
        console.error('❌ SimpleEnroll: Enrollment lookup failed', existingEnrollmentError);
        throw new Error('Failed to check existing enrollment');
      }

      let enrollmentRecord = existingEnrollment ?? null;

      if (!existingEnrollment) {
        const { data: enrollment, error: enrollError } = await adminClient
          .from('course_enrollments')
          .insert({
            user_id: userId,
            course_id: courseId,
            account_id: personalAccount.id,
            progress_percentage: 0,
            invited_by: currentUser.id,
          })
          .select()
          .single();

        if (enrollError) {
          if (enrollError.code === '23505') {
            console.warn('⚠️ SimpleEnroll: Unique enrollment constraint hit, fetching existing record');

            const { data: fetchedEnrollment } = await adminClient
              .from('course_enrollments')
              .select('id')
              .eq('user_id', userId)
              .eq('course_id', courseId)
              .single();

            enrollmentRecord = fetchedEnrollment ?? null;
          } else {
            console.error('❌ SimpleEnroll: Enrollment creation failed', enrollError);
            throw new Error(`Enrollment failed: ${enrollError.message}`);
          }
        } else {
          enrollmentRecord = enrollment;
        }
      }

      const coursePath = `${pathsConfig.app.personalAccountCourses}/${course.id}`;
      const courseUrl = buildAbsoluteUrl(coursePath);
      const signInUrl = buildAbsoluteUrl(
        `${pathsConfig.auth.signIn}?redirect=${encodeURIComponent(coursePath)}`,
      );

      let warning: string | undefined;

      try {
        await sendCourseEnrollmentEmail({
          to: normalizedEmail,
          courseName: course.title,
          courseUrl,
          signInUrl,
        });
      } catch (emailError) {
        console.error('❌ SimpleEnroll: Failed to send enrollment email', emailError);
        warning = 'The user was enrolled but the notification email could not be sent.';
      }

      return {
        success: true,
        message: existingEnrollment
          ? `User already enrolled. Re-sent access email to ${normalizedEmail}.`
          : `Enrolled ${normalizedEmail} and sent access instructions.`,
        enrollment: enrollmentRecord,
        warning,
      };
    }

    const { data: existingInvite } = await adminClient
      .from('course_invitations')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('course_id', courseId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let invitation;

    const expiration = new Date();
    expiration.setDate(expiration.getDate() + INVITATION_EXPIRATION_DAYS);

    if (existingInvite) {
      const newToken = crypto.randomUUID();

      const { data: updatedInvite, error: updateError } = await adminClient
        .from('course_invitations')
        .update({
          invite_token: newToken,
          expires_at: expiration.toISOString(),
          invited_by: currentUser.id,
        })
        .eq('id', existingInvite.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ SimpleEnroll: Failed to refresh invitation', updateError);
        throw new Error('Failed to refresh existing invitation');
      }

      invitation = updatedInvite;
    } else {
      const { data: newInvitation, error: inviteError } = await adminClient
        .from('course_invitations')
        .insert({
          email: normalizedEmail,
          invitee_name: deriveNameFromEmail(normalizedEmail),
          course_id: courseId,
          account_id: course.account_id,
          invited_by: currentUser.id,
          expires_at: expiration.toISOString(),
        })
        .select()
        .single();

      if (inviteError) {
        console.error('❌ SimpleEnroll: Failed to create invitation', inviteError);
        throw new Error(inviteError.message ?? 'Failed to create invitation');
      }

      invitation = newInvitation;
    }

    const { error: cleanupError } = await adminClient
      .from('pending_invitation_tokens')
      .delete()
      .eq('email', normalizedEmail)
      .eq('invitation_type', 'course');

    if (cleanupError) {
      console.warn('⚠️ SimpleEnroll: Failed to clean previous pending tokens', cleanupError);
    }

    const { error: storeTokenError } = await adminClient
      .from('pending_invitation_tokens')
      .insert({
        email: normalizedEmail,
        invitation_token: invitation.invite_token,
        invitation_type: 'course',
      });

    if (storeTokenError) {
      console.warn('⚠️ SimpleEnroll: Failed to store pending invitation token', storeTokenError);
    }

    const inviteUrl = buildAbsoluteUrl(
      `${pathsConfig.auth.signUp}?invite_token=${invitation.invite_token}`,
    );

    let warning: string | undefined;

    try {
      await sendCourseInvitationEmail({
        to: normalizedEmail,
        inviteeName: deriveNameFromEmail(normalizedEmail),
        courseName: course.title,
        teamName,
        inviteUrl,
      });
    } catch (emailError) {
      console.error('❌ SimpleEnroll: Failed to send invitation email', emailError);
      warning =
        'Invitation created but the email could not be delivered. Share the signup link manually.';
    }

    return {
      success: true,
      message: `Invitation sent to ${normalizedEmail}.`,
      invitation,
      warning,
    };
  } catch (error) {
    console.error('❌ SimpleEnroll Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
