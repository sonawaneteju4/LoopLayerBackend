/**
 * Divider Component
 *
 * @param {number} [margin=24] - Vertical margin in pixels
 */
export const Divider = (margin = 24) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: ${margin}px 0;">
    <tr>
      <td style="border-top: 1px solid #E2E8F0; font-size: 1px; line-height: 1px;">&nbsp;</td>
    </tr>
  </table>
`;

export default Divider;
