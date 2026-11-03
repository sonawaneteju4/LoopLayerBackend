import { EmailLayout, PrimaryButton, Divider, InfoCard, Table } from './components/index.js';
import env from '../config/env.js';

/**
 * Customer Contact Confirmation Email Template
 *
 * Subject: We've Received Your Message
 * Content:
 * - Thank the customer
 * - Mention expected response time (within 1 business day)
 * - Message overview & Visit Website button
 */
export const renderContactConfirmation = (contact) => {
  const name = contact.name || 'Valued Client';
  const subjectText = contact.subject || 'General Inquiry';
  const websiteUrl = env.CLIENT_URL || 'https://looplayerdesing.com';
  const subject = "We've Received Your Message";

  const rows = [
    { label: 'Subject', value: subjectText, isHighlighted: true },
    { label: 'From', value: name },
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
    <!-- Status Badge -->
    <div style="margin-bottom: 18px;">
      <span style="display: inline-block; background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.3px;">
        Inquiry Received
      </span>
    </div>

    <h1 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0; letter-spacing: -0.3px;">
      Hello ${name},
    </h1>

    <p style="font-size: 15px; color: #334155; line-height: 24px; margin: 0 0 14px 0;">
      Thank you for reaching out to <strong>LoopLayer Designs</strong>. We have received your message regarding <em>"${subjectText}"</em>.
    </p>

    <p style="font-size: 15px; color: #334155; line-height: 24px; margin: 0 0 20px 0;">
      Our team is reviewing your inquiry. We typically reply within <strong>one business day</strong>. If your request is urgent, you can also reach out to our desk directly at <a href="mailto:${env.SMTP.FROM_EMAIL}" style="color: #2563EB; font-weight: 500;">${env.SMTP.FROM_EMAIL}</a>.
    </p>

    <!-- Details Table -->
    <div style="margin: 20px 0 16px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Inquiry Overview
      </div>
      ${Table(rows)}
    </div>

    <!-- Your Submitted Message -->
    ${InfoCard(
      `
        <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          Your Message
        </div>
        <div style="font-size: 14px; color: #334155; line-height: 22px; white-space: pre-wrap;">
          ${contact.message || ''}
        </div>
      `,
      { accentColor: '#2563EB', backgroundColor: '#F8FAFC' }
    )}

    ${PrimaryButton('Visit Website', websiteUrl, 'center')}

    ${Divider(28)}

    <p style="font-size: 13px; color: #94A3B8; text-align: center; margin: 0;">
      LoopLayer Designs &bull; Professional embroidery digitizing & vector artwork solutions.
    </p>
  `;

  const html = EmailLayout({
    title: subject,
    previewText: `Thank you for contacting LoopLayer Designs. We have received your inquiry regarding "${subjectText}".`,
    content: bodyContent,
  });

  const text = `
Hello ${name},

Thank you for reaching out to LoopLayer Designs. We have received your message regarding "${subjectText}".

Our team is reviewing your inquiry and will respond within one business day.

Your Message:
"${contact.message || ''}"

Website: ${websiteUrl}
Support: ${env.SMTP.FROM_EMAIL}
  `.trim();

  return { subject, html, text };
};

export default renderContactConfirmation;

