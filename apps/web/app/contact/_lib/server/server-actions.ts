'use server';

import { z } from 'zod';

import { getMailer } from '@kit/mailers';
import { enhanceAction } from '@kit/next/actions';

import { ContactEmailSchema } from '../contact-email.schema';

const contactEmail = z
  .string({
    description: `The email where you want to receive the contact form submissions.`,
    required_error:
      'Contact email is required. Please use the environment variable CONTACT_EMAIL.',
  })
  .parse(process.env.CONTACT_EMAIL);

const emailFrom = z
  .string({
    description: `The email sending address.`,
    required_error:
      'Sender email is required. Please use the environment variable EMAIL_SENDER.',
  })
  .parse(process.env.EMAIL_SENDER);

// Log environment variables (remove in production)
console.log('Contact form configuration:', {
  contactEmail,
  emailFrom,
  mailerProvider: process.env.MAILER_PROVIDER,
  hasResendKey: !!process.env.RESEND_API_KEY,
});

export const sendContactEmail = enhanceAction(
  async (data) => {
    try {
      const mailer = await getMailer();

      await mailer.sendEmail({
        to: contactEmail,
        from: `Evergreen Comply <${emailFrom}>`,
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
      });

      console.log(`Contact form email sent to ${contactEmail} from ${data.email}`);
      return {};
    } catch (error) {
      console.error('Failed to send contact email:', error);
      throw new Error('Failed to send contact email. Please ensure RESEND_API_KEY is set in environment variables.');
    }
  },
  {
    schema: ContactEmailSchema,
    auth: false,
  },
);
