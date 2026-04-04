import { sendEmail } from '../src/lib/email';
import * as React from 'react';
import { CouncilAppointmentEmail } from '../src/emails/templates/council-appointment';

async function test() {
  console.log('Testing Resend Integration...');
  
  if (!process.env.RESEND_API_KEY) {
    console.error('ERROR: RESEND_API_KEY is not set in environment.');
    return;
  }

  try {
    const result = await sendEmail({
      to: 'thuongnd.dev@gmail.com', // Change this to your test email
      subject: '[Academic Nexus] Kiểm tra tích hợp Email',
      react: React.createElement(CouncilAppointmentEmail, {
        lecturerName: 'TS. Nguyễn Văn A',
        councilName: 'Hội đồng Bảo vệ Khóa luận K20-01',
        role: 'chair',
        councilDate: '15/06/2024 - 08:00',
        actionUrl: 'https://hcmute-academic.vercel.app/lecturer/schedule',
      }) as React.ReactElement,
    });

    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test script failed:', error);
  }
}

test();
