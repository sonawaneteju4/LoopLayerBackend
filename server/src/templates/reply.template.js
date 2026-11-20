import { EmailLayout } from './components/index.js';

/**
 * Admin Reply / Custom Studio Email Template
 * Clean, simple, professional correspondence.
 */
export const renderAdminReply = ({
  recipientName = '',
  subject = 'Message regarding your project',
  message = '',
  threadHistory = [],
  attachments = [],
  referenceId = null,
}) => {
  const cleanSubject = referenceId && !subject.includes(referenceId)
    ? `[${referenceId}] ${subject}`
    : subject;

  // Clean recipient name (strip any "Customer" suffix)
  const cleanRecipientName = (recipientName || '').replace(/\s+Customer$/i, '').trim();

  // Render attachment pills/links if provided
  let attachmentsHtml = '';
  if (attachments && attachments.length > 0) {
    const list = attachments
      .map(
        (att) => `
        <li style="margin-bottom: 6px; font-size: 13px; line-height: 20px;">
          ${
            att.url && att.url !== '#'
              ? `<a href="${att.url}" target="_blank" rel="noopener noreferrer" style="color: #2563EB; font-weight: 600; text-decoration: underline;">${att.filename || 'Attachment'}</a>`
              : `<span style="color: #0F172A; font-weight: 600;">${att.filename || (typeof att === 'string' ? att : 'Attachment')}</span>`
          }
          ${att.size ? `<span style="color: #64748B;"> (${Math.round(att.size / 1024)} KB)</span>` : ''}
        </li>
      `
      )
      .join('');

    attachmentsHtml = `
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 16px; margin: 20px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          Attached Files (${attachments.length})
        </div>
        <ul style="margin: 0; padding-left: 20px; color: #334155;">${list}</ul>
      </div>
    `;
  }

  // Render previous conversation thread if present
  let threadHtml = '';
  if (threadHistory && threadHistory.length > 0) {
    const threadEntries = threadHistory
      .map((entry) => {
        const authorLabel = entry.role === 'admin' ? 'LoopLayer Support' : (entry.author || 'Client');
        const isCurrentAdmin = entry.role === 'admin';
        const dateStr = entry.date ? new Date(entry.date).toLocaleString('en-US') : '';

        return `
          <div style="border-left: 3px solid ${isCurrentAdmin ? '#2563EB' : '#CBD5E1'}; padding-left: 12px; margin-bottom: 12px;">
            <div style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 2px;">
              <span style="color: ${isCurrentAdmin ? '#2563EB' : '#0F172A'}; font-weight: 700;">${authorLabel}</span>
              ${dateStr ? `<span style="color: #94A3B8; margin-left: 8px; font-weight: 400;">${dateStr}</span>` : ''}
            </div>
            <div style="font-size: 13px; color: #334155; line-height: 18px; white-space: pre-wrap;">
              ${entry.message}
            </div>
          </div>
        `;
      })
      .join('');

    threadHtml = `
      <div style="margin-top: 28px; padding-top: 18px; border-top: 1px dashed #E2E8F0;">
        <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
          Previous Conversation History
        </div>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 14px 16px;">
          ${threadEntries}
        </div>
      </div>
    `;
  }

  // Normalize message HTML
  // If message is plain text with newlines, convert \n to <br>
  const formattedMessage = message.includes('<p>') || message.includes('<br>')
    ? message
    : message.split('\n\n').map(p => `<p style="margin: 0 0 14px 0;">${p.replace(/\n/g, '<br>')}</p>`).join('');

  // Check if message already starts with a greeting
  const startsWithGreeting = /^\s*(<p>)?(Hi|Hello|Dear|Hey)\b/i.test(message.trim());
  const greetingHtml = !startsWithGreeting && cleanRecipientName
    ? `<p style="margin: 0 0 16px 0; font-weight: 600; color: #0F172A;">Hello ${cleanRecipientName},</p>`
    : '';

  const bodyContent = `
    ${greetingHtml}
    <div style="font-size: 15px; color: #1E293B; line-height: 24px;">
      ${formattedMessage}
    </div>
    ${attachmentsHtml}
    ${threadHtml}
  `;

  const html = EmailLayout({
    title: cleanSubject,
    previewText: message.replace(/<[^>]*>?/gm, '').slice(0, 100),
    content: bodyContent,
    showHeader: true,
    showFooter: true,
  });

  const plainMessage = message.replace(/<[^>]*>?/gm, '').trim();
  const textGreeting = !startsWithGreeting && cleanRecipientName ? `Hello ${cleanRecipientName},\n\n` : '';

  const text = `
${textGreeting}${plainMessage}

Regards,
Team LoopLayer Design
Professional Embroidery Digitizing & Vector Artwork Services
Email: orders@looplayerdesign.com
Website: www.looplayerdesign.com
  `.trim();

  return { subject: cleanSubject, html, text };
};

export default renderAdminReply;
