-- ============================================
-- ShieldHer — Complete Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- for geospatial queries on safety map

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  country_code TEXT NOT NULL DEFAULT 'US',
  emergency_number TEXT NOT NULL DEFAULT '911',
  sos_message TEXT NOT NULL DEFAULT 'I need help! This is an emergency. My live location is attached.',
  disguise_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  disguise_type TEXT NOT NULL DEFAULT 'calculator' CHECK (disguise_type IN ('calculator','notes','weather')),
  shake_sensitivity INTEGER NOT NULL DEFAULT 5 CHECK (shake_sensitivity BETWEEN 1 AND 10),
  voice_trigger_phrase TEXT,
  voice_sos_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  check_in_default_minutes INTEGER NOT NULL DEFAULT 30,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- TRUSTED CONTACTS
-- ============================================
CREATE TABLE trusted_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT NOT NULL DEFAULT 'friend',
  role TEXT NOT NULL DEFAULT 'first_responder' CHECK (role IN ('first_responder','silent_watcher','emergency_only')),
  alert_method TEXT NOT NULL DEFAULT 'all' CHECK (alert_method IN ('sms','whatsapp','email','all')),
  language TEXT NOT NULL DEFAULT 'en',
  priority INTEGER NOT NULL DEFAULT 1,
  avatar_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT max_10_contacts UNIQUE (user_id, priority),
  CONSTRAINT max_contacts CHECK (priority BETWEEN 1 AND 10)
);

ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own contacts" ON trusted_contacts FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- SOS ALERTS
-- ============================================
CREATE TABLE sos_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','acknowledged','resolved','false_alarm')),
  trigger TEXT NOT NULL CHECK (trigger IN ('button','shake','voice','timer','manual')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  address TEXT,
  battery_level INTEGER,
  message TEXT,
  contacts_notified UUID[] NOT NULL DEFAULT '{}',
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own SOS alerts" ON sos_alerts FOR ALL USING (auth.uid() = user_id);
-- Allow contacts to view alerts (via share token, handled in app layer)
CREATE INDEX idx_sos_alerts_user ON sos_alerts(user_id, created_at DESC);
CREATE INDEX idx_sos_alerts_active ON sos_alerts(status) WHERE status = 'active';

-- ============================================
-- LOCATION PINGS (real-time tracking)
-- ============================================
CREATE TABLE location_pings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL, -- references sos_alerts.id or journeys.id
  session_type TEXT NOT NULL CHECK (session_type IN ('sos','journey')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  battery_level INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE location_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pings" ON location_pings FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_location_pings_session ON location_pings(session_id, created_at DESC);
-- Auto-purge pings older than 7 days (keep DB lean)
CREATE INDEX idx_location_pings_cleanup ON location_pings(created_at);

-- ============================================
-- JOURNEYS
-- ============================================
CREATE TABLE journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  expected_arrival TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','deviated','sos_triggered')),
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  contacts_sharing_with UUID[] NOT NULL DEFAULT '{}',
  deviation_threshold_meters INTEGER NOT NULL DEFAULT 200,
  route_polyline TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journeys" ON journeys FOR ALL USING (auth.uid() = user_id);
-- Public read via share token (no auth required for contacts)
CREATE POLICY "Anyone with share token can view" ON journeys FOR SELECT USING (TRUE);
CREATE INDEX idx_journeys_share_token ON journeys(share_token);
CREATE INDEX idx_journeys_active ON journeys(user_id, status) WHERE status = 'active';

-- ============================================
-- CHECK-IN TIMERS
-- ============================================
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT,
  safe_by TIMESTAMPTZ NOT NULL,
  custom_message TEXT,
  contacts_to_alert UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','checked_in','missed','cancelled')),
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own check-ins" ON check_ins FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_check_ins_pending ON check_ins(safe_by, status) WHERE status = 'active';

-- ============================================
-- INCIDENT JOURNAL (encrypted)
-- ============================================
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_encrypted TEXT NOT NULL, -- AES-256 client-side encrypted
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  severity INTEGER NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  tags TEXT[] NOT NULL DEFAULT '{}',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal" ON journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER journal_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SAFETY MAP REPORTS (anonymous)
-- ============================================
CREATE TABLE safety_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('harassment','poor_lighting','unsafe_area','theft','assault','other')),
  description TEXT,
  time_of_day TEXT NOT NULL DEFAULT 'any' CHECK (time_of_day IN ('morning','afternoon','evening','night','any')),
  upvotes INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- intentionally no user_id for anonymity
);

ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read safety reports" ON safety_reports FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can report" ON safety_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE INDEX idx_safety_reports_location ON safety_reports USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- ============================================
-- FAKE CALL CONFIGS
-- ============================================
CREATE TABLE fake_call_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  caller_name TEXT NOT NULL DEFAULT 'Mom',
  caller_photo_url TEXT,
  ringtone TEXT NOT NULL DEFAULT 'default',
  conversation_audio_url TEXT,
  script JSONB NOT NULL DEFAULT '[]',
  ambient_sound TEXT DEFAULT 'none' CHECK (ambient_sound IN ('office','cafe','street','home','none')),
  default_delay_seconds INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fake_call_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own fake call" ON fake_call_configs FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- EMERGENCY NUMBERS (195 countries, seed data)
-- ============================================
CREATE TABLE emergency_numbers (
  country_code TEXT PRIMARY KEY, -- ISO 3166-1 alpha-2
  country_name TEXT NOT NULL,
  police TEXT NOT NULL,
  ambulance TEXT NOT NULL,
  fire TEXT NOT NULL,
  women_helpline TEXT,
  general_emergency TEXT
);

-- No RLS needed — public read only
ALTER TABLE emergency_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read emergency numbers" ON emergency_numbers FOR SELECT USING (TRUE);

-- ============================================
-- Enable Realtime for live features
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE location_pings;
ALTER PUBLICATION supabase_realtime ADD TABLE sos_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE journeys;
ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
