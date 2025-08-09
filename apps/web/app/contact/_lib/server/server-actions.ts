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

      await sendEmail({
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
      });

      console.log(`Contact form email sent to ${contactEmail} from ${data.email}`);
      return {};
    } catch (error) {
      console.error('Failed to send contact email:', error);
      throw new Error('Failed to send contact email. Please try again later.');
    }
  },
  {
    schema: ContactEmailSchema,
    auth: false,
  },
);
