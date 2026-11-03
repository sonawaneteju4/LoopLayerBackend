import mongoose from 'mongoose';

const emailAttachmentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    size: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const emailLogSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: [true, 'Recipient email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    recipientName: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: [true, 'Email subject is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'quote_confirmation',
        'quote_notification',
        'contact_confirmation',
        'contact_notification',
        'admin_reply',
        'custom',
      ],
      required: [true, 'Email type is required'],
      index: true,
    },
    relatedId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    relatedType: {
      type: String,
      enum: ['Quote', 'Contact', 'Direct', 'System'],
      default: 'System',
      index: true,
    },
    htmlContent: {
      type: String,
      required: true,
    },
    textContent: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Delivered', 'Failed'],
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 1,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    messageId: {
      type: String,
      trim: true,
      default: null,
    },
    attachments: [emailAttachmentSchema],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for performant history filtering and analytics
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ type: 1, createdAt: -1 });
emailLogSchema.index({ recipient: 1, createdAt: -1 });
emailLogSchema.index({ relatedId: 1, createdAt: -1 });
emailLogSchema.index({
  recipient: 'text',
  subject: 'text',
  recipientName: 'text',
});

export const EmailLog = mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;
