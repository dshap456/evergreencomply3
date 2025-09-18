'use server';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { sendEmail } from '~/lib/email/resend';

import { ContactEmailSchema } from '../contact-email.schema';

export const sendContactEmail = enhanceAction(
  async (data) => {
    try {
      // Parse environment variable inside the function to avoid module load errors
      const contactEmail = z
        .string({
          description: `The email where you want to receive the contact form submissions.`,
          required_error:
            'Contact email is required. Please use the environment variable CONTACT_EMAIL.',
        })
        .parse(process.env.CONTACT_EMAIL);

      const emailPayload = {
        to: contactEmail,
        subject: 'Contact Form Submission - Evergreen Comply',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Contact Form Submission</h2>
            <p style="color: #666;">You have received a new contact form submission from the Evergreen Comply website.</p>

            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Name:</strong> ${data.name}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Message:</strong></p>
              <p style="white-space: pre-wrap;">${data.message}</p>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This email was sent from the contact form at Evergreen Comply.
            </p>
          </div>
        `,
      };

      // Use the EMAIL_SENDER from environment, which should be from verified domain
      const fromEmail = process.env.EMAIL_SENDER || 'delivered@resend.dev';

      // If we're trying to send to a domain-specific email but the domain isn't verified,
      // we need to use the default Resend sender
      const isUsingCustomDomain = fromEmail !== 'delivered@resend.dev' &&
                                  !fromEmail.includes('resend.dev');

      // If using custom domain fails, we'll retry with default sender
      let emailSent = false;
      let lastError: any = null;

      try {
        const result = await sendEmail({
          ...emailPayload,
          from: fromEmail,
        });
        emailSent = true;
        return { success: true, emailId: result?.id };
      } catch (emailError: any) {
        lastError = emailError;

        // If it's a domain verification error and we were trying to use a custom domain,
        // fall back to using the account owner's email
        if (isUsingCustomDomain && emailError?.error?.includes('domain is not verified')) {
          try {
            // Use the account owner's email as recipient
            const fallbackEmail = 'david.alan.shapiro@gmail.com';
            const fallbackResult = await sendEmail({
              to: fallbackEmail,
              subject: emailPayload.subject + ' (Domain Verification Pending)',
              html: emailPayload.html + `
                <hr style="margin-top: 30px; border: 1px solid #eee;">
                <p style="color: #999; font-size: 11px; margin-top: 20px;">
                  Note: This email was sent to ${fallbackEmail} because the domain ${contactEmail.split('@')[1]}
                  is pending verification in Resend. Once verified, emails will be sent to ${contactEmail}.
                </p>
              `,
              from: 'delivered@resend.dev',
            });

            emailSent = true;
            return { success: true, emailId: fallbackResult?.id, fallback: true };
          } catch (fallbackError) {
            console.error('Fallback email also failed:', fallbackError);
            lastError = fallbackError;
          }
        }
      }

      if (!emailSent) {
        throw lastError;
      }
    } catch (error) {
      console.error('=== Contact Form Error ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('Full error:', error);
      console.error('=== End Error ===');

      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes('RESEND_API_KEY')) {
          throw new Error('Email service configuration error. Please contact support.');
        } else if (error.message.includes('from')) {
          throw new Error('Invalid sender email configuration. Please contact support.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Too many requests. Please try again later.');
        }
      } else if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        // Handle Resend API errors
        const resendError = error as any;
        if (resendError.statusCode === 403 && resendError.error?.includes('verify a domain')) {
          console.error('Resend domain verification required for:', contactEmail);
          throw new Error('Email configuration error. The contact form is temporarily unavailable.');
        }
      }

      throw new Error('Failed to send contact email. Please try again later.');
    }
  },
  {
    schema: ContactEmailSchema,
    auth: false,
  },
);
