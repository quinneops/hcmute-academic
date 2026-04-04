import { BaseEmailTemplate } from '../base-template';
import { Text, Section, Button } from '@react-email/components';
import * as React from 'react';

interface AppointmentNotificationEmailProps {
  recipientName: string;
  title: string;
  content: string;
  actionUrl: string;
  actionLabel: string;
}

export const AppointmentNotificationEmail = ({
  recipientName,
  title,
  content,
  actionUrl,
  actionLabel,
}: AppointmentNotificationEmailProps) => {
  return (
    <BaseEmailTemplate
      previewText={title}
      headingText={title}
    >
      <Text style={paragraph}>
        Chào <strong>{recipientName}</strong>,
      </Text>
      <Section style={infoBox}>
        <Text style={paragraph}>
          {content}
        </Text>
      </Section>
      <Text style={paragraph}>
        Vui lòng nhấn vào nút bên dưới để xem chi tiết và thực hiện các bước tiếp theo.
      </Text>
      <Section style={btnContainer}>
        <Button style={button} href={actionUrl}>
          {actionLabel}
        </Button>
      </Section>
      <Text style={paragraph}>
        Trân trọng,
        <br />
        <span style={signature}>Hệ thống Academic Nexus</span>
      </Text>
    </BaseEmailTemplate>
  );
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#334155',
  margin: '16px 0',
};

const infoBox = {
  backgroundColor: '#f8fafc',
  padding: '1px 24px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  margin: '24px 0',
};

const btnContainer = {
  textAlign: 'center' as const,
  marginTop: '32px',
  marginBottom: '32px',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const signature = {
  fontWeight: '600',
  color: '#1e293b',
};
