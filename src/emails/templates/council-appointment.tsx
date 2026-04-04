import { BaseEmailTemplate } from '../base-template';
import { Text, Section, Button } from '@react-email/components';
import * as React from 'react';

interface CouncilAppointmentEmailProps {
  lecturerName: string;
  councilName: string;
  role: string;
  councilDate?: string;
  actionUrl: string;
}

export const CouncilAppointmentEmail = ({
  lecturerName,
  councilName,
  role,
  councilDate,
  actionUrl,
}: CouncilAppointmentEmailProps) => {
  const roleDisplay = role === 'chair' ? 'Chủ tịch' : role === 'secretary' ? 'Thư ký' : 'Ủy viên';

  return (
    <BaseEmailTemplate
      previewText={`Thông báo bổ nhiệm vào Hội đồng: ${councilName}`}
      headingText="Bổ nhiệm Hội đồng Bảo vệ"
    >
      <Text style={paragraph}>
        Kính gửi Thầy/Cô <strong>{lecturerName}</strong>,
      </Text>
      <Section style={infoBox}>
        <Text style={paragraph}>
          Chúng tôi trân trọng thông báo Thầy/Cô đã được bổ nhiệm vào <strong>{councilName}</strong>.
        </Text>
        <Text style={paragraph}>
          • Vai trò: <strong>{roleDisplay}</strong>
        </Text>
        {councilDate && (
          <Text style={paragraph}>
            • Thời gian: <strong>{councilDate}</strong>
          </Text>
        )}
      </Section>
      <Text style={paragraph}>
        Vui lòng nhấn vào nút bên dưới để xem chi tiết danh sách đề tài và lịch bảo vệ của hội đồng.
      </Text>
      <Section style={btnContainer}>
        <Button style={button} href={actionUrl}>
          Xem chi tiết Hội đồng
        </Button>
      </Section>
      <Text style={paragraph}>
        Trân trọng,
        <br />
        <span style={signature}>Phòng Quản lý Đào tạo - Academic Nexus</span>
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
