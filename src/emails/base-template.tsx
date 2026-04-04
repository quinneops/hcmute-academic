import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Img,
  Link,
  Button,
} from '@react-email/components';
import * as React from 'react';

interface BaseEmailTemplateProps {
  previewText: string;
  headingText: string;
  children: React.ReactNode;
}

export const BaseEmailTemplate = ({
  previewText,
  headingText,
  children,
}: BaseEmailTemplateProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={heading}>{headingText}</Heading>
          </Section>
          <Hr style={hr} />
          <Section style={content}>
            {children}
          </Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              © 2024 Academic Nexus - HCMUTE. All rights reserved.
            </Text>
            <Text style={footerText}>
              Trường Đại học Sư phạm Kỹ thuật TP.HCM
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f8fafc',
  fontFamily:
    'Inter, -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  padding: '0',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  maxWidth: '600px',
  overflow: 'hidden' as const,
};

const header = {
  padding: '32px 32px 0px',
};

const heading = {
  fontSize: '24px',
  lineHeight: '1.2',
  fontWeight: '700',
  color: '#1e293b',
  margin: '0',
};

const content = {
  padding: '32px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '20px 0',
};

const footer = {
  backgroundColor: '#f1f5f9',
  padding: '24px 32px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '4px 0',
};
