/**
 * Table / Key-Value Grid Component for Email specs
 *
 * @param {Array<{label: string, value: string, isHighlighted?: boolean}>} rows
 */
export const Table = (rows = []) => {
  if (!rows || rows.length === 0) return '';

  const rowsHtml = rows
    .map(
      (row, idx) => `
      <tr>
        <td style="padding: 10px 14px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #64748B; font-weight: 500; border-bottom: ${idx === rows.length - 1 ? 'none' : '1px solid #E2E8F0'}; width: 38%; vertical-align: top;">
          ${row.label}
        </td>
        <td style="padding: 10px 14px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #0F172A; font-weight: ${row.isHighlighted ? '700' : '600'}; text-align: right; border-bottom: ${idx === rows.length - 1 ? 'none' : '1px solid #E2E8F0'}; vertical-align: top;">
          ${row.value}
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; margin: 16px 0; overflow: hidden;">
      ${rowsHtml}
    </table>
  `;
};

export default Table;
