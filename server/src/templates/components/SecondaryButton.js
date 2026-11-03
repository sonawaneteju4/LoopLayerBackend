/**
 * Secondary CTA Button Component
 *
 * @param {string} text - Button label
 * @param {string} href - Target URL
 * @param {string} [align='center'] - Alignment ('center', 'left', 'right')
 */
export const SecondaryButton = (text, href, align = 'center') => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}" style="margin: 16px ${align === 'center' ? 'auto' : '0'};">
    <tr>
      <td align="center" style="border-radius: 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1;">
        <a href="${href}" target="_blank" rel="noopener noreferrer" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #0F172A; text-decoration: none; padding: 10px 22px; display: inline-block; border-radius: 8px; letter-spacing: 0.1px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>
`;

export default SecondaryButton;
