-- Migration: Add company column to inquiries table
-- Created by: Supabase CLI
-- Date: 2025-11-17 17:15:54

-- Add company column to inquiries table
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS company TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_inquiries_company ON inquiries(company);

-- Add comment for documentation
COMMENT ON COLUMN inquiries.company IS 'Company Name';
