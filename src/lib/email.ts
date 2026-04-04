import { Resend } from 'resend';
import { render } from '@react-email/render';
import { ReactElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: ReactElement;
  from?: string;
  text?: string;
}

/**
 * Utility to send emails via Resend
 */
export async function sendEmail({ to, subject, react, from, text }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email will not be sent.');
    return { success: false, error: 'RESEND_API_KEY missing' };
  }

  try {
    const html = await render(react);
    const { data, error } = await resend.emails.send({
      from: from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || '',
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Unexpected error sending email:', error);
    return { success: false, error: error.message };
  }
}
