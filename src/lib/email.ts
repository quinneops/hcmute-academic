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
 * Highly robust: logs start/end and ignores all errors to prevent blocking the main flow.
 */
export async function sendEmail({ to, subject, react, from, text }: SendEmailOptions) {
  const recipient = Array.isArray(to) ? to.join(', ') : to;
  console.log(`[Resend] Attempting to send email to: ${recipient} | Subject: ${subject}`);

  if (!process.env.RESEND_API_KEY) {
    console.error('[Resend] FAILED: RESEND_API_KEY is not set');
    return { success: false, error: 'RESEND_API_KEY missing' };
  }

  try {
    // 1. Render template
    const html = await render(react);
    
    // 2. Send via Resend API
    const result = await resend.emails.send({
      from: from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || '',
    });

    if (result.error) {
      console.error('[Resend] API Error returned:', {
        message: result.error.message,
        name: result.error.name,
        to: recipient
      });
      return { success: false, error: result.error };
    }

    console.log(`[Resend] SENT SUCCESS: ${recipient} | ID: ${result.data?.id}`);
    return { success: true, data: result.data };
  } catch (error: any) {
    // IGNORE ERROR: Log it but don't let it crash anything
    console.error('[Resend] CRITICAL FAILURE (Ignored):', {
      message: error.message,
      to: recipient
    });
    return { success: false, error: error.message };
  }
}
