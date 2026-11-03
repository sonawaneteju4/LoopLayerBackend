import mailTransporter from '../config/mail.js';
import env from '../config/env.js';
import logger, { logEmailFailure } from '../utils/logger.js';

/**
 * Base email sending function with zero-throw safety
 * Never breaks HTTP request pipeline if SMTP server fails or times out.
 */
export const sendMail = async ({ to, subject, html, text = '', attachments = [] }) => {
  try {
    if (!env.SMTP.USER || !env.SMTP.PASS) {
      logger.warn(`[Mail] Simulated send (missing SMTP credentials) to: ${to} | Subject: "${subject}"`);
      return { success: true, simulated: true, messageId: `simulated-${Date.now()}` };
    }

    const mailOptions = {
      from: env.SMTP.FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''), // Fallback plaintext
      attachments,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    logger.info(`[Mail] Dispatched successfully to ${to} | Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logEmailFailure(to, subject, error);
    return { success: false, error: error.message };
  }
};

/**
 * Branded HTML email wrapper with modern styling
 */
const wrapEmailTemplate = (title, bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b; line-height: 1.6; }
    .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 30px; text-align: center; }
    .brand { color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; margin: 0; }
    .brand span { color: #38bdf8; }
    .header-subtitle { color: #94a3b8; font-size: 14px; margin-top: 6px; }
    .content { padding: 32px 30px; }
    .badge { display: inline-block; background: #e0f2fe; color: #0284c7; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
    .info-card { background: #f8fafc; border-left: 4px solid #0284c7; border-radius: 6px; padding: 18px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-value { color: #0f172a; font-weight: 600; text-align: right; }
    .btn { display: inline-block; background: #0284c7; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 30px; text-align: center; font-size: 13px; color: #94a3b8; }
    .footer a { color: #0284c7; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="brand">Loop<span>Layer</span> Designs</h1>
      <div class="header-subtitle">Vector Art & Embroidery Digitizing Architecture</div>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} LoopLayer Designs. All rights reserved.</p>
      <p>Have questions? Reply directly to this email or reach us at <a href="mailto:${env.SMTP.USER || 'support@looplayer.com'}">${env.SMTP.USER || 'support@looplayer.com'}</a></p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Send quote confirmation to customer
 */
export const sendQuoteConfirmationToCustomer = async (quote) => {
  const customerName = `${quote.customer.firstName} ${quote.customer.lastName}`;
  const subject = `Quote Request Received: [${quote.requestId}] - LoopLayer Designs`;

  const filesHtml = quote.uploadedFiles && quote.uploadedFiles.length > 0
    ? `<ul>${quote.uploadedFiles.map((f) => `<li>${f.originalName} (${Math.round(f.fileSize / 1024)} KB)</li>`).join('')}</ul>`
    : '<p style="color: #64748b; font-style: italic;">No files attached.</p>';

  const dimensionsText = quote.dimensions && quote.dimensions.width && quote.dimensions.height
    ? `${quote.dimensions.width} x ${quote.dimensions.height} ${quote.dimensions.unit}`
    : 'Not specified';

  const body = `
    <span class="badge">Request Confirmed</span>
    <h2 style="margin-top: 0; color: #0f172a;">Hello ${customerName},</h2>
    <p>Thank you for submitting your custom design request to LoopLayer Designs. We have received your specifications and our digitizing team has begun reviewing your project.</p>
    
    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Request ID:</span>
        <span class="info-value" style="color: #0284c7; font-family: monospace;">${quote.requestId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Service:</span>
        <span class="info-value">${quote.service}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Dimensions:</span>
        <span class="info-value">${dimensionsText}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value">${quote.status}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date Submitted:</span>
        <span class="info-value">${new Date(quote.createdAt || Date.now()).toLocaleDateString()}</span>
      </div>
    </div>

    <h3 style="color: #0f172a; margin-top: 24px; font-size: 16px;">Project Requirements</h3>
    <p style="background: #f1f5f9; padding: 14px; border-radius: 6px; font-size: 14px; white-space: pre-wrap;">${quote.projectRequirements}</p>

    <h3 style="color: #0f172a; margin-top: 24px; font-size: 16px;">Uploaded Artwork Files (${quote.uploadedFiles.length})</h3>
    ${filesHtml}

    <p style="margin-top: 24px;">Our average turnaround time for quote estimation is under <strong>2 business hours</strong>. You will receive an official estimate and project timeline shortly.</p>
  `;

  return sendMail({
    to: quote.customer.email,
    subject,
    html: wrapEmailTemplate(subject, body),
  });
};

/**
 * Send quote notification alert to admin
 */
export const sendQuoteAlertToAdmin = async (quote) => {
  const customerName = `${quote.customer.firstName} ${quote.customer.lastName}`;
  const subject = `⚡ New Quote Request: ${quote.requestId} - ${quote.service} (${customerName})`;

  const filesHtml = quote.uploadedFiles && quote.uploadedFiles.length > 0
    ? `<ul>${quote.uploadedFiles.map((f) => `<li><a href="${f.url}" target="_blank" rel="noopener noreferrer">${f.originalName}</a> (${Math.round(f.fileSize / 1024)} KB)</li>`).join('')}</ul>`
    : '<p>None</p>';

  const body = `
    <span class="badge" style="background: #fef3c7; color: #b45309;">New Admin Notification</span>
    <h2 style="margin-top: 0; color: #0f172a;">New Quote Submission: ${quote.requestId}</h2>
    
    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Customer Name:</span>
        <span class="info-value">${customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Customer Email:</span>
        <span class="info-value"><a href="mailto:${quote.customer.email}">${quote.customer.email}</a></span>
      </div>
      <div class="info-row">
        <span class="info-label">Phone:</span>
        <span class="info-value">${quote.customer.phone}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Country:</span>
        <span class="info-value">${quote.customer.country}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Service:</span>
        <span class="info-value">${quote.service}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Dimensions:</span>
        <span class="info-value">${quote.dimensions?.width || '-'} x ${quote.dimensions?.height || '-'} ${quote.dimensions?.unit || ''}</span>
      </div>
    </div>

    <h3 style="color: #0f172a; margin-top: 24px; font-size: 16px;">Requirements:</h3>
    <p style="background: #f1f5f9; padding: 14px; border-radius: 6px; font-size: 14px; white-space: pre-wrap;">${quote.projectRequirements}</p>

    <h3 style="color: #0f172a; margin-top: 24px; font-size: 16px;">Attached Files:</h3>
    ${filesHtml}
  `;

  return sendMail({
    to: env.SMTP.ADMIN_EMAIL,
    subject,
    html: wrapEmailTemplate(subject, body),
  });
};

/**
 * Send contact confirmation to customer
 */
export const sendContactConfirmationToCustomer = async (contact) => {
  const subject = `We've received your message - LoopLayer Designs`;

  const body = `
    <span class="badge">Inquiry Received</span>
    <h2 style="margin-top: 0; color: #0f172a;">Hello ${contact.name},</h2>
    <p>Thank you for reaching out to LoopLayer Designs. We have received your inquiry regarding <strong>"${contact.subject}"</strong> and our support team will get back to you shortly.</p>
    
    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Subject:</span>
        <span class="info-value">${contact.subject}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value">${contact.status}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Sent At:</span>
        <span class="info-value">${new Date().toLocaleString()}</span>
      </div>
    </div>

    <h3 style="color: #0f172a; margin-top: 24px; font-size: 16px;">Your Message:</h3>
    <p style="background: #f1f5f9; padding: 14px; border-radius: 6px; font-size: 14px; white-space: pre-wrap;">${contact.message}</p>
  `;

  return sendMail({
    to: contact.email,
    subject,
    html: wrapEmailTemplate(subject, body),
  });
};

/**
 * Send contact alert to admin
 */
export const sendContactAlertToAdmin = async (contact) => {
  const subject = `📬 New Contact Inquiry: ${contact.subject} (From: ${contact.name})`;

  const body = `
    <span class="badge" style="background: #fef3c7; color: #b45309;">New Message</span>
    <h2 style="margin-top: 0; color: #0f172a;">New Contact Inquiry</h2>
    
    <div class="info-card">
      <div class="info-row">
        <span class="info-label">From:</span>
        <span class="info-value">${contact.name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value"><a href="mailto:${contact.email}">${contact.email}</a></span>
      </div>
      <div class="info-row">
        <span class="info-label">Phone:</span>
        <span class="info-value">${contact.phone || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Subject:</span>
        <span class="info-value">${contact.subject}</span>
      </div>
    </div>

    <h3 style="color: #0f172a; margin-top: 24px; font-size: 16px;">Message:</h3>
    <p style="background: #f1f5f9; padding: 14px; border-radius: 6px; font-size: 14px; white-space: pre-wrap;">${contact.message}</p>
  `;

  return sendMail({
    to: env.SMTP.ADMIN_EMAIL,
    subject,
    html: wrapEmailTemplate(subject, body),
  });
};

/**
 * Send rich text email reply directly from admin dashboard to customer
 */
export const sendDirectCustomerEmail = async ({ to, subject, richTextMessage, attachments = [] }) => {
  const body = `
    <h2 style="margin-top: 0; color: #0f172a;">Message from LoopLayer Designs Team</h2>
    <div style="margin-top: 18px; font-size: 15px; color: #334155;">
      ${richTextMessage}
    </div>
  `;

  return sendMail({
    to,
    subject,
    html: wrapEmailTemplate(subject, body),
    attachments,
  });
};

export default {
  sendMail,
  sendQuoteConfirmationToCustomer,
  sendQuoteAlertToAdmin,
  sendContactConfirmationToCustomer,
  sendContactAlertToAdmin,
  sendDirectCustomerEmail,
};

