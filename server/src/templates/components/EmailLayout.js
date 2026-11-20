import Header from './Header.js';
import Footer from './Footer.js';

/**
 * Master EmailLayout Component
 *
 * @param {Object} params
 * @param {string} params.title - Page & preview title
 * @param {string} params.previewText - Preheader snippet text
 * @param {string} params.content - Body HTML
 * @param {boolean} [params.showHeader=true] - Whether to render header
 * @param {boolean} [params.showFooter=true] - Whether to render footer
 * @returns {string} Complete HTML Document
 */
export const EmailLayout = ({
  title,
  previewText = '',
  content,
  showHeader = true,
  showFooter = true,
}) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
  
  <style>
    /* Reset & Base */
    html, body {
      margin: 0 auto !important;
      padding: 0 !important;
      height: 100% !important;
      width: 100% !important;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    * {
      box-sizing: border-box;
    }
    table, td {
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }
    table {
      border-spacing: 0 !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      margin: 0 auto !important;
    }
    img {
      max-width: 100%;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    a {
      text-decoration: none;
      color: #2563EB;
    }
    p, h1, h2, h3, h4, ul, li {
      margin: 0;
      padding: 0;
    }
    
    /* Responsive styling */
    @media only screen and (max-width: 640px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
      }
      .mobile-padding {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #F8FAFC; -webkit-text-size-adjust: 100%;">
  ${
    previewText
      ? `<div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
          ${previewText}
          &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        </div>`
      : ''
  }

  <center style="width: 100%; background-color: #F8FAFC;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC;">
      <tr>
        <td align="center" style="padding: 12px 10px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden;">
            ${showHeader ? Header() : ''}

            <!-- Body Content -->
            <tr>
              <td class="mobile-padding" style="padding: 28px 32px 28px 32px; background-color: #FFFFFF; color: #1E293B; line-height: 1.6; font-size: 15px; text-align: left;">
                ${content}
              </td>
            </tr>

            ${showFooter ? Footer() : ''}
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
`;

export default EmailLayout;
