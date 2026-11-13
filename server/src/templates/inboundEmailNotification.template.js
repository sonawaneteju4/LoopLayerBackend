import { EmailLayout, PrimaryButton, Divider, InfoCard, Table } from './components/index.js';
import env from '../config/env.js';

/**
 * Admin Notification Email Template for Inbound Received Emails
 *
 * Subject: New Email Received - LoopLayer Designs
 * Content:
 * - Sender details (Name & Email)
 * - Subject line
 * - Timestamp received
 * - Text snippet preview
 * - Button linking directly to /admin/inbox/{{emailId}}
 */
const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const renderInboundEmailNotification = (emailRecord) => {
  const fromName = emailRecord.fromName || '';
  const fromEmail = emailRecord.fromEmail || 'unknown@sender.com';
  const senderDisplay = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const senderHtml = fromName
    ? `${escapeHtml(fromName)} &lt;<a href="mailto:${fromEmail}" style="color: #2563EB;">${escapeHtml(fromEmail)}</a>&gt;`
    : `<a href="mailto:${fromEmail}" style="color: #2563EB;">${escapeHtml(fromEmail)}</a>`;
  const subject = emailRecord.subject || '(No Subject)';
  const emailSubject = 'New Email Received - LoopLayer Designs';

  const receivedTime = emailRecord.receivedAt
    ? new Date(emailRecord.receivedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-US');

  const adminBaseUrl = env.CLIENT_URL || 'https://www.looplayerdesign.com';
  const directInboxUrl = `${adminBaseUrl}/admin/inbox/${emailRecord._id || emailRecord.id}`;

  const detailRows = [
    { label: 'From', value: senderHtml, isHighlighted: true },
    { label: 'To', value: escapeHtml(Array.isArray(emailRecord.toEmail) ? emailRecord.toEmail.join(', ') : (emailRecord.toEmail || 'orders@looplayerdesign.com')) },
    { label: 'Subject', value: escapeHtml(subject) },
    { label: 'Received', value: receivedTime },
  ];

  if (emailRecord.attachments && emailRecord.attachments.length > 0) {
    detailRows.push({
      label: 'Attachments',
      value: `${emailRecord.attachments.length} file(s) attached`,
    });
  }

  const snippet = emailRecord.textBody
    ? (emailRecord.textBody.length > 300
        ? `${emailRecord.textBody.slice(0, 300)}...`
        : emailRecord.textBody)
    : '(No text preview)';

  const bodyContent = `
    <!-- Top Alert Badge -->
    <div style="margin-bottom: 18px;">
      <span style="display: inline-block; background-color: #FEF3C7; border: 1px solid #FDE68A; color: #B45309; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.3px;">
        Inbound Email &bull; Live Customer Message
      </span>
    </div>

    <h1 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 14px 0; letter-spacing: -0.3px;">
      New Email Received
    </h1>

    <p style="font-size: 15px; color: #334155; line-height: 24px; margin: 0 0 20px 0;">
      A customer has sent an email to your domain. You can review the complete message, attachments, and reply directly from the Admin Dashboard.
    </p>

    <!-- Details Table -->
    <div style="margin: 20px 0 16px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Message Details
      </div>
      ${Table(detailRows)}
    </div>

    <!-- Message Preview Card -->
    ${InfoCard(
      `
        <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
          Message Snippet
        </div>
        <div style="font-size: 14px; color: #334155; line-height: 22px; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${snippet}
        </div>
      `,
      { accentColor: '#D97706', backgroundColor: '#FFFBEB' }
    )}

    ${Divider()}

    <!-- Direct Action Button -->
    <div style="text-align: center; margin: 28px 0 20px 0;">
      ${PrimaryButton('Open in Admin Dashboard', directInboxUrl, 'center')}
    </div>

    <p style="font-size: 12px; color: #64748B; text-align: center; margin: 12px 0 0 0;">
      Or copy link: <a href="${directInboxUrl}" style="color: #D97706; text-decoration: underline;">${directInboxUrl}</a>
    </p>
  `;

  const html = EmailLayout({
    title: emailSubject,
    previewText: `New email received from ${fromName || fromEmail}: ${subject}`,
    content: bodyContent,
  });

  const text = `
New Email Received - LoopLayer Designs

From: ${senderDisplay}
Subject: ${subject}
Received: ${receivedTime}

Message:
${snippet}

Open in Admin Dashboard:
${directInboxUrl}
  `.trim();

  return {
    subject: emailSubject,
    html,
    text,
  };
};

export default renderInboundEmailNotification;
