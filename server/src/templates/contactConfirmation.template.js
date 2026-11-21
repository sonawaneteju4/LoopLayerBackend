import { EmailLayout, Table, InfoCard } from './components/index.js';

/**
 * Customer Contact Confirmation Email Template
 * Clean, simple, professional studio inquiry receipt.
 */
export const renderContactConfirmation = (contact) => {
  const rawName = (contact.name || '').trim();
  const cleanName = rawName.replace(/\s+Customer$/i, '').trim() || 'there';
  const subjectText = contact.subject || 'General Inquiry';
  const subject = "We've Received Your Message";

  const rows = [
    { label: 'Subject', value: subjectText, isHighlighted: true },
    { label: 'Name', value: cleanName },
    { label: 'Email', value: contact.email || '-' },
    { label: 'Phone', value: contact.phone || '-' },
    {
      label: 'Received At',
      value: contact.createdAt
        ? new Date(contact.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : new Date().toLocaleDateString('en-US'),
    },
  ];

  const bodyContent = `
    <h1 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 19px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0; letter-spacing: -0.3px;">
      Hello ${cleanName},
    </h1>

    <p style="font-size: 15px; color: #334155; line-height: 24px; margin: 0 0 12px 0;">
      Thank you for contacting <strong>LoopLayer Design</strong>. We have received your message regarding <em>"${subjectText}"</em>.
    </p>

    <p style="font-size: 15px; color: #334155; line-height: 24px; margin: 0 0 20px 0;">
      Our team is reviewing your inquiry and will get back to you <strong>soon</strong>.
    </p>

    <!-- Details Table -->
    <div style="margin: 20px 0 16px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Inquiry Details
      </div>
      ${Table(rows)}
    </div>

    <!-- Your Submitted Message -->
    ${
      contact.message
        ? InfoCard(
            `
          <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
            Your Message
          </div>
          <div style="font-size: 14px; color: #334155; line-height: 22px; white-space: pre-wrap;">
            ${contact.message}
          </div>
        `,
            { accentColor: '#2563EB', backgroundColor: '#F8FAFC' }
          )
        : ''
    }

    <p style="font-size: 14px; color: #475569; line-height: 22px; margin: 20px 0 0 0;">
      If your inquiry is urgent or you have additional details to share, feel free to reply directly to this email at any time.
    </p>
  `;

  const html = EmailLayout({
    title: subject,
    previewText: `Thank you for contacting LoopLayer Design. We have received your inquiry regarding "${subjectText}".`,
    content: bodyContent,
  });

  const text = `
Hello ${cleanName},

Thank you for reaching out to LoopLayer Design. We have received your message regarding "${subjectText}".

Our team is reviewing your inquiry and will get back to you soon.

Inquiry Details:
- Name: ${cleanName}
- Email: ${contact.email || '-'}
- Phone: ${contact.phone || '-'}
- Subject: ${subjectText}

Your Message:
"${contact.message || ''}"

If you have additional details to share, feel free to reply directly to this email at any time.

Regards,
Team LoopLayer Design
Professional Embroidery Digitizing & Vector Artwork Services
Email: orders@looplayerdesign.com
Website: www.looplayerdesign.com
  `.trim();

  return { subject, html, text };
};

export default renderContactConfirmation;
