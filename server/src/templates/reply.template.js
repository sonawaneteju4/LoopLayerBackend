import { EmailLayout, Divider, InfoCard } from './components/index.js';
import env from '../config/env.js';

/**
 * Admin Reply Email Template (Sent directly from dashboard)
 *
 * Requirements:
 * - Maintain branded layout (#0F172A, #2563EB, Inter, 640px max width)
 * - Include rich message body
 * - Include formatted conversation thread history
 * - Attachments listing if applicable
 */
export const renderAdminReply = ({
  recipientName = 'Valued Customer',
  subject = 'Message regarding your project',
  message = '',
  threadHistory = [],
  attachments = [],
  sentBy = 'LoopLayer Designs Team',
  referenceId = null,
}) => {
  const cleanSubject = referenceId && !subject.includes(referenceId)
    ? `[${referenceId}] ${subject}`
    : subject;

  // Render attachment pills/links if provided
  let attachmentsHtml = '';
  if (attachments && attachments.length > 0) {
    const list = attachments
      .map(
        (att) => `
        <li style="margin-bottom: 6px; font-size: 13px;">
          ${att.url && att.url !== '#'
            ? `<a href="${att.url}" target="_blank" rel="noopener noreferrer" style="color: #2563EB; font-weight: 600; text-decoration: underline;">${att.filename || 'Attachment'}</a>`
            : `<span style="color: #0F172A; font-weight: 600;">${att.filename || (typeof att === 'string' ? att : 'Attachment')}</span>`
          }
          ${att.size ? `<span style="color: #94A3B8;"> (${Math.round(att.size / 1024)} KB)</span>` : ''}
        </li>
      `
      )
      .join('');
    attachmentsHtml = `
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
          Attached Files (${attachments.length})
        </div>
        <ul style="margin: 0; padding-left: 20px; color: #334155;">${list}</ul>
      </div>
    `;
  }

  // Render previous conversation thread
  let threadHtml = '';
  if (threadHistory && threadHistory.length > 0) {
    const threadEntries = threadHistory
      .map((entry) => {
        const authorLabel = entry.role === 'admin' ? 'LoopLayer Support' : (entry.author || 'Customer');
        const isCurrentAdmin = entry.role === 'admin';
        const dateStr = entry.date ? new Date(entry.date).toLocaleString('en-US') : '';

        return `
          <div style="border-left: 3px solid ${isCurrentAdmin ? '#2563EB' : '#CBD5E1'}; padding-left: 14px; margin-bottom: 16px;">
            <div style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">
              <span style="color: ${isCurrentAdmin ? '#2563EB' : '#0F172A'}; font-weight: 700;">${authorLabel}</span>
              ${dateStr ? `<span style="color: #94A3B8; margin-left: 8px; font-weight: 400;">${dateStr}</span>` : ''}
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 20px;">
              ${entry.message}
            </div>
          </div>
        `;
      })
      .join('');

    threadHtml = `
      <div style="margin-top: 32px;">
        <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
          Previous Conversation History
        </div>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 18px;">
          ${threadEntries}
        </div>
      </div>
    `;
  }

  const bodyContent = `
    <!-- Greeting & Status Badge -->
    <div style="margin-bottom: 18px;">
      <span style="display: inline-block; background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.3px;">
        Direct Response
      </span>
    </div>

    <h1 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0; letter-spacing: -0.3px;">
      Hello ${recipientName},
    </h1>

    <!-- Admin Message Body -->
    <div style="font-size: 15px; color: #1E293B; line-height: 26px; margin: 0 0 20px 0;">
      ${message}
    </div>

    ${attachmentsHtml}

    <!-- Sign-off Block -->
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #E2E8F0;">
      <div style="font-size: 14px; font-weight: 600; color: #0F172A;">Warm regards,</div>
      <div style="font-size: 14px; color: #2563EB; font-weight: 700; margin-top: 2px;">${sentBy}</div>
      <div style="font-size: 12px; color: #64748B;">LoopLayer Designs</div>
    </div>

    <!-- Reply prompt note -->
    <div style="margin-top: 20px; background-color: #F1F5F9; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #64748B; line-height: 18px;">
      <strong>Note:</strong> You can reply directly to this email at any time to continue this thread.
    </div>

    ${threadHtml}

    ${Divider(28)}

    <p style="font-size: 12px; color: #94A3B8; text-align: center; margin: 0;">
      LoopLayer Designs &bull; Nagpur, Maharashtra &bull; <a href="mailto:${env.SMTP.FROM_EMAIL}" style="color: #2563EB;">${env.SMTP.FROM_EMAIL}</a>
    </p>
  `;

  const html = EmailLayout({
    title: cleanSubject,
    previewText: message.replace(/<[^>]*>?/gm, '').slice(0, 100),
    content: bodyContent,
  });

  const text = `
Hello ${recipientName},

${message.replace(/<[^>]*>?/gm, '')}

Warm regards,
${sentBy}
LoopLayer Designs
${env.SMTP.FROM_EMAIL}
  `.trim();

  return { subject: cleanSubject, html, text };
};

export default renderAdminReply;

