import { EmailLayout, PrimaryButton, Divider, InfoCard, Table } from './components/index.js';
import env from '../config/env.js';

/**
 * Admin Quote Notification Email Template
 * Alerts orders@looplayerdesign.com when a new quote is submitted.
 * Prominently flags Rush Orders for immediate studio attention.
 */
export const renderQuoteNotification = (quote) => {
  const rawFirstName = (quote.customer?.firstName || '').trim();
  const rawLastName = (quote.customer?.lastName || '').trim();
  const cleanLastName = rawLastName.toLowerCase() === 'customer' ? '' : rawLastName;
  const cleanFirstName = rawFirstName.toLowerCase() === 'customer' ? '' : rawFirstName;
  const customerName = `${cleanFirstName} ${cleanLastName}`.trim() || quote.customer?.name || 'Client';
  const requestId = quote.requestId || 'LLD-2026-000001';
  const service = quote.service || 'Embroidery Digitizing';
  const turnaround = quote.turnaround || 'Standard';
  const isRush = Boolean(quote.isRush || /rush|express/i.test(turnaround));

  const timestamp = quote.createdAt ? new Date(quote.createdAt).toISOString() : new Date().toISOString();
  const formattedTime = new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }) + ' IST';
  const dashboardUrl = `${env.CLIENT_URL || 'https://looplayerdesign.com'}/admin/quotes/${quote._id || requestId}`;

  const subject = isRush
    ? `⚡ [RUSH ORDER] New Quote Request — ${requestId}`
    : `New Quote Request — ${requestId}`;

  const detailRows = [
    { label: 'Order ID', value: requestId, isHighlighted: true },
    {
      label: 'Turnaround Priority',
      value: isRush ? `<span style="color: #DC2626; font-weight: 700;">⚡ ${turnaround} (RUSH)</span>` : turnaround,
      isHighlighted: isRush,
    },
    { label: 'Timestamp', value: `${formattedTime} (${timestamp})` },
    { label: 'Name', value: customerName },
    { label: 'Email', value: quote.customer?.email || '-' },
    { label: 'Phone', value: quote.customer?.phone || '-' },
    { label: 'Country', value: quote.customer?.country || '-' },
    { label: 'Selected Service', value: service },
  ];

  if (quote.dimensions?.width && quote.dimensions?.height) {
    detailRows.push({
      label: 'Dimensions',
      value: `${quote.dimensions.width} &times; ${quote.dimensions.height} ${quote.dimensions.unit || 'in'}`,
    });
  }

  // Uploaded files list (check both quote.files and quote.uploadedFiles)
  const allFiles = quote.files?.length > 0 ? quote.files : quote.uploadedFiles || [];
  let filesHtml = '<p style="font-size: 13px; color: #64748B; font-style: italic; margin: 0;">No files attached.</p>';
  if (allFiles && allFiles.length > 0) {
    const listItems = allFiles
      .map(
        (f) => `
        <li style="margin-bottom: 8px; font-size: 13px; line-height: 20px;">
          <a href="${f.url}" target="_blank" rel="noopener noreferrer" style="color: #2563EB; font-weight: 600; text-decoration: underline;">
            ${f.filename || f.originalName}
          </a>
          <span style="color: #64748B;"> &bull; ${Math.round((f.size || f.fileSize || 0) / 1024)} KB &bull; Type: ${f.type || f.mime || f.format || 'file'}</span>
          <br />
          <span style="font-size: 11px; color: #94A3B8;">Cloudinary: <a href="${f.url}" target="_blank" style="color: #64748B;">${f.url}</a></span>
        </li>
      `
      )
      .join('');
    filesHtml = `<ul style="margin: 0; padding-left: 20px; color: #334155;">${listItems}</ul>`;
  }

  const alertBadgeHtml = isRush
    ? `
      <div style="margin-bottom: 18px;">
        <span style="display: inline-block; background-color: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; font-size: 12px; font-weight: 800; padding: 5px 14px; border-radius: 9999px; letter-spacing: 0.5px;">
          🚨 RUSH ORDER &bull; PRIORITY ATTENTION REQUIRED
        </span>
      </div>
    `
    : `
      <div style="margin-bottom: 18px;">
        <span style="display: inline-block; background-color: #FEF3C7; border: 1px solid #FDE68A; color: #B45309; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.3px;">
          Production Alert &bull; New Quote
        </span>
      </div>
    `;

  const bodyContent = `
    <!-- Top Alert Badge -->
    ${alertBadgeHtml}

    <h1 style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 14px 0; letter-spacing: -0.3px;">
      ${isRush ? '⚡ Rush Quote Request:' : 'New Quote Request Received:'} <span style="color: #2563EB;">${requestId}</span>
    </h1>

    <p style="font-size: 15px; color: #334155; line-height: 24px; margin: 0 0 20px 0;">
      ${
        isRush
          ? '<strong>CRITICAL:</strong> A client has requested <strong>Rush Turnaround</strong> for embroidery digitizing. Review files immediately.'
          : 'A new customer project has been submitted via the website and requires digitizer estimation.'
      }
    </p>

    <!-- Specifications Table -->
    <div style="margin: 20px 0 16px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        Submission Specifications
      </div>
      ${Table(detailRows)}
    </div>

    <!-- Project Notes / Requirements -->
    ${InfoCard(
      `
        <div style="font-size: 12px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
          Customer Project Requirements
        </div>
        <div style="font-size: 14px; color: #334155; line-height: 22px; white-space: pre-wrap;">
          ${quote.projectRequirements || 'None specified.'}
        </div>
      `,
      {
        accentColor: isRush ? '#DC2626' : '#F97316',
        backgroundColor: isRush ? '#FEF2F2' : '#FFFBEB',
        borderColor: isRush ? '#FECACA' : '#FDE68A',
      }
    )}

    <!-- Uploaded Files Section -->
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
        Uploaded Artwork Files (${allFiles.length})
      </div>
      ${filesHtml}
    </div>

    <!-- CTA to Open Dashboard -->
    <div style="margin: 28px 0 16px 0;">
      ${PrimaryButton('Open In Dashboard', dashboardUrl, 'center')}
    </div>

    ${Divider(24)}

    <div style="font-size: 12px; color: #94A3B8; text-align: center;">
      Direct customer reply can also be handled within the LoopLayer admin console.
    </div>
  `;

  const html = EmailLayout({
    title: subject,
    previewText: `${isRush ? '⚡ [RUSH] ' : ''}New quote ${requestId} submitted by ${customerName} for ${service}. Priority: ${turnaround}`,
    content: bodyContent,
  });

  const text = `
${isRush ? '⚡ [RUSH ORDER] ' : ''}New Quote Request / Order ID: ${requestId}
Priority / Turnaround: ${turnaround}${isRush ? ' (RUSH PRIORITY)' : ''}
Timestamp: ${timestamp}
Service: ${service}
Customer: ${customerName}
Email: ${quote.customer?.email || '-'}
Phone: ${quote.customer?.phone || '-'}
Country: ${quote.customer?.country || '-'}

Requirements:
${quote.projectRequirements || 'None'}

Files: ${allFiles.length} attached.
${allFiles.map((f, i) => `${i + 1}. ${f.filename || f.originalName} (${Math.round((f.size || f.fileSize || 0) / 1024)} KB) - ${f.url}`).join('\n')}

Open Dashboard: ${dashboardUrl}
  `.trim();

  return { subject, html, text };
};

export default renderQuoteNotification;
