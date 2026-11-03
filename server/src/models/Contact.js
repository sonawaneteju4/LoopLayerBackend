import mongoose from 'mongoose';

const contactReplySchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    sentBy: {
      type: String,
      default: 'Admin',
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    messageId: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const contactNoteSchema = new mongoose.Schema(
  {
    note: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      default: 'Admin',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['New', 'Read', 'Replied', 'Archived'],
      default: 'New',
      index: true,
    },
    replies: [contactReplySchema],
    internalNotes: [contactNoteSchema],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({
  name: 'text',
  email: 'text',
  subject: 'text',
  message: 'text',
});

export const Contact = mongoose.model('Contact', contactSchema);
export default Contact;

