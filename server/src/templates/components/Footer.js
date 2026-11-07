import env from '../../config/env.js';

/**
 * Footer Component
 * Specifications:
 * - LoopLayer Designs
 * - Nagpur, Maharashtra
 * - orders@looplayerdesign.com
 * - Website
 * - Social Links (placeholder)
 * - Copyright
 * - Privacy Notice
 */
export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const websiteUrl = env.CLIENT_URL || 'https://looplayerdesign.com';
  const supportEmail = env.SMTP.FROM_EMAIL || 'orders@looplayerdesign.com';

  return `
    <tr>
      <td style="padding: 32px 32px 36px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align: center;">
              <!-- Company Info -->
              <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; color: #0F172A; letter-spacing: -0.2px;">
                LoopLayer Designs
              </div>
              <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #64748B; margin-top: 4px; line-height: 20px;">
                Nagpur, Maharashtra &bull; <a href="mailto:${supportEmail}" style="color: #2563EB; text-decoration: none;">${supportEmail}</a>
              </div>

              <!-- Quick Links & Social Placeholders -->
              <div style="margin-top: 14px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #94A3B8;">
                <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563EB; text-decoration: none; font-weight: 500; margin: 0 8px;">Website</a>
                <span style="color: #CBD5E1;">&bull;</span>
                <a href="${websiteUrl}/services" target="_blank" rel="noopener noreferrer" style="color: #64748B; text-decoration: none; margin: 0 8px;">Services</a>
                <span style="color: #CBD5E1;">&bull;</span>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style="color: #64748B; text-decoration: none; margin: 0 8px;">Instagram</a>
                <span style="color: #CBD5E1;">&bull;</span>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style="color: #64748B; text-decoration: none; margin: 0 8px;">LinkedIn</a>
              </div>

              <!-- Copyright & Privacy Notice -->
              <div style="margin-top: 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #94A3B8; line-height: 18px;">
                &copy; ${currentYear} LoopLayer Designs. All rights reserved.<br>
                This email was sent to you regarding your inquiry or quote request with LoopLayer Designs.<br>
                <a href="${websiteUrl}/privacy" target="_blank" rel="noopener noreferrer" style="color: #94A3B8; text-decoration: underline;">Privacy Policy</a> &bull; <a href="${websiteUrl}/terms" target="_blank" rel="noopener noreferrer" style="color: #94A3B8; text-decoration: underline;">Terms of Service</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
};

export default Footer;

