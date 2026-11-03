import mongoose from 'mongoose';

const uploadedFileSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true, // in bytes
    },
    format: {
      type: String,
      trim: true,
    },
    resourceType: {
      type: String,
      default: 'image',
      trim: true,
    },
  },
  { _id: true }
);

const internalNoteSchema = new mongoose.Schema(
  {
    note: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      default: 'Admin',
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const emailLogSchema = new mongoose.Schema(
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
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        filename: String,
        url: String,
      },
    ],
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

const quoteSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: [true, 'Request ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    customer: {
      firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
      },
      lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Customer email is required'],
        lowercase: true,
        trim: true,
        index: true,
      },
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
        index: true,
      },
    },
    service: {
      type: String,
      required: [true, 'Service selected is required'],
      trim: true,
      index: true,
    },
    dimensions: {
      width: {
        type: Number,
        default: null,
      },
      height: {
        type: Number,
        default: null,
      },
      unit: {
        type: String,
        enum: ['in', 'cm', 'mm', 'px'],
        default: 'in',
      },
    },
    projectRequirements: {
      type: String,
      required: [true, 'Project requirements are required'],
      trim: true,
    },
    uploadedFiles: [uploadedFileSchema],
    status: {
      type: String,
      enum: ['Pending', 'Reviewing', 'In Progress', 'Completed', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    internalNotes: [internalNoteSchema],
    emailHistory: [emailLogSchema],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound and auxiliary indexes for blazing-fast dashboard search and filtering
quoteSchema.index({ status: 1, createdAt: -1 });
quoteSchema.index({ service: 1, createdAt: -1 });
quoteSchema.index({
  requestId: 'text',
  'customer.firstName': 'text',
  'customer.lastName': 'text',
  'customer.email': 'text',
  service: 'text',
  projectRequirements: 'text',
});

export const Quote = mongoose.model('Quote', quoteSchema);
export default Quote;
