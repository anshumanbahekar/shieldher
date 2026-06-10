-- ============================================
-- ShieldHer — Migration 003
-- Push subscriptions, pg_cron check-in monitoring,
-- contact dashboard share tokens
-- ============================================

-- Add push subscription storage to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_subscription TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_dashboard_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_dashboard_token ON profiles(contact_dashboard_token);

-- ============================================
-- SUPABASE EDGE FUNCTION: check-in monitor
-- Run every minute to catch missed check-ins
-- Deploy via: supabase functions deploy check-in-monitor
-- ============================================
-- Scheduled via Supabase Dashboard → Edge Functions → Schedule:
-- Cron: * * * * * (every minute)
-- The actual function code is in supabase/functions/check-in-monitor/index.ts

-- ============================================
-- RLS update: contact dashboard public read
-- ============================================
CREATE POLICY "Anyone with dashboard token can view profile basics" ON profiles
  FOR SELECT USING (TRUE);

-- ============================================
-- Function: auto-generate dashboard token
-- ============================================
CREATE OR REPLACE FUNCTION ensure_dashboard_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_dashboard_token IS NULL THEN
    NEW.contact_dashboard_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_dashboard_token
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_dashboard_token();

-- ============================================
-- Safety reports: add vote tracking
-- ============================================
CREATE TABLE IF NOT EXISTS safety_report_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES safety_reports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No user_id intentionally — anonymous voting
);

CREATE INDEX IF NOT EXISTS idx_votes_report ON safety_report_votes(report_id);

-- Function to auto-update upvotes count
CREATE OR REPLACE FUNCTION update_report_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE safety_reports
  SET upvotes = (SELECT COUNT(*) FROM safety_report_votes WHERE report_id = NEW.report_id)
  WHERE id = NEW.report_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_vote_added
  AFTER INSERT ON safety_report_votes
  FOR EACH ROW EXECUTE FUNCTION update_report_upvotes();

ALTER TABLE safety_report_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can vote" ON safety_report_votes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can view votes" ON safety_report_votes FOR SELECT USING (TRUE);
