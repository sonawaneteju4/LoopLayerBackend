-- ==============================================================================
-- LOOPLAYER DESIGNS - INBOUND EMAIL INBOX DATABASE MIGRATION
-- Target Database: PostgreSQL / Supabase
-- Description: Creates the inbound emails table, attachments jsonb, performance
--              indexes, full-text search, and Row Level Security (RLS) policies.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Inbound Emails Table
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT UNIQUE,
    resend_id TEXT,
    from_email TEXT NOT NULL,
    from_name TEXT DEFAULT '',
    to_email TEXT[] NOT NULL,
    cc TEXT[] DEFAULT '{}',
    bcc TEXT[] DEFAULT '{}',
    reply_to TEXT DEFAULT '',
    subject TEXT DEFAULT '(No Subject)',
    text_body TEXT DEFAULT '',
    html_body TEXT DEFAULT '',
    attachments JSONB DEFAULT '[]'::jsonb,
    headers JSONB DEFAULT '{}'::jsonb,
    spam_score NUMERIC(5,2) DEFAULT 0.00,
    status TEXT DEFAULT 'received' CHECK (status IN ('received', 'archived', 'spam', 'trash')),
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance B-Tree Indexes for Filtering, Sorting, and Deduplication
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON emails (from_email);
CREATE INDEX IF NOT EXISTS idx_emails_subject ON emails (subject);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails (is_read);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails (status);
CREATE INDEX IF NOT EXISTS idx_emails_status_received_at ON emails (status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_unread_inbox ON emails (is_read, received_at DESC) WHERE is_read = FALSE;

-- 3. GIN Full-Text Search Index across Subject, Text Body, and Sender
CREATE INDEX IF NOT EXISTS idx_emails_fts ON emails USING GIN (
    to_tsvector('english', 
        coalesce(subject, '') || ' ' || 
        coalesce(from_name, '') || ' ' || 
        coalesce(from_email, '') || ' ' || 
        coalesce(text_body, '')
    )
);

-- 4. Automatic updated_at Timestamp Trigger
CREATE OR REPLACE FUNCTION update_inbound_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_emails_updated_at ON emails;
CREATE TRIGGER trigger_emails_updated_at
    BEFORE UPDATE ON emails
    FOR EACH ROW
    EXECUTE FUNCTION update_inbound_emails_updated_at();

-- 5. Row Level Security (RLS) Policies
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admin users full access
CREATE POLICY admin_full_access_emails ON emails
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'authenticated')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'authenticated');

-- Service role bypass (for webhook ingestion)
CREATE POLICY service_role_webhook_insert ON emails
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- Comment documentation
COMMENT ON TABLE emails IS 'Stores inbound emails received via Resend Inbound Webhook for the LoopLayer Designs Admin Inbox';
COMMENT ON COLUMN emails.message_id IS 'Unique RFC Message-ID header preventing duplicate deliveries';
COMMENT ON COLUMN emails.attachments IS 'JSONB array of attachment metadata: [{id, filename, url, size, mime}]';

