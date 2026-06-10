"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useUserStore, useUIStore } from "@/stores";
import type { Profile } from "@/lib/types";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${value ? "bg-shield-500" : "bg-night-700"}`}
    >
      <motion.div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
        animate={{ left: value ? "calc(100% - 22px)" : "2px" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-4 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-night-500 text-xs mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-night-500 text-xs uppercase tracking-widest px-4 mb-1">{title}</p>
      <div className="bg-night-800 rounded-2xl px-4 border border-white/5">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { profile, setProfile } = useUserStore();
  const { activateDisguise, deactivateDisguise, isDisguiseModeActive } = useUIStore();
  const supabase = createClient();

  const [sosMessage, setSosMessage] = useState(profile?.sos_message ?? "");
  const [voicePhrase, setVoicePhrase] = useState(profile?.voice_trigger_phrase ?? "help me now");
  const [voiceEnabled, setVoiceEnabled] = useState(profile?.voice_sos_enabled ?? false);
  const [shakeSensitivity, setShakeSensitivity] = useState(profile?.shake_sensitivity ?? 5);
  const [disguiseEnabled, setDisguiseEnabled] = useState(profile?.disguise_mode_enabled ?? false);
  const [disguiseType, setDisguiseType] = useState<"calculator" | "notes" | "weather">(profile?.disguise_type ?? "calculator");
  const [checkInDefault, setCheckInDefault] = useState(profile?.check_in_default_minutes ?? 30);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const save = async (updates: Partial<Profile>) => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single();
    if (data) setProfile(data as Profile);
    setIsSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const saveAll = () => save({
    sos_message: sosMessage,
    voice_trigger_phrase: voicePhrase,
    voice_sos_enabled: voiceEnabled,
    shake_sensitivity: shakeSensitivity,
    disguise_mode_enabled: disguiseEnabled,
    disguise_type: disguiseType,
    check_in_default_minutes: checkInDefault,
  });

  return (
    <div className="min-h-dvh bg-night-950 pb-safe">
      {/* Header */}
      <div className="pt-safe px-5 pt-5 pb-4 border-b border-white/5 flex items-center justify-between">
        <h1 className="font-display font-bold text-white text-xl">Settings</h1>
        <AnimatePresence>
          {savedFlash && (
            <motion.span
              className="text-safe-DEFAULT text-sm font-medium"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              ✓ Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 py-4">

        {/* SOS Configuration */}
        <Section title="SOS Triggers">
          <SettingRow
            label="Shake to SOS"
            description="Shake your phone 3 times rapidly to trigger SOS"
          >
            <Toggle value={true} onChange={() => {}} />
          </SettingRow>

          <SettingRow label="Shake sensitivity" description={`Current: ${shakeSensitivity === 1 ? "Very low" : shakeSensitivity <= 3 ? "Low" : shakeSensitivity <= 6 ? "Medium" : shakeSensitivity <= 8 ? "High" : "Very high"}`}>
            <div className="flex items-center gap-2 w-32">
              <input
                type="range" min={1} max={10} value={shakeSensitivity}
                onChange={(e) => setShakeSensitivity(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-shield-400 text-xs w-4 text-right">{shakeSensitivity}</span>
            </div>
          </SettingRow>

          <SettingRow
            label="Voice SOS"
            description="Say your trigger phrase hands-free to activate SOS"
          >
            <Toggle
              value={voiceEnabled}
              onChange={(v) => { setVoiceEnabled(v); save({ voice_sos_enabled: v }); }}
            />
          </SettingRow>

          {voiceEnabled && (
            <motion.div
              className="pb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <p className="text-night-500 text-xs mb-2">Trigger phrase (say this to activate SOS)</p>
              <input
                className="input-dark text-sm"
                value={voicePhrase}
                onChange={(e) => setVoicePhrase(e.target.value)}
                placeholder="e.g. help me now"
              />
            </motion.div>
          )}
        </Section>

        {/* SOS Message */}
        <Section title="SOS Alert">
          <div className="py-4">
            <p className="text-white text-sm font-medium mb-1">Alert message</p>
            <p className="text-night-500 text-xs mb-3">Sent to your trusted circle with your location</p>
            <textarea
              className="input-dark text-sm min-h-[80px] resize-none w-full"
              value={sosMessage}
              onChange={(e) => setSosMessage(e.target.value)}
              maxLength={300}
            />
            <p className="text-right text-night-600 text-xs mt-1">{sosMessage.length}/300</p>
          </div>
        </Section>

        {/* Check-in defaults */}
        <Section title="Check-in Timer">
          <SettingRow
            label="Default timer duration"
            description={`${checkInDefault} minutes — used when you create a quick check-in`}
          >
            <div className="flex items-center gap-2 w-36">
              <input
                type="range" min={5} max={120} step={5} value={checkInDefault}
                onChange={(e) => setCheckInDefault(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-shield-400 text-xs w-8 text-right">{checkInDefault}m</span>
            </div>
          </SettingRow>
        </Section>

        {/* Disguise Mode */}
        <Section title="Disguise Mode">
          <SettingRow
            label="Enable disguise mode"
            description="Hide ShieldHer behind a fake app. Enter panic PIN in the disguise to trigger SOS."
          >
            <Toggle
              value={disguiseEnabled}
              onChange={(v) => { setDisguiseEnabled(v); if (v) activateDisguise(); else deactivateDisguise(); }}
            />
          </SettingRow>

          {disguiseEnabled && (
            <motion.div
              className="pb-4 space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-night-500 text-xs">Disguise as</p>
              <div className="flex gap-2">
                {(["calculator", "notes", "weather"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDisguiseType(type)}
                    className={`flex-1 py-2 rounded-xl text-sm capitalize transition-all ${disguiseType === type ? "bg-shield-500 text-white" : "bg-night-700 text-night-400"}`}
                  >
                    {type === "calculator" ? "🧮" : type === "notes" ? "📝" : "🌤️"} {type}
                  </button>
                ))}
              </div>
              <p className="text-night-600 text-xs">
                Panic PIN: type <span className="text-shield-400 font-mono">0000=</span> in the disguise to silently trigger SOS
              </p>
            </motion.div>
          )}
        </Section>

        {/* Account */}
        <Section title="Account">
          <SettingRow label="Name" description={profile?.full_name}>
            <span className="text-night-600 text-xs">Edit profile →</span>
          </SettingRow>
          <SettingRow label="Phone" description={profile?.phone ?? "Not set"}>
            <span className="text-night-600 text-xs" />
          </SettingRow>
          <SettingRow label="Country" description={profile?.country_code}>
            <span className="text-night-600 text-xs" />
          </SettingRow>
        </Section>

        {/* Danger zone */}
        <Section title="Account Actions">
          <SettingRow label="Sign out" description="You'll need to sign in again">
            <button
              onClick={async () => { await createClient().auth.signOut(); window.location.href = "/"; }}
              className="text-danger-DEFAULT text-sm font-medium"
            >
              Sign out
            </button>
          </SettingRow>
        </Section>

        {/* Save button */}
        <button
          onClick={saveAll}
          disabled={isSaving}
          className="btn-primary w-full mt-2 disabled:opacity-40"
        >
          {isSaving ? "Saving..." : "Save All Settings"}
        </button>

        <p className="text-center text-night-600 text-xs mt-4 mb-8">ShieldHer v1.0 · World Product Day 2026</p>
      </div>
    </div>
  );
}
