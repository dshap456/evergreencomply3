'use server';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { sendEmail } from '~/lib/email/resend';

import { ContactEmailSchema } from '../contact-email.schema';

export const sendContactEmail = enhanceAction(
  async (data) => {
    console.log('=== Contact Form Debug Start ===');
    console.log('1. Form data received:', data);
    console.log('2. Environment check:', {
      hasContactEmail: !!process.env.CONTACT_EMAIL,
      contactEmail: process.env.CONTACT_EMAIL,
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10),
    });

    try {
      // Parse environment variable inside the function to avoid module load errors
      const contactEmail = z
        .string({
          description: `The email where you want to receive the contact form submissions.`,
          required_error:
            'Contact email is required. Please use the environment variable CONTACT_EMAIL.',
        })
        .parse(process.env.CONTACT_EMAIL);

      console.log('3. Contact email parsed:', contactEmail);

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

      console.log('4. Attempting to send email with payload:', {
        to: emailPayload.to,
        subject: emailPayload.subject,
        htmlLength: emailPayload.html.length,
      });

      const result = await sendEmail({
        ...emailPayload,
        from: process.env.EMAIL_SENDER || 'delivered@resend.dev',
      });

      console.log('5. Email sent successfully!');
      console.log(`Contact form email sent to ${contactEmail} from ${data.email}`);
      console.log('Email send result:', result);
      console.log('=== Contact Form Debug End ===');
      
      return { success: true, emailId: result?.id };
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
      }
      
      throw new Error('Failed to send contact email. Please try again later.');
    }
  },
  {
    schema: ContactEmailSchema,
    auth: false,
  },
);
