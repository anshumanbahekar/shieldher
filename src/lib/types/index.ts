// ============================================
// ShieldHer — Core TypeScript Types
// ============================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// --- User Profile ---
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  country_code: string;
  emergency_number: string;
  sos_message: string;
  disguise_mode_enabled: boolean;
  disguise_type: "calculator" | "notes" | "weather";
  shake_sensitivity: number; // 1-10
  voice_trigger_phrase?: string;
  voice_sos_enabled: boolean;
  check_in_default_minutes: number;
  created_at: string;
  updated_at: string;
}

// --- Trusted Contact ---
export type ContactRole = "first_responder" | "silent_watcher" | "emergency_only";
export type AlertMethod = "sms" | "whatsapp" | "email" | "all";

export interface TrustedContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  role: ContactRole;
  alert_method: AlertMethod;
  language: string; // BCP-47 locale
  priority: number; // 1 = highest
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
}

// --- SOS Alert ---
export type SOSStatus = "active" | "acknowledged" | "resolved" | "false_alarm";
export type SOSTrigger = "button" | "shake" | "voice" | "timer" | "manual";

export interface SOSAlert {
  id: string;
  user_id: string;
  status: SOSStatus;
  trigger: SOSTrigger;
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  battery_level?: number;
  message?: string;
  contacts_notified: string[]; // contact IDs
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
}

// --- Live Location ---
export interface LocationPing {
  id: string;
  user_id: string;
  session_id: string; // journey or SOS session
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
  created_at: string;
}

// --- Journey ---
export type JourneyStatus = "active" | "completed" | "deviated" | "sos_triggered";

export interface Journey {
  id: string;
  user_id: string;
  title: string;
  origin_address: string;
  destination_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  expected_arrival: string;
  status: JourneyStatus;
  share_token: string; // public share link token
  contacts_sharing_with: string[];
  deviation_threshold_meters: number;
  route_polyline?: string; // encoded polyline
  started_at: string;
  completed_at?: string;
  created_at: string;
}

// --- Check-in Timer ---
export type CheckInStatus = "active" | "checked_in" | "missed" | "cancelled";

export interface CheckIn {
  id: string;
  user_id: string;
  label?: string;
  safe_by: string; // ISO datetime
  custom_message?: string;
  contacts_to_alert: string[];
  status: CheckInStatus;
  snoozed_until?: string;
  created_at: string;
}

// --- Incident Journal ---
export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content_encrypted: string; // AES-256 encrypted
  latitude?: number;
  longitude?: number;
  address?: string;
  severity: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  media_urls: string[]; // encrypted storage refs
  created_at: string;
  updated_at: string;
}

// --- Safety Map Report ---
export type ReportType = "harassment" | "poor_lighting" | "unsafe_area" | "theft" | "assault" | "other";

export interface SafetyReport {
  id: string;
  latitude: number;
  longitude: number;
  report_type: ReportType;
  description?: string;
  time_of_day: "morning" | "afternoon" | "evening" | "night" | "any";
  upvotes: number;
  created_at: string;
  // user_id intentionally excluded for anonymity
}

// --- Fake Call Config ---
export interface FakeCallConfig {
  id: string;
  user_id: string;
  caller_name: string;
  caller_photo_url?: string;
  ringtone: string;
  conversation_audio_url: string;
  script: FakeCallScript[];
  ambient_sound?: "office" | "cafe" | "street" | "home" | "none";
  default_delay_seconds: number; // how long before call "rings"
}

export interface FakeCallScript {
  timestamp_seconds: number;
  speaker: "caller" | "you";
  text: string;
}

// --- Emergency Numbers DB ---
export interface EmergencyNumber {
  country_code: string; // ISO 3166-1 alpha-2
  country_name: string;
  police: string;
  ambulance: string;
  fire: string;
  women_helpline?: string;
  general_emergency?: string;
}

// --- Companion Chat ---
export interface CompanionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// --- Real-time Subscription Payloads ---
export interface SOSRealtimePayload {
  alert: SOSAlert;
  user: Pick<Profile, "id" | "full_name" | "phone" | "avatar_url">;
  location: LocationPing;
}

export interface JourneyRealtimePayload {
  journey: Journey;
  latest_location: LocationPing;
  eta_minutes: number;
  deviated: boolean;
}

// --- API Response wrappers ---
export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: { message: string; code: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
