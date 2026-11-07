/**
 * Inbound Email Attachment definition
 */
export interface InboundEmailAttachment {
  id?: string;
  filename: string;
  url?: string;
  size: number;
  mime: string;
  content?: string; // base64
  contentId?: string;
}

/**
 * Inbound Email Status
 */
export type InboundEmailStatus = 'received' | 'archived' | 'spam' | 'trash';

/**
 * Filter categories for Admin Inbox
 */
export type InboundEmailFilter =
  | 'all'
  | 'unread'
  | 'read'
  | 'today'
  | 'last_7_days'
  | 'with_attachments'
  | 'spam'
  | 'archived'
  | 'starred'
  | 'trash';

/**
 * Complete Inbound Email record
 */
export interface InboundEmail {
  _id: string;
  id?: string;
  messageId: string;
  resendId?: string;
  fromEmail: string;
  fromName: string;
  toEmail: string[];
  cc: string[];
  bcc: string[];
  replyTo?: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  attachments: InboundEmailAttachment[];
  headers: Record<string, string | string[]>;
  spamScore: number;
  status: InboundEmailStatus;
  isRead: boolean;
  isStarred: boolean;
  receivedAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  rawPayload?: Record<string, any>;
}

/**
 * Live aggregate stats for badge counters
 */
export interface InboxStats {
  all: number;
  unread: number;
  read: number;
  today: number;
  last7Days: number;
  withAttachments: number;
  spam: number;
  archived: number;
  starred: number;
}

/**
 * Resend Inbound Webhook Event structure
 */
export interface ResendInboundWebhookPayload {
  type: 'email.received' | string;
  created_at: string;
  data: {
    email_id?: string;
    id?: string;
    message_id?: string;
    created_at?: string;
    from: string | { email: string; name?: string };
    to: string[] | string;
    cc?: string[] | string;
    bcc?: string[] | string;
    reply_to?: string[] | string;
    subject?: string;
    html?: string;
    html_body?: string;
    text?: string;
    text_body?: string;
    headers?: Record<string, string>;
    attachments?: Array<{
      id?: string;
      filename: string;
      content_type: string;
      size: number;
      content?: string;
      download_url?: string;
    }>;
    spam_score?: number;
    spam_status?: string;
  };
}

/**
 * Bulk action operations
 */
export type BulkEmailAction =
  | 'mark_read'
  | 'mark_unread'
  | 'archive'
  | 'unarchive'
  | 'spam'
  | 'star'
  | 'unstar'
  | 'trash'
  | 'delete';

