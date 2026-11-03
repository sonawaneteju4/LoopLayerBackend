/**
 * InfoCard Component
 *
 * @param {string} content - HTML content inside card
 * @param {Object} [options={}] - Options (accentColor, title, badge)
 */
export const InfoCard = (content, options = {}) => {
  const {
    accentColor = '#2563EB', // Secondary brand blue or Accent #F97316
    backgroundColor = '#F8FAFC',
    borderColor = '#E2E8F0',
    title = null,
    badge = null,
  } = options;

  const headerHtml =
    title || badge
      ? `
    <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
      ${title ? `<span style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px;">${title}</span>` : ''}
      ${badge ? `<span style="background-color: #DBEAFE; color: #1D4ED8; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; font-family: 'Inter', sans-serif;">${badge}</span>` : ''}
    </div>
  `
      : '';

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td style="background-color: ${backgroundColor}; border: 1px solid ${borderColor}; border-left: 4px solid ${accentColor}; border-radius: 8px; padding: 18px 20px;">
          ${headerHtml}
          ${content}
        </td>
      </tr>
    </table>
  `;
};

export default InfoCard;
