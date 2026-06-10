"use client";
// ============================================
// ShieldHer — SOS Button Component
// The most important UI element in the app.
// Hold 2s to activate. Cancel countdown. Live state.
// ============================================

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useSOS } from "@/lib/hooks/useSOS";
import { cn } from "@/lib/utils";

export function SOSButton() {
  const {
    phase, holdProgress, countdownSeconds,
    startHold, cancelHold, initiateCancelCountdown, abortCancel,
  } = useSOS();

  const isIdle = phase === "idle";
  const isArming = phase === "arming";
  const isActive = phase === "active";
  const isCancelling = phase === "cancelling";

  // SVG circle progress for hold animation
  const RADIUS = 82;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE - (holdProgress / 100) * CIRCUMFERENCE;

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse rings — only when active */}
      <AnimatePresence>
        {isActive && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-shield-500/30"
                style={{ width: 200 + i * 60, height: 200 + i * 60 }}
                initial={{ opacity: 0.8, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.4 }}
                transition={{
                  duration: 2,
                  delay: i * 0.4,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Hold progress ring */}
      {(isIdle || holdProgress > 0) && (
        <svg
          className="absolute"
          width="200"
          height="200"
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx="100" cy="100" r={RADIUS}
            fill="none"
            stroke="rgba(229, 41, 78, 0.15)"
            strokeWidth="3"
          />
          <circle
            cx="100" cy="100" r={RADIUS}
            fill="none"
            stroke="#E5294E"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />
        </svg>
      )}

      {/* Main button */}
      <motion.button
        className={cn(
          "relative w-44 h-44 rounded-full flex flex-col items-center justify-center",
          "select-none touch-none outline-none cursor-pointer",
          "transition-colors duration-300",
          isActive
            ? "bg-shield-600 shadow-shield-lg"
            : isArming
            ? "bg-shield-400"
            : "bg-shield-500 shadow-shield"
        )}
        onPointerDown={isIdle ? startHold : undefined}
        onPointerUp={isIdle ? cancelHold : undefined}
        onPointerLeave={isIdle ? cancelHold : undefined}
        onClick={isActive ? initiateCancelCountdown : undefined}
        whileTap={{ scale: 0.97 }}
        animate={
          isActive
            ? { scale: [1, 1.02, 1], transition: { duration: 2, repeat: Infinity } }
            : {}
        }
      >
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-full bg-white/5" />

        {/* Content */}
        <AnimatePresence mode="wait">
          {isIdle && (
            <motion.div
              key="idle"
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <span className="text-white font-display font-bold text-4xl tracking-tight leading-none">
                SOS
              </span>
              <span className="text-white/60 text-xs font-medium tracking-widest uppercase">
                Hold 2s
              </span>
            </motion.div>
          )}

          {isArming && (
            <motion.div
              key="arming"
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-white/80 text-xs mt-1">Alerting...</span>
            </motion.div>
          )}

          {isActive && (
            <motion.div
              key="active"
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="text-white font-display font-bold text-3xl tracking-tight">
                LIVE
              </span>
              <span className="text-white/70 text-xs tracking-widest uppercase">
                Tap to cancel
              </span>
            </motion.div>
          )}

          {isCancelling && (
            <motion.div
              key="cancelling"
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="text-white font-display font-bold text-5xl">
                {countdownSeconds}
              </span>
              <span className="text-white/70 text-xs tracking-widest uppercase">
                Cancelling
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Cancel abort button */}
      <AnimatePresence>
        {isCancelling && (
          <motion.button
            className="absolute -bottom-16 px-6 py-2.5 rounded-full bg-shield-500/20 border border-shield-500/40 text-shield-300 text-sm font-medium"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={abortCancel}
          >
            Keep SOS active
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
