import { EmailLayout, PrimaryButton, Divider, InfoCard, Table } from './components/index.js';
import env from '../config/env.js';

/**
 * Customer Quote Confirmation Email Template
 *
 * Subject: We've Received Your Project Request
 * Content:
 * - Hello {First Name},
 * - Thank you for choosing LoopLayer Designs.
 * - We've successfully received your project details and uploaded artwork.
 * - Our embroidery specialists will carefully review your request and get back to you within one business day.
 * - Includes: Request ID, Service, Submission Date, Contact Information
 * - Primary Button: Visit Website
 */
export const renderQuoteConfirmation = (quote) => {
  const firstName = quote.customer?.firstName || 'Valued Customer';
  const fullName = `${quote.customer?.firstName || ''} ${quote.customer?.lastName || ''}`.trim();
  const requestId = quote.requestId || 'LLD-2026-000001';
  const service = quote.service || 'Embroidery Digitizing';
  const submissionDate = quote.createdAt
    ? new Date(quote.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US');
  const websiteUrl = env.CLIENT_URL || 'https://looplayerdesing.com';

  const subject = `We've Received Your Project Request [${requestId}]`;

  const specRows = [
    { label: 'Request ID', value: requestId, isHighlighted: true },
    { label: 'Selected Service', value: service },
    { label: 'Submission Date', value: submissionDate },
    { label: 'Customer Name', value: fullName },
    { label: 'Customer Email', value: quote.customer?.email || '' },
    { label: 'Customer Phone', value: quote.customer?.phone || '-' },
    { label: 'Country', value: quote.customer?.country || '-' },
  ];

  if (quote.dimensions?.width && quote.dimensions?.height) {
    specRows.push({
      label: 'Target Dimensions',
      value: `${quote.dimensions.width} &times; ${quote.dimensions.height} ${quote.dimensions.unit || 'in'}`,
    });
  }

  const filesCount = quote.uploadedFiles?.length || 0;
  if (filesCount > 0) {
    specRows.push({
      label: 'Uploaded Artwork',
      value: `${filesCount} file${filesCount > 1 ? 's' : ''} received`,
    });
  }

  const bodyContent = `
    <!-- Greeting & Status Badge -->
    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; background-color: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.3px;">
        Request Confirmed
      </span>
    </div>

    <h1 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0; letter-spacing: -0.3px;">
      Hello ${firstName},
    </h1>

    <p style="font-size: 15px; color: #334155; line-height: 24px; margin: 0 0 14px 0;">
      <strong>Thank you for submitting your request.</strong> We have successfully received your project requirements and uploaded artwork.
    </p>

    <p style="font-size: 15px; color: #334155; line-height: 24px; margin: 0 0 20px 0;">
      Our embroidery digitizing specialists and vector artists will carefully review your project details and get back to you within one business day.
    </p>

    <!-- Project Specifications Table -->
    <div style="margin: 24px 0 12px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Order Summary
      </div>
      ${Table(specRows)}
    </div>

    ${
      quote.projectRequirements
        ? InfoCard(
            `
          <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
            Project Requirements
          </div>
          <div style="font-size: 14px; color: #334155; line-height: 22px; white-space: pre-wrap;">
            ${quote.projectRequirements}
          </div>
        `,
            { accentColor: '#2563EB', backgroundColor: '#F8FAFC' }
          )
        : ''
    }

    <!-- Business Hours & Contact Information Card -->
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px; margin: 24px 0 20px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 8px;">
        Support & Business Hours
      </div>
      <p style="font-size: 13px; color: #475569; line-height: 20px; margin: 0 0 6px 0;">
        <strong>Business Hours:</strong> Monday – Saturday: 9:00 AM – 7:00 PM IST
      </p>
      <p style="font-size: 13px; color: #475569; line-height: 20px; margin: 0 0 6px 0;">
        <strong>Contact:</strong> orders@looplayerdesign.com | Nagpur, Maharashtra, India
      </p>
      <p style="font-size: 12px; color: #94A3B8; line-height: 18px; margin: 10px 0 0 0; padding-top: 10px; border-top: 1px dashed #CBD5E1;">
        <strong>No Reply:</strong> This is an automated notification from a no-reply address. For updates, reach our production team directly at orders@looplayerdesign.com referencing Order ID <strong>${requestId}</strong>.
      </p>
    </div>

    ${PrimaryButton('Visit Website', websiteUrl, 'center')}

    ${Divider(28)}

    <p style="font-size: 13px; color: #94A3B8; text-align: center; margin: 0;">
      Need immediate assistance? Reach our production desk at <a href="mailto:${env.SMTP.FROM_EMAIL}" style="color: #2563EB; font-weight: 500;">${env.SMTP.FROM_EMAIL}</a>
    </p>
  `;

  const html = EmailLayout({
    title: subject,
    previewText: `We've received your project request [${requestId}] at LoopLayer Designs. Our team is reviewing your specs.`,
    content: bodyContent,
  });

  const text = `
Hello ${firstName},

Thank you for choosing LoopLayer Designs. We've successfully received your project details and uploaded artwork.

Our embroidery specialists will carefully review your request and get back to you within one business day.

Project Details:
- Request ID: ${requestId}
- Service: ${service}
- Submission Date: ${submissionDate}
- Customer: ${fullName} (${quote.customer?.email || ''}, ${quote.customer?.phone || '-'})
- Country: ${quote.customer?.country || '-'}

Visit Website: ${websiteUrl}

LoopLayer Designs
Nagpur, Maharashtra
${env.SMTP.FROM_EMAIL}
  `.trim();

  return { subject, html, text };
};

export default renderQuoteConfirmation;

