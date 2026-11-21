import { EmailLayout, Table, InfoCard } from './components/index.js';

/**
 * Customer Quote Confirmation Email Template
 * Clean, simple, professional studio confirmation.
 */
export const renderQuoteConfirmation = (quote) => {
  const rawFirstName = (quote.customer?.firstName || (quote.customer?.name ? quote.customer.name.split(' ')[0] : '')).trim();
  const rawLastName = (quote.customer?.lastName || '').trim();
  const cleanLastName = rawLastName.toLowerCase() === 'customer' ? '' : rawLastName;
  const cleanFirstName = rawFirstName.toLowerCase() === 'customer' ? '' : rawFirstName;
  const displayName = `${cleanFirstName} ${cleanLastName}`.trim() || 'there';
  const greetingName = cleanFirstName || 'there';

  const requestId = quote.requestId || 'LLD-2026-000001';
  const service = quote.service || 'Embroidery Digitizing';
  const submissionDate = quote.createdAt
    ? new Date(quote.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US');

  const turnaround = quote.turnaround || 'Standard';
  const isRush = Boolean(quote.isRush || /rush|express/i.test(turnaround));

  const subject = `We've Received Your Project Request [${requestId}]`;

  const specRows = [
    { label: 'Request ID', value: requestId, isHighlighted: true },
    { label: 'Selected Service', value: service },
    { label: 'Turnaround', value: isRush ? `⚡ ${turnaround} (Rush Queue)` : turnaround },
    { label: 'Submission Date', value: submissionDate },
    { label: 'Name', value: displayName },
    { label: 'Email', value: quote.customer?.email || '-' },
    { label: 'Phone', value: quote.customer?.phone || '-' },
    { label: 'Country', value: quote.customer?.country || '-' },
  ];

  if (quote.dimensions?.width && quote.dimensions?.height) {
    specRows.push({
      label: 'Target Dimensions',
      value: `${quote.dimensions.width} &times; ${quote.dimensions.height} ${quote.dimensions.unit || 'in'}`,
    });
  }

  const filesCount = quote.uploadedFiles?.length || quote.files?.length || 0;
  if (filesCount > 0) {
    specRows.push({
      label: 'Uploaded Artwork',
      value: `${filesCount} file${filesCount > 1 ? 's' : ''} received`,
    });
  }

  const rushAlertHtml = isRush
    ? `
      <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 12px 16px; margin: 0 0 18px 0;">
        <span style="font-size: 13px; font-weight: 700; color: #DC2626;">⚡ Rush Priority Logged:</span>
        <span style="font-size: 13px; color: #991B1B;"> Your project has been prioritized in our digitizing queue for rapid turnaround.</span>
      </div>
    `
    : '';

  const bodyContent = `
    ${rushAlertHtml}

    <h1 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 19px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0; letter-spacing: -0.3px;">
      Hello ${greetingName},
    </h1>

    <p style="font-size: 15px; color: #334155; line-height: 24px; margin: 0 0 12px 0;">
      Thank you for submitting your request to <strong>LoopLayer Design</strong>. We have successfully received your project details and uploaded artwork.
    </p>

    <p style="font-size: 15px; color: #334155; line-height: 24px; margin: 0 0 20px 0;">
      Our embroidery digitizing specialists and vector artists will carefully review your project details and get back to you with a quote <strong>soon</strong>.
    </p>

    <!-- Order Summary Table -->
    <div style="margin: 20px 0 16px 0;">
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

    <p style="font-size: 14px; color: #475569; line-height: 22px; margin: 20px 0 0 0;">
      If you have additional instructions or updated artwork files, simply reply directly to this email at any time.
    </p>
  `;

  const html = EmailLayout({
    title: subject,
    previewText: `We've received your project request [${requestId}] at LoopLayer Design. We'll reply soon.`,
    content: bodyContent,
  });

  const text = `
Hello ${greetingName},

Thank you for submitting your request to LoopLayer Design. We have successfully received your project details and uploaded artwork.

Our embroidery digitizing specialists and vector artists will carefully review your project details and get back to you with a quote soon.

Order Summary:
- Request ID: ${requestId}
- Selected Service: ${service}
- Turnaround: ${turnaround}${isRush ? ' (Rush Priority)' : ''}
- Submission Date: ${submissionDate}
- Name: ${displayName}
- Email: ${quote.customer?.email || '-'}
- Phone: ${quote.customer?.phone || '-'}
- Country: ${quote.customer?.country || '-'}

${quote.projectRequirements ? `Project Requirements:\n${quote.projectRequirements}\n` : ''}
If you have additional instructions or updated artwork files, simply reply directly to this email at any time.

Regards,
Team LoopLayer Design
Professional Embroidery Digitizing & Vector Artwork Services
Email: orders@looplayerdesign.com
Website: www.looplayerdesign.com
  `.trim();

  return { subject, html, text };
};

export default renderQuoteConfirmation;
