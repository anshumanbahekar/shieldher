"use client";
// ============================================
// /track/[token] — Public contact tracking page
// No login required. Real-time location updates.
// Contacts see live map, acknowledge, call emergency.
// ============================================

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { SOSAlert, LocationPing, Profile } from "@/lib/types";
import { getTimeAgo, formatBattery } from "@/lib/utils";

interface TrackingData {
  alert: SOSAlert;
  user: Pick<Profile, "full_name" | "phone" | "avatar_url">;
  latestPing: LocationPing | null;
}

interface TrackPageClientProps {
  alertId: string;
  initialData: TrackingData;
}

export default function TrackPageClient({ alertId, initialData }: TrackPageClientProps) {
  const [data, setData] = useState(initialData);
  const [acknowledged, setAcknowledged] = useState(
    initialData.alert.status === "acknowledged"
  );
  const [contactName, setContactName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [pingHistory, setPingHistory] = useState<LocationPing[]>(
    initialData.latestPing ? [initialData.latestPing] : []
  );

  const supabase = createClient();

  // Real-time subscription for location updates
  useEffect(() => {
    if (data.alert.status === "resolved") return;

    const channel = supabase
      .channel(`track-${alertId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "location_pings",
          filter: `session_id=eq.${alertId}`,
        },
        (payload) => {
          const ping = payload.new as LocationPing;
          setPingHistory((prev) => [ping, ...prev.slice(0, 49)]); // Keep last 50
          setData((prev) => ({ ...prev, latestPing: ping }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sos_alerts",
          filter: `id=eq.${alertId}`,
        },
        (payload) => {
          setData((prev) => ({ ...prev, alert: payload.new as SOSAlert }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [alertId, data.alert.status]);

  const acknowledge = useCallback(async () => {
    if (!contactName.trim()) {
      setShowNameInput(true);
      return;
    }

    await fetch("/api/sos/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: alertId, contact_name: contactName }),
    });

    setAcknowledged(true);
    setShowNameInput(false);
  }, [alertId, contactName]);

  const isResolved = data.alert.status === "resolved";
  const ping = data.latestPing;

  return (
    <div className="min-h-dvh bg-night-950 text-white flex flex-col">
      {/* Status bar */}
      <div
        className={`px-5 py-4 flex items-center gap-3 ${
          isResolved
            ? "bg-safe-DEFAULT/10 border-b border-safe-DEFAULT/20"
            : "bg-shield-600/10 border-b border-shield-500/20"
        }`}
      >
        {!isResolved && (
          <motion.div
            className="w-2.5 h-2.5 rounded-full bg-danger-DEFAULT"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
        {isResolved && (
          <div className="w-2.5 h-2.5 rounded-full bg-safe-DEFAULT" />
        )}
        <span className={`font-bold text-sm tracking-wide ${isResolved ? "text-safe-DEFAULT" : "text-danger-DEFAULT"}`}>
          {isResolved ? "ALERT RESOLVED — She's safe" : "LIVE SOS ALERT"}
        </span>
        <span className="ml-auto text-night-500 text-xs">
          {getTimeAgo(data.alert.created_at)}
        </span>
      </div>

      {/* User info */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-shield-500/20 border-2 border-shield-500/40 flex items-center justify-center">
            <span className="text-shield-300 font-bold text-lg">
              {data.user.full_name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white">
              {data.user.full_name}
            </h1>
            <p className="text-night-400 text-sm mt-0.5">
              Triggered via {data.alert.trigger} •{" "}
              {new Date(data.alert.created_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Live location */}
      <div className="px-5 py-4 border-b border-white/5">
        <p className="text-night-500 text-xs uppercase tracking-widest mb-3">
          Live Location
        </p>
        {ping ? (
          <div className="space-y-3">
            <div className="bg-night-800 rounded-2xl p-4 border border-white/5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-night-500 text-xs mb-1">Latitude</p>
                  <p className="text-white font-mono">{ping.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-night-500 text-xs mb-1">Longitude</p>
                  <p className="text-white font-mono">{ping.longitude.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-night-500 text-xs mb-1">Battery</p>
                  <p className="text-white">{formatBattery(ping.battery_level)}</p>
                </div>
                <div>
                  <p className="text-night-500 text-xs mb-1">Updated</p>
                  <p className="text-white">{getTimeAgo(ping.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Open in maps */}
            <a
              href={`https://maps.google.com/?q=${ping.latitude},${ping.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-night-800 border border-white/10 text-night-200 text-sm font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor"/>
              </svg>
              Open in Google Maps
            </a>
          </div>
        ) : (
          <div className="bg-night-800 rounded-2xl p-4 border border-white/5 text-center">
            <motion.div
              className="w-6 h-6 border-2 border-night-600 border-t-shield-500 rounded-full mx-auto mb-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-night-400 text-sm">Waiting for location...</p>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      {!isResolved && (
        <div className="px-5 pb-8 pt-4 space-y-3">
          {/* Acknowledge */}
          <AnimatePresence>
            {!acknowledged ? (
              <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {showNameInput && (
                  <input
                    className="w-full bg-night-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-night-500 text-sm outline-none focus:border-shield-500"
                    placeholder="Your name (so she knows who responded)"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && acknowledge()}
                    autoFocus
                  />
                )}
                <button
                  onClick={acknowledge}
                  className="w-full py-4 rounded-2xl bg-safe-DEFAULT text-white font-semibold text-base"
                >
                  ✓ I'm on my way
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full py-4 rounded-2xl bg-safe-DEFAULT/10 border border-safe-DEFAULT/30 text-safe-DEFAULT font-medium text-center"
              >
                ✓ Alert acknowledged
              </motion.div>
            )}
          </AnimatePresence>

          {/* Call her */}
          <a
            href={`tel:${data.user.phone}`}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-night-800 border border-white/10 text-white font-medium text-base"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="currentColor"/>
            </svg>
            Call {data.user.full_name.split(" ")[0]}
          </a>

          {/* Call emergency */}
          <a
            href="tel:112"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-danger-DEFAULT/10 border border-danger-DEFAULT/30 text-danger-DEFAULT font-medium text-base"
          >
            Call Emergency Services (112)
          </a>
        </div>
      )}

      {/* Resolved state */}
      {isResolved && (
        <div className="px-5 pb-8 pt-4 text-center">
          <div className="w-16 h-16 rounded-full bg-safe-DEFAULT/20 border border-safe-DEFAULT/40 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#00C48C" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-safe-DEFAULT font-bold text-lg font-display">She's safe now</p>
          <p className="text-night-400 text-sm mt-2">
            Alert resolved at{" "}
            {data.alert.resolved_at
              ? new Date(data.alert.resolved_at).toLocaleTimeString()
              : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
