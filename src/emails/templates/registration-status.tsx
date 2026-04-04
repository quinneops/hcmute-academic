import { BaseEmailTemplate } from '../base-template';
import { Text, Section, Button } from '@react-email/components';
import * as React from 'react';

interface RegistrationStatusEmailProps {
  studentName: string;
  proposalTitle: string;
  status: 'approved' | 'rejected' | 'pending';
  reviewNotes?: string;
  actionUrl: string;
}

export const RegistrationStatusEmail = ({
  studentName,
  proposalTitle,
  status,
  reviewNotes,
  actionUrl,
}: RegistrationStatusEmailProps) => {
  const statusDisplay = status === 'approved' ? 'Đã được Duyệt' : status === 'rejected' ? 'Bị Từ chối' : 'Đang chờ';
  const color = status === 'approved' ? '#059669' : status === 'rejected' ? '#dc2626' : '#d97706';

  return (
    <BaseEmailTemplate
      previewText={`Kết quả đăng ký đề tài: ${statusDisplay}`}
      headingText="Cập nhật Đăng ký Đề tài"
    >
      <Text style={paragraph}>
        Chào <strong>{studentName}</strong>,
      </Text>
      <Text style={paragraph}>
        Giảng viên hướng dẫn vừa cập nhật kết quả cho đăng ký đề tài của bạn:
      </Text>
      <Section style={{ ...infoBox, borderLeft: `4px solid ${color}` }}>
        <Text style={paragraph}>
          Đề tài: <strong>{proposalTitle}</strong>
        </Text>
        <Text style={{ ...statusText, color }}>
          Kết quả: <strong>{statusDisplay}</strong>
        </Text>
        {reviewNotes && (
          <Text style={paragraph}>
            Ghi chú: <em>"{reviewNotes}"</em>
          </Text>
        )}
      </Section>
      <Text style={paragraph}>
        Vui lòng đăng nhập vào hệ thống Academic Nexus để xem chi tiết và thực hiện các bước tiếp theo (nếu có).
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
  backgroundColor: '#f8fafc',
  padding: '1px 24px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  margin: '24px 0',
};

const statusText = {
  fontSize: '18px',
  fontWeight: '700' as const,
  margin: '16px 0',
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
