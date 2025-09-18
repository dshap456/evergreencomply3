import 'server-only';

import { z } from 'zod';

import { Mailer, MailerSchema } from '@kit/mailers-shared';

type Config = z.infer<typeof MailerSchema>;

const RESEND_API_KEY = z
  .string({
    description: 'The API key for the Resend API',
    required_error: 'Please provide the API key for the Resend API',
  })
  .parse(process.env.RESEND_API_KEY);

export function createResendMailer() {
  return new ResendMailer();
}

/**
 * A class representing a mailer using the Resend HTTP API.
 * @implements {Mailer}
 */
class ResendMailer implements Mailer {
  async sendEmail(config: Config) {
    const contentObject =
      'text' in config
        ? {
            text: config.text,
          }
        : {
            html: config.html,
          };

    const payload = {
      from: config.from,
      to: Array.isArray(config.to) ? config.to : [config.to],
      subject: config.subject,
      ...contentObject,
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Resend API error:', {
        status: res.status,
        statusText: res.statusText,
        body: errorText,
      });
      throw new Error(`Failed to send email: ${res.status} ${res.statusText} - ${errorText}`);
    }

    await res.json();
  }
}
