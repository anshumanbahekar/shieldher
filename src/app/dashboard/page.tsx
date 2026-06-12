"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SOSButton } from "@/components/sos/SOSButton";
import { SOSActiveOverlay } from "@/components/sos/SOSActiveOverlay";
import { DisguiseCalculator } from "@/components/disguise/Calculator";
import { useLocation } from "@/lib/hooks/useLocation";
import { useUserStore, useUIStore, useLocationStore } from "@/stores";
import { Analytics } from "@/lib/analytics/novus";
import { formatBattery } from "@/lib/utils";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/journey", label: "Journey", icon: "🗺️" },
  { href: "/companion", label: "AI Help", icon: "🤖" },
  { href: "/map", label: "Map", icon: "📍" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

const QUICK_ACTIONS = [
  { href: "/fake-call", label: "Fake Call", icon: "📞", color: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  { href: "/journey", label: "Journey", icon: "🚶‍♀️", color: "bg-green-500/10 border-green-500/20 text-green-400" },
  { href: "/journal", label: "Journal", icon: "📔", color: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
  { href: "/contacts", label: "Circle", icon: "👥", color: "bg-orange-500/10 border-orange-500/20 text-orange-400" },
  { href: "/emergency", label: "Emergency", icon: "🆘", color: "bg-red-500/10 border-red-500/20 text-red-400" },
  { href: "/companion", label: "AI Help", icon: "🤖", color: "bg-shield-500/10 border-shield-500/20 text-shield-400" },
];

export default function DashboardPage() {
  const [checkInMinutes, setCheckInMinutes] = useState(30);
  const [activeCheckIn, setActiveCheckIn] = useState<any>(null);
  const [checkInLabel, setCheckInLabel] = useState("");
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showShareDashboard, setShowShareDashboard] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const { profile, contacts } = useUserStore();
  const { isDisguiseModeActive } = useUIStore();
  const { latitude, longitude, batteryLevel, error: locationError } = useLocation({ enabled: true });

  // Track page view
  useEffect(() => { Analytics.page("Dashboard"); }, []);

  // Check-in countdown
  useEffect(() => {
    if (!activeCheckIn) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((new Date(activeCheckIn.safe_by).getTime() - Date.now()) / 60000));
      setTimeLeft(left);
      if (left === 0) {
        setActiveCheckIn(null);
        setTimeLeft(null);
        Analytics.checkInMissed();

        // Pendo Track Event
        if (typeof pendo !== "undefined") {
          pendo.track("Check-in Missed", {
            duration_minutes: checkInMinutes,
          });
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeCheckIn]);

  const startCheckIn = async () => {
    setCheckingIn(true);
    const res = await fetch("/api/check-in/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: checkInLabel || `Check-in at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        safe_by_minutes: checkInMinutes,
        contact_ids: contacts.filter((c) => c.role === "first_responder").map((c) => c.id),
      }),
    });
    const { data } = await res.json();
    setActiveCheckIn(data);
    setTimeLeft(checkInMinutes);
    setShowCheckIn(false);
    setCheckingIn(false);
    Analytics.checkInStarted(checkInMinutes);

    // Pendo Track Event
    if (typeof pendo !== "undefined") {
      pendo.track("Check-in Started", {
        duration_minutes: checkInMinutes,
        has_label: !!checkInLabel,
        contact_count: contacts.filter((c) => c.role === "first_responder").length,
      });
    }
  };

  const confirmSafe = async () => {
    if (!activeCheckIn) return;
    await fetch("/api/check-in/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ check_in_id: activeCheckIn.check_in_id }),
    });
    setActiveCheckIn(null);
    setTimeLeft(null);
    Analytics.checkInConfirmed();

    // Pendo Track Event
    if (typeof pendo !== "undefined") {
      pendo.track("Check-in Confirmed", {
        time_remaining_minutes: timeLeft ?? 0,
        check_in_id: activeCheckIn?.check_in_id,
      });
    }

    if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
  };

  const copyDashboardLink = () => {
    if (!profile) return;
    const url = `${window.location.origin}/contact-dashboard/${(profile as any).contact_dashboard_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Pendo Track Event
    if (typeof pendo !== "undefined") {
      pendo.track("Dashboard Link Shared", {
        share_method: "clipboard",
      });
    }
  };

  if (isDisguiseModeActive) return <DisguiseCalculator />;

  return (
    <div className="min-h-dvh bg-night-950 flex flex-col pb-safe">
      <SOSActiveOverlay />

      {/* Header */}
      <div className="pt-safe px-5 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-night-500 text-xs">Welcome back</p>
            <h1 className="font-display font-bold text-white text-xl">
              {profile?.full_name?.split(" ")[0] ?? "ShieldHer"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-night-800 px-3 py-1.5 rounded-full border border-white/5">
              <span className="text-xs">{batteryLevel !== null ? `🔋 ${batteryLevel}%` : "🔋 --"}</span>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${latitude ? "bg-safe-DEFAULT/20" : "bg-warn-DEFAULT/20"}`}>
              <span className="text-sm">{latitude ? "📡" : "⚠️"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active check-in banner */}
      <AnimatePresence>
        {activeCheckIn && (
          <motion.div
            className="mx-4 mt-3 bg-warn-DEFAULT/10 border border-warn-DEFAULT/30 rounded-2xl px-4 py-3 flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          >
            <motion.div className="w-3 h-3 rounded-full bg-warn-DEFAULT"
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            <div className="flex-1">
              <p className="text-warn-DEFAULT font-semibold text-sm">Check-in active</p>
              <p className="text-warn-DEFAULT/70 text-xs">{timeLeft} min remaining</p>
            </div>
            <button onClick={confirmSafe}
              className="px-3 py-1.5 rounded-lg bg-safe-DEFAULT text-white text-xs font-bold">
              I'm Safe ✓
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {locationError && (
        <div className="mx-4 mt-3 bg-danger-DEFAULT/10 border border-danger-DEFAULT/20 rounded-xl px-3 py-2">
          <p className="text-danger-DEFAULT text-xs">{locationError}</p>
        </div>
      )}

      {/* SOS Button */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 gap-3">
        <SOSButton />
        <p className="text-night-500 text-xs">Hold 2 seconds to activate SOS</p>
        <p className="text-night-600 text-xs">Shake 3× · Say "{profile?.voice_trigger_phrase ?? "help me now"}"</p>
      </div>

      {/* Quick actions */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href + action.label} href={action.href}
              className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border ${action.color} text-center`}>
              <span className="text-2xl">{action.icon}</span>
              <span className="text-xs font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom row — check-in + share dashboard */}
      <div className="px-4 mb-3 flex gap-2">
        <button onClick={() => setShowCheckIn(true)}
          className="flex-1 glass rounded-2xl px-3 py-3 flex items-center gap-2 border border-white/5">
          <span className="text-xl">⏱️</span>
          <div className="text-left">
            <p className="text-white font-medium text-xs">Check-in Timer</p>
            <p className="text-night-500 text-xs">Alert if no reply</p>
          </div>
        </button>
        <button onClick={() => setShowShareDashboard(true)}
          className="flex-1 glass rounded-2xl px-3 py-3 flex items-center gap-2 border border-white/5">
          <span className="text-xl">🔗</span>
          <div className="text-left">
            <p className="text-white font-medium text-xs">Share Dashboard</p>
            <p className="text-night-500 text-xs">Let circle monitor you</p>
          </div>
        </button>
      </div>

      {/* Check-in sheet */}
      <AnimatePresence>
        {showCheckIn && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCheckIn(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 bg-night-900 rounded-t-3xl px-5 pt-6 pb-safe pb-8 border-t border-white/10"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}>
              <h2 className="font-display font-bold text-white text-lg mb-4">Check-in Timer</h2>
              <div className="space-y-4">
                <input className="input-dark" placeholder="Label (e.g. Walking home)" value={checkInLabel} onChange={(e) => setCheckInLabel(e.target.value)} />
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-night-400 text-sm">Alert if no check-in in</p>
                    <p className="text-shield-400 font-bold">{checkInMinutes} min</p>
                  </div>
                  <input type="range" min={5} max={180} step={5} value={checkInMinutes}
                    onChange={(e) => setCheckInMinutes(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-night-600 text-xs mt-1"><span>5 min</span><span>3 hours</span></div>
                </div>
                <button onClick={startCheckIn} disabled={checkingIn} className="btn-primary w-full disabled:opacity-40">
                  {checkingIn ? "Starting..." : `Start ${checkInMinutes}-minute timer`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Share dashboard sheet — Gap 5 */}
      <AnimatePresence>
        {showShareDashboard && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowShareDashboard(false)} />
            <motion.div className="fixed bottom-0 left-0 right-0 z-50 bg-night-900 rounded-t-3xl px-5 pt-6 pb-safe pb-8 border-t border-white/10"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}>
              <h2 className="font-display font-bold text-white text-lg mb-2">Share Your Dashboard</h2>
              <p className="text-night-400 text-sm mb-5">
                Send this link to your trusted circle. They'll see your live status — active SOS, journeys, and check-ins — in real time. No login required for them.
              </p>
              <div className="bg-night-800 rounded-xl px-4 py-3 border border-white/5 mb-4">
                <p className="text-night-500 text-xs mb-1">Your dashboard link</p>
                <p className="text-shield-400 text-sm font-mono break-all">
                  {typeof window !== "undefined" && profile
                    ? `${window.location.origin}/contact-dashboard/${(profile as any).contact_dashboard_token ?? "..."}`
                    : "Loading..."}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={copyDashboardLink}
                  className={`flex-1 py-4 rounded-2xl font-medium text-sm transition-all ${copied ? "bg-safe-DEFAULT text-white" : "btn-primary"}`}>
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={() => {
                    if (!profile) return;
                    const url = `${window.location.origin}/contact-dashboard/${(profile as any).contact_dashboard_token}`;
                    if (navigator.share) {
                      navigator.share({ title: "ShieldHer Dashboard", text: "Monitor my safety in real-time", url });

                      // Pendo Track Event
                      if (typeof pendo !== "undefined") {
                        pendo.track("Dashboard Link Shared", {
                          share_method: "native_share",
                        });
                      }
                    }
                  }}
                  className="flex-1 btn-ghost py-4 rounded-2xl text-sm">
                  Share via...
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav */}
      <nav className="border-t border-white/5 px-2 py-2">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl">
              <span className="text-xl">{item.icon}</span>
              <span className="text-night-500 text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
