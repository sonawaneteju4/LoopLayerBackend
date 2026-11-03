import { EmailLayout, PrimaryButton, Divider, InfoCard, Table } from './components/index.js';
import env from '../config/env.js';

/**
 * Admin Contact Notification Email Template
 *
 * Subject: New Contact Inquiry
 * Content:
 * - All submitted details
 * - Message content
 * - Open Dashboard / Reply action
 */
export const renderContactNotification = (contact) => {
  const name = contact.name || 'Anonymous';
  const subjectText = contact.subject || 'New Contact Submission';
  const subject = `New Contact Inquiry — ${name} [${subjectText}]`;
  const dashboardUrl = `${env.CLIENT_URL || 'https://looplayerdesing.com'}/admin/contacts/${contact._id || ''}`;

  const detailRows = [
    { label: 'Sender Name', value: name, isHighlighted: true },
    { label: 'Email', value: contact.email || '-' },
    { label: 'Phone', value: contact.phone || 'N/A' },
    { label: 'Subject', value: subjectText },
    {
      label: 'Submitted Date',
      value: contact.createdAt
        ? new Date(contact.createdAt).toLocaleString('en-US')
        : new Date().toLocaleString('en-US'),
    },
  ];

  const bodyContent = `
    <!-- Top Alert Badge -->
    <div style="margin-bottom: 18px;">
      <span style="display: inline-block; background-color: #FEF3C7; border: 1px solid #FDE68A; color: #B45309; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.3px;">
        Inbox Alert &bull; New Inquiry
      </span>
    </div>

    <h1 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 14px 0; letter-spacing: -0.3px;">
      New Contact Form Message
    </h1>

    <p style="font-size: 15px; color: #334155; line-height: 24px; margin: 0 0 20px 0;">
      A prospective client has submitted an inquiry via the public website contact form.
    </p>

    <!-- Sender Details Table -->
    <div style="margin: 20px 0 16px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Contact Information
      </div>
      ${Table(detailRows)}
    </div>

    <!-- Message Body -->
    ${InfoCard(
      `
        <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
          Message Content
        </div>
        <div style="font-size: 14px; color: #334155; line-height: 22px; white-space: pre-wrap;">
          ${contact.message || ''}
        </div>
      `,
      { accentColor: '#2563EB', backgroundColor: '#F8FAFC' }
    )}

    ${PrimaryButton('View & Reply in Dashboard', dashboardUrl, 'center')}

    ${Divider(24)}

    <div style="font-size: 12px; color: #94A3B8; text-align: center;">
      You can also reply directly from the LoopLayer Admin Dashboard.
    </div>
  `;

  const html = EmailLayout({
    title: subject,
    previewText: `New inquiry from ${name}: "${subjectText}".`,
    content: bodyContent,
  });

  const text = `
New Contact Inquiry:
From: ${name}
Email: ${contact.email || '-'}
Phone: ${contact.phone || 'N/A'}
Subject: ${subjectText}

Message:
${contact.message || ''}

View in Dashboard: ${dashboardUrl}
  `.trim();

  return { subject, html, text };
};

export default renderContactNotification;

