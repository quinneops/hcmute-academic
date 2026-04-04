import { BaseEmailTemplate } from '../base-template';
import { Text, Section, Button } from '@react-email/components';
import * as React from 'react';

interface ProposalNotificationEmailProps {
  studentName: string;
  studentCode: string;
  proposalTitle: string;
  proposalType: string;
  actionUrl: string;
}

export const ProposalNotificationEmail = ({
  studentName,
  studentCode,
  proposalTitle,
  proposalType,
  actionUrl,
}: ProposalNotificationEmailProps) => {
  return (
    <BaseEmailTemplate
      previewText={`Sinh viên ${studentName} vừa đăng ký đề tài ${proposalTitle}`}
      headingText="Đăng ký Đề tài Mới"
    >
      <Text style={paragraph}>
        Kính gửi Thầy/Cô,
      </Text>
      <Section style={infoBox}>
        <Text style={paragraph}>
          Sinh viên <strong>{studentName}</strong> (MSSV: <strong>{studentCode}</strong>) vừa gửi một đăng ký cho đề tài:
        </Text>
        <Text style={paragraph}>
          <strong>{proposalTitle}</strong> ({proposalType})
        </Text>
      </Section>
      <Text style={paragraph}>
        Vui lòng Thầy/Cô đăng nhập vào hệ thống để xem chi tiết lý do đăng ký và phê duyệt cho sinh viên này.
      </Text>
      <Section style={btnContainer}>
        <Button style={button} href={actionUrl}>
          Xem Đăng ký
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
  backgroundColor: '#f1f5f9',
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
  backgroundColor: '#0f172a',
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
