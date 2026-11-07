import mongoose from 'mongoose';

/**
 * Inbound Email Attachment Schema
 */
const inboundAttachmentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      trim: true,
      default: '',
    },
    filename: {
      type: String,
      required: true,
      trim: true,
      default: 'attachment',
    },
    url: {
      type: String,
      trim: true,
      default: '',
    },
    size: {
      type: Number,
      default: 0,
    },
    mime: {
      type: String,
      trim: true,
      default: 'application/octet-stream',
    },
    content: {
      type: String, // Base64 content if delivered directly in webhook
      select: false, // Don't return full heavy base64 by default in list queries
    },
    contentId: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

/**
 * Inbound Email Schema
 * Modeled after Resend Inbound Receiving format & industry standard email inbox structures.
 */
const inboundEmailSchema = new mongoose.Schema(
  {
    // Unique email Message-ID header (or Resend email_id) for strict deduplication
    messageId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    resendId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },

    // Sender Details
    fromEmail: {
      type: String,
      required: [true, 'Sender email address is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    fromName: {
      type: String,
      trim: true,
      default: '',
    },

    // Recipient Lists
    toEmail: {
      type: [String],
      required: true,
      default: [],
      index: true,
    },
    cc: {
      type: [String],
      default: [],
    },
    bcc: {
      type: [String],
      default: [],
    },
    replyTo: {
      type: String,
      trim: true,
      default: '',
    },

    // Email Content
    subject: {
      type: String,
      trim: true,
      default: '(No Subject)',
      index: true,
    },
    textBody: {
      type: String,
      default: '',
    },
    htmlBody: {
      type: String,
      default: '',
    },

    // Attachments & Headers
    attachments: {
      type: [inboundAttachmentSchema],
      default: [],
    },
    headers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Security & Spam Scoring
    spamScore: {
      type: Number,
      default: 0,
      index: true,
    },

    // Inbox Workflow State
    status: {
      type: String,
      enum: ['received', 'archived', 'spam', 'trash'],
      default: 'received',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isStarred: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Timestamps
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Raw JSON payload for developer inspection
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      select: false, // Omit from standard queries; load explicitly via .select('+rawPayload')
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for high-speed admin inbox filtering and sorting
inboundEmailSchema.index({ status: 1, receivedAt: -1 });
inboundEmailSchema.index({ isRead: 1, receivedAt: -1 });
inboundEmailSchema.index({ fromEmail: 1, receivedAt: -1 });
inboundEmailSchema.index({ isStarred: 1, receivedAt: -1 });

// Full text search index across subject, text body, sender email, and name
inboundEmailSchema.index(
  {
    subject: 'text',
    textBody: 'text',
    fromEmail: 'text',
    fromName: 'text',
  },
  {
    weights: {
      subject: 10,
      fromName: 5,
      fromEmail: 5,
      textBody: 1,
    },
    name: 'inbound_email_text_search',
  }
);

const InboundEmail = mongoose.model('InboundEmail', inboundEmailSchema);

export default InboundEmail;
