/**
 * Primary CTA Button Component (Bulletproof table-based button)
 *
 * @param {string} text - Button label
 * @param {string} href - Target URL
 * @param {string} [align='center'] - Alignment ('center', 'left', 'right')
 */
export const PrimaryButton = (text, href, align = 'center') => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}" style="margin: 24px ${align === 'center' ? 'auto' : '0'};">
    <tr>
      <td align="center" style="border-radius: 8px; background-color: #2563EB;">
        <a href="${href}" target="_blank" rel="noopener noreferrer" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 13px 28px; display: inline-block; border-radius: 8px; border: 1px solid #2563EB; letter-spacing: 0.2px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>
`;

export default PrimaryButton;

