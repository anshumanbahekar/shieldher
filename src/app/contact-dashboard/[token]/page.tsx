"use client";
// ============================================
// /contact-dashboard/[userId]
// What trusted contacts see — live status,
// active alerts, journeys, check-ins
// No login required for contacts
// ============================================
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getTimeAgo, formatBattery } from "@/lib/utils";

interface DashboardData {
  profile: { full_name: string; avatar_url?: string; phone: string };
  activeAlert: any | null;
  activeJourney: any | null;
  activeCheckIn: any | null;
  latestPing: any | null;
}

export default function ContactDashboardPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactName, setContactName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadDashboard();
  }, [params.token]);

  const loadDashboard = async () => {
    // Token is userId for contact dashboard (hashed in production)
    const userId = params.token;

    const [profileRes, alertRes, journeyRes, checkInRes] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url, phone").eq("id", userId).single(),
      supabase.from("sos_alerts").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("journeys").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("check_ins").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).single(),
    ]);

    let latestPing = null;
    const sessionId = alertRes.data?.id ?? journeyRes.data?.id;
    if (sessionId) {
      const { data: ping } = await supabase.from("location_pings").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }).limit(1).single();
      latestPing = ping;
    }

    setData({
      profile: profileRes.data ?? { full_name: "Unknown", phone: "" },
      activeAlert: alertRes.data ?? null,
      activeJourney: journeyRes.data ?? null,
      activeCheckIn: checkInRes.data ?? null,
      latestPing,
    });
    setLoading(false);

    // Subscribe to realtime updates
    supabase.channel(`contact-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sos_alerts", filter: `user_id=eq.${userId}` },
        () => loadDashboard())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_pings" },
        (payload) => setData((prev) => prev ? { ...prev, latestPing: payload.new } : prev))
      .subscribe();
  };

  const acknowledgeAlert = async () => {
    if (!data?.activeAlert || !contactName.trim()) return;
    await fetch("/api/sos/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: data.activeAlert.id, contact_name: contactName }),
    });
    setAcknowledged(true);

    // Pendo Track Event
    if (typeof pendo !== "undefined") {
      pendo.track("SOS Alert Acknowledged", {
        alert_id: data.activeAlert.id,
        contact_name: contactName,
      });
    }
  };

  if (loading) return (
    <div className="min-h-dvh bg-night-950 flex items-center justify-center">
      <motion.div className="w-8 h-8 border-2 border-shield-500/30 border-t-shield-500 rounded-full"
        animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
    </div>
  );

  if (!data) return (
    <div className="min-h-dvh bg-night-950 flex items-center justify-center px-6 text-center">
      <div>
        <div className="text-5xl mb-4">🔒</div>
        <p className="text-white font-display font-bold text-xl mb-2">Dashboard not found</p>
        <p className="text-night-400 text-sm">This link may have expired or been removed.</p>
      </div>
    </div>
  );

  const { profile, activeAlert, activeJourney, activeCheckIn, latestPing } = data;
  const hasActiveEvent = activeAlert || activeJourney || activeCheckIn;

  return (
    <div className="min-h-dvh bg-night-950 flex flex-col">
      {/* Header */}
      <div className={`px-5 py-4 border-b ${activeAlert ? "bg-danger-DEFAULT/10 border-danger-DEFAULT/20" : "border-white/5"}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-shield-500/20 border border-shield-500/30 flex items-center justify-center">
            <span className="font-bold text-shield-300 text-base">{profile.full_name.slice(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-lg">{profile.full_name}</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${activeAlert ? "bg-danger-DEFAULT" : hasActiveEvent ? "bg-warn-DEFAULT" : "bg-safe-DEFAULT"}`} />
              <span className={`text-xs font-medium ${activeAlert ? "text-danger-DEFAULT" : hasActiveEvent ? "text-warn-DEFAULT" : "text-safe-DEFAULT"}`}>
                {activeAlert ? "SOS ACTIVE" : activeJourney ? "On a journey" : activeCheckIn ? "Check-in timer active" : "Safe"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">

        {/* SOS Alert card */}
        <AnimatePresence>
          {activeAlert && (
            <motion.div
              className="bg-danger-DEFAULT/10 border border-danger-DEFAULT/30 rounded-2xl p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <motion.div className="w-3 h-3 rounded-full bg-danger-DEFAULT"
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                <span className="text-danger-DEFAULT font-bold text-sm">EMERGENCY SOS</span>
                <span className="ml-auto text-night-500 text-xs">{getTimeAgo(activeAlert.created_at)}</span>
              </div>

              {latestPing && (
                <a href={`https://maps.google.com/?q=${latestPing.latitude},${latestPing.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-night-800 rounded-xl px-3 py-2.5 mb-3 border border-white/5"
                >
                  <span>📍</span>
                  <div className="flex-1">
                    <p className="text-white text-xs font-medium">Live location</p>
                    <p className="text-night-400 text-xs">{latestPing.latitude.toFixed(5)}, {latestPing.longitude.toFixed(5)}</p>
                  </div>
                  <span className="text-night-500 text-xs">{getTimeAgo(latestPing.created_at)}</span>
                </a>
              )}

              {activeAlert.message && (
                <p className="text-night-300 text-sm bg-night-800 rounded-xl px-3 py-2.5 mb-3 border border-white/5">
                  "{activeAlert.message}"
                </p>
              )}

              {!acknowledged ? (
                <div className="space-y-2">
                  <input
                    className="input-dark text-sm"
                    placeholder="Your name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                  <button onClick={acknowledgeAlert} disabled={!contactName.trim()}
                    className="btn-primary w-full disabled:opacity-40">
                    I'm responding ✓
                  </button>
                </div>
              ) : (
                <div className="bg-safe-DEFAULT/10 border border-safe-DEFAULT/30 rounded-xl px-4 py-3 text-center">
                  <p className="text-safe-DEFAULT font-medium text-sm">✓ Alert acknowledged</p>
                </div>
              )}

              <a href={`tel:${profile.phone}`}
                className="flex items-center justify-center gap-2 w-full py-3 mt-2 rounded-xl bg-night-800 border border-white/10 text-white text-sm font-medium">
                📞 Call {profile.full_name.split(" ")[0]}
              </a>
              <a href="tel:112"
                className="flex items-center justify-center gap-2 w-full py-3 mt-2 rounded-xl bg-danger-DEFAULT/10 border border-danger-DEFAULT/30 text-danger-DEFAULT text-sm font-medium">
                Call Emergency Services (112)
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Journey card */}
        <AnimatePresence>
          {activeJourney && !activeAlert && (
            <motion.div className="bg-night-800 border border-white/5 rounded-2xl p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🚶‍♀️</span>
                <span className="text-white font-semibold text-sm">Active Journey</span>
                <motion.div className="ml-auto w-2 h-2 rounded-full bg-safe-DEFAULT"
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              </div>
              <p className="text-night-300 text-sm mb-1">Heading to: <span className="text-white font-medium">{activeJourney.destination_address}</span></p>
              <p className="text-night-400 text-sm">ETA: {new Date(activeJourney.expected_arrival).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              {latestPing && (
                <a href={`https://maps.google.com/?q=${latestPing.latitude},${latestPing.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 mt-3 bg-night-700 rounded-xl px-3 py-2 border border-white/5 text-sm text-night-300">
                  📍 View live location · Updated {getTimeAgo(latestPing.created_at)}
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Check-in card */}
        <AnimatePresence>
          {activeCheckIn && !activeAlert && (
            <motion.div className="bg-warn-DEFAULT/10 border border-warn-DEFAULT/30 rounded-2xl p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⏱️</span>
                <span className="text-warn-DEFAULT font-semibold text-sm">Check-in timer active</span>
              </div>
              <p className="text-night-300 text-sm">
                {profile.full_name.split(" ")[0]} set a check-in timer.
                If they don't confirm safety by{" "}
                <span className="text-white font-medium">
                  {new Date(activeCheckIn.safe_by).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                , you'll be alerted.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* All clear */}
        {!hasActiveEvent && (
          <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-20 h-20 rounded-full bg-safe-DEFAULT/20 border-2 border-safe-DEFAULT/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✓</span>
            </div>
            <p className="text-safe-DEFAULT font-display font-bold text-xl">All clear</p>
            <p className="text-night-400 text-sm mt-2">{profile.full_name} has no active alerts or journeys.</p>
            <p className="text-night-600 text-xs mt-4">This page updates in real-time. You'll see alerts here immediately.</p>
          </motion.div>
        )}
      </div>

      <div className="px-5 pb-safe pb-6 text-center">
        <p className="text-night-700 text-xs">Powered by ShieldHer · Real-time women's safety</p>
      </div>
    </div>
  );
}
