"use client";
// Full-screen overlay shown when SOS is active
// Shows: live status, location, battery, contact acknowledgment, resolve

import { motion, AnimatePresence } from "framer-motion";
import { useSOSStore, useLocationStore, useUserStore } from "@/stores";
import { useSOS } from "@/lib/hooks/useSOS";
import { formatBattery, formatAccuracy, getTimeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function SOSActiveOverlay() {
  const { phase, activeAlert, countdownSeconds } = useSOSStore();
  const { latitude, longitude, accuracy, batteryLevel, lastUpdated } = useLocationStore();
  const { contacts } = useUserStore();
  const { initiateCancelCountdown, abortCancel } = useSOS();

  const isVisible = phase === "active" || phase === "cancelling";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 bg-night-950 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="pt-safe px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-3 h-3 rounded-full bg-danger-DEFAULT"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-danger-DEFAULT font-display font-bold text-lg tracking-wide">
                SOS ACTIVE
              </span>
              <span className="ml-auto text-night-400 text-sm">
                {lastUpdated ? getTimeAgo(lastUpdated) : "Just now"}
              </span>
            </div>
          </div>

          {/* Map preview — location indicator */}
          <div className="mx-6 rounded-2xl bg-night-800 border border-white/8 p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-shield-500/20 border border-shield-500/40 flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#E5294E"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-night-100 text-sm font-medium">
                  Live location broadcasting
                </p>
                {latitude && longitude ? (
                  <p className="text-night-400 text-xs mt-0.5 truncate">
                    {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </p>
                ) : (
                  <p className="text-warn-DEFAULT text-xs mt-0.5">Acquiring GPS...</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-night-500">
                    Accuracy: {formatAccuracy(accuracy)}
                  </span>
                  <span className="text-xs text-night-500">
                    Battery: {formatBattery(batteryLevel)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contacts notified */}
          <div className="mx-6 mb-4">
            <p className="text-night-400 text-xs uppercase tracking-widest mb-3">
              Trusted circle notified
            </p>
            <div className="space-y-2">
              {contacts.slice(0, 5).map((contact) => (
                <motion.div
                  key={contact.id}
                  className="flex items-center gap-3 bg-night-800 rounded-xl px-4 py-3 border border-white/5"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="w-8 h-8 rounded-full bg-night-700 flex items-center justify-center">
                    <span className="text-night-300 text-xs font-semibold">
                      {contact.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-night-100 text-sm font-medium">{contact.name}</p>
                    <p className="text-night-500 text-xs">{contact.relationship}</p>
                  </div>
                  <motion.div
                    className="w-2 h-2 rounded-full bg-safe-DEFAULT"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: Math.random() }}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Emergency number quick dial */}
          <div className="mx-6 mb-4">
            <a
              href="tel:112"
              className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-danger-DEFAULT/10 border border-danger-DEFAULT/30 text-danger-DEFAULT font-medium"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill="currentColor"/>
              </svg>
              Call Emergency Services
            </a>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cancel / Resolve section */}
          <div className="mx-6 pb-safe pb-8">
            {phase === "cancelling" ? (
              <div className="text-center">
                <p className="text-night-400 text-sm mb-4">
                  Cancelling in{" "}
                  <span className="text-shield-400 font-bold text-xl">
                    {countdownSeconds}
                  </span>{" "}
                  seconds...
                </p>
                <button
                  onClick={abortCancel}
                  className="w-full py-4 rounded-2xl bg-safe-DEFAULT/10 border border-safe-DEFAULT/40 text-safe-DEFAULT font-medium text-base"
                >
                  I'm safe — keep SOS active
                </button>
              </div>
            ) : (
              <button
                onClick={initiateCancelCountdown}
                className="w-full py-4 rounded-2xl bg-night-800 border border-white/10 text-night-300 font-medium text-base"
              >
                I'm safe now
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
