-- ============================================================================
-- COMPREHENSIVE CRM DATABASE SCHEMA UPDATES
-- ============================================================================
-- This migration adds missing columns, fixes constraints, and ensures
-- proper relationships across all tables
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. CREATE ENUM TYPES IF NOT EXISTS
-- ============================================================================

-- Create messages_direction_enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE messages_direction_enum AS ENUM ('in', 'out');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create messages_channel_enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE messages_channel_enum AS ENUM ('sms', 'email', 'whatsapp', 'call');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 1. CREATE TWILIO_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS twilio_settings (
    id SERIAL PRIMARY KEY,
    account_sid VARCHAR(255) NOT NULL,
    auth_token VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    webhook_url VARCHAR(500),
    active BOOLEAN DEFAULT TRUE,
    user_id INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_twilio_settings_user_id ON twilio_settings(user_id);

-- ============================================================================
-- 2. LEADS TABLE UPDATES
-- ============================================================================

-- Add substatus column for granular status tracking
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS substatus VARCHAR(255);

-- Add email tracking columns
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_email_opened_at TIMESTAMP;

-- Add audit columns if missing
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_leads_substatus ON leads(substatus);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- Add comments
COMMENT ON COLUMN leads.substatus IS 'Optional substatus for more granular lead tracking within main status categories';
COMMENT ON COLUMN leads.last_email_sent_at IS 'Timestamp of the last email sent to this lead';
COMMENT ON COLUMN leads.email_count IS 'Total number of emails sent to this lead';

-- ============================================================================
-- 2. FILES TABLE UPDATES
-- ============================================================================

-- Add file path column for proper storage tracking
ALTER TABLE files
ADD COLUMN IF NOT EXISTS file_path VARCHAR(500);

-- Add file metadata columns
ALTER TABLE files
ADD COLUMN IF NOT EXISTS original_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_extension VARCHAR(10),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Update existing records to have file_path from url
UPDATE files 
SET file_path = url 
WHERE file_path IS NULL AND url IS NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_files_lead_id ON files(lead_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_type ON files(type);

-- Add comments
COMMENT ON COLUMN files.file_path IS 'Relative path to file in uploads directory';
COMMENT ON COLUMN files.original_name IS 'Original filename as uploaded by user';

-- ============================================================================
-- 3. MESSAGES TABLE UPDATES (Email Tracking)
-- ============================================================================

-- Add email-specific columns
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS subject VARCHAR(500),
ADD COLUMN IF NOT EXISTS from_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS to_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS cc_emails TEXT,
ADD COLUMN IF NOT EXISTS bcc_emails TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB,
ADD COLUMN IF NOT EXISTS email_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);

-- Add comments
COMMENT ON COLUMN messages.subject IS 'Email subject line (for email channel only)';
COMMENT ON COLUMN messages.email_status IS 'Email delivery status: sent, delivered, opened, clicked, bounced, failed';

-- ============================================================================
-- 4. ACTIVITIES TABLE UPDATES (Tasks)
-- ============================================================================

-- Add task-specific columns
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Add constraint for priority
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'activities_priority_check'
    ) THEN
        ALTER TABLE activities 
        ADD CONSTRAINT activities_priority_check 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    END IF;
END$$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_due_at ON activities(due_at);
CREATE INDEX IF NOT EXISTS idx_activities_completed ON activities(completed);

-- ============================================================================
-- 5. MEETINGS TABLE UPDATES
-- ============================================================================

-- Add meeting metadata columns
ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by INTEGER,
ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500),
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Add foreign key for updated_by
ALTER TABLE meetings
ADD CONSTRAINT fk_meetings_updated_by 
FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_meetings_lead_id ON meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);

-- ============================================================================
-- 6. DEALS TABLE UPDATES
-- ============================================================================

-- Add audit columns
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_by INTEGER,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;

-- Add foreign key
ALTER TABLE deals
ADD CONSTRAINT fk_deals_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_deals_lead_id ON deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_id ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);

COMMIT;

