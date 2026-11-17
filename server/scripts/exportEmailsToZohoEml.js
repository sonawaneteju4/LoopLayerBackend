import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import archiver from 'archiver';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI not found in environment');
  process.exit(1);
}

const sanitizeFilename = (str = '') => {
  return str
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50)
    .replace(/^_+|_+$/g, '');
};

const formatRecipient = (name, email) => {
  if (name && name.trim()) {
    return `"${name.trim().replace(/"/g, '')}" <${email.trim()}>`;
  }
  return email.trim();
};

const buildEml = (doc) => {
  const boundaryMixed = `----=_Part_Mixed_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const boundaryAlt = `----=_Part_Alt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const from = formatRecipient(doc.fromName, doc.fromEmail || 'unknown@looplayerdesign.com');
  const toList = Array.isArray(doc.toEmail) && doc.toEmail.length > 0 
    ? doc.toEmail.join(', ') 
    : 'orders@looplayerdesign.com';
  const ccList = Array.isArray(doc.cc) && doc.cc.length > 0 ? doc.cc.join(', ') : null;
  const bccList = Array.isArray(doc.bcc) && doc.bcc.length > 0 ? doc.bcc.join(', ') : null;
  const dateStr = (doc.receivedAt ? new Date(doc.receivedAt) : (doc.createdAt ? new Date(doc.createdAt) : new Date())).toUTCString();
  const subject = doc.subject || '(No Subject)';
  const msgId = doc.messageId || `<${doc._id || Date.now()}@looplayerdesign.com>`;
  const replyTo = doc.replyTo || null;

  const hasAttachments = Array.isArray(doc.attachments) && doc.attachments.length > 0;
  const textContent = doc.textBody || (doc.htmlBody ? doc.htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');
  const htmlContent = doc.htmlBody || (doc.textBody ? `<pre>${doc.textBody}</pre>` : '<p></p>');

  let eml = '';

  // Top-level headers
  eml += `From: ${from}\r\n`;
  eml += `To: ${toList}\r\n`;
  if (ccList) eml += `Cc: ${ccList}\r\n`;
  if (bccList) eml += `Bcc: ${bccList}\r\n`;
  if (replyTo) eml += `Reply-To: ${replyTo}\r\n`;
  eml += `Date: ${dateStr}\r\n`;
  eml += `Subject: ${subject}\r\n`;
  eml += `Message-ID: ${msgId}\r\n`;
  eml += `MIME-Version: 1.0\r\n`;

  if (hasAttachments) {
    eml += `Content-Type: multipart/mixed; boundary="${boundaryMixed}"\r\n\r\n`;
    eml += `--${boundaryMixed}\r\n`;
    eml += `Content-Type: multipart/alternative; boundary="${boundaryAlt}"\r\n\r\n`;
  } else {
    eml += `Content-Type: multipart/alternative; boundary="${boundaryAlt}"\r\n\r\n`;
  }

  // Plain text part
  eml += `--${boundaryAlt}\r\n`;
  eml += `Content-Type: text/plain; charset=UTF-8\r\n`;
  eml += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
  eml += `${textContent}\r\n\r\n`;

  // HTML part
  eml += `--${boundaryAlt}\r\n`;
  eml += `Content-Type: text/html; charset=UTF-8\r\n`;
  eml += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
  eml += `${htmlContent}\r\n\r\n`;
  eml += `--${boundaryAlt}--\r\n`;

  // Attachment parts (if any)
  if (hasAttachments) {
    for (const att of doc.attachments) {
      eml += `\r\n--${boundaryMixed}\r\n`;
      const filename = att.filename || 'attachment';
      const mime = att.mime || att.type || 'application/octet-stream';
      eml += `Content-Type: ${mime}; name="${filename}"\r\n`;
      eml += `Content-Disposition: attachment; filename="${filename}"\r\n`;

      if (att.content) {
        eml += `Content-Transfer-Encoding: base64\r\n\r\n`;
        // Wrap base64 lines at 76 chars
        const base64Str = att.content.replace(/\s+/g, '');
        const wrapped = base64Str.match(/.{1,76}/g)?.join('\r\n') || base64Str;
        eml += `${wrapped}\r\n`;
      } else if (att.url) {
        eml += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
        eml += `[Attachment URL: ${att.url}]\r\n`;
      } else {
        eml += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
        eml += `[Attachment: ${filename}]\r\n`;
      }
    }
    eml += `\r\n--${boundaryMixed}--\r\n`;
  }

  return eml;
};

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const collection = mongoose.connection.collection('inboundemails');
  const count = await collection.countDocuments();
  console.log(`Found ${count} inbound emails to export.`);

  if (count === 0) {
    console.log('No emails found in database.');
    await mongoose.disconnect();
    return;
  }

  const exportDir = path.resolve(__dirname, '../exports/zoho-mail-eml');
  const zipPath = path.resolve(__dirname, '../exports/zoho-mail-migration.zip');

  if (fs.existsSync(exportDir)) {
    fs.rmSync(exportDir, { recursive: true, force: true });
  }
  fs.mkdirSync(exportDir, { recursive: true });

  const cursor = collection.find({}).sort({ receivedAt: 1, createdAt: 1 });
  let index = 0;

  console.log('Generating .eml files...');
  for await (const doc of cursor) {
    index++;
    const safeSub = sanitizeFilename(doc.subject || 'no_subject');
    const dateStr = (doc.receivedAt ? new Date(doc.receivedAt) : new Date())
      .toISOString()
      .replace(/[:.]/g, '-');
    const filename = `${String(index).padStart(3, '0')}_${dateStr}_${safeSub}.eml`;
    const filePath = path.join(exportDir, filename);

    const emlContent = buildEml(doc);
    fs.writeFileSync(filePath, emlContent, 'utf8');
  }

  console.log(`Generated ${index} .eml files in: ${exportDir}`);
  console.log('Packaging into ZIP file for Zoho Mail import...');

  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  await new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`Successfully created ZIP archive: ${zipPath} (${(archive.pointer() / 1024).toFixed(1)} KB)`);
      resolve();
    });
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(exportDir, false);
    archive.finalize();
  });

  await mongoose.disconnect();
  console.log('\n==================================================');
  console.log('  ZOHO MAIL MIGRATION EXPORT COMPLETE');
  console.log('==================================================');
  console.log(`ZIP file created at:`);
  console.log(zipPath);
  console.log(`Individual .eml folder:`);
  console.log(exportDir);
  console.log('\nHow to import into Zoho Mail:');
  console.log('1. Open https://mail.zoho.com (or https://mail.zoho.in)');
  console.log('2. Click Settings (gear icon) -> "Import / Export Emails"');
  console.log('3. Under "Import", select folder (e.g. Inbox) and upload the ZIP file.');
  console.log('==================================================\n');
}

run().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});

