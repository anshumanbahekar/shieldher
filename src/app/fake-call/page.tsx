"use client";
// ============================================
// ShieldHer — Elite Fake Call
// Realistic incoming call with audio conversation,
// on-screen teleprompter script, ambient overlay,
// custom caller ID, adjustable delay timer
// ============================================

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore, useUserStore } from "@/stores";
import { Analytics } from "@/lib/analytics/novus";

type CallPhase = "idle" | "ringing" | "active" | "ended";

const AMBIENT_SOUNDS: Record<string, string> = {
  none: "",
  office: "/sounds/ambient-office.mp3",
  cafe: "/sounds/ambient-cafe.mp3",
  street: "/sounds/ambient-street.mp3",
  home: "/sounds/ambient-home.mp3",
};

// Built-in conversation scripts
const SCRIPTS = [
  {
    id: "mom_check",
    label: "Mom checking in",
    callerName: "Mom 💕",
    lines: [
      { speaker: "caller" as const, text: "Hey honey, where are you?", at: 0 },
      { speaker: "you" as const, text: "Just leaving now, I'll be home soon", at: 3 },
      { speaker: "caller" as const, text: "Okay, Dad and I were worried. Are you safe?", at: 6 },
      { speaker: "you" as const, text: "Yes mom, I'm fine. Coming in 20 minutes", at: 10 },
      { speaker: "caller" as const, text: "Okay good. I'll keep dinner warm. Love you!", at: 14 },
      { speaker: "you" as const, text: "Love you too, see you soon!", at: 17 },
    ],
  },
  {
    id: "boss_urgent",
    label: "Boss — urgent work",
    callerName: "Priya (Boss)",
    lines: [
      { speaker: "caller" as const, text: "Hey, I need you back at the office ASAP", at: 0 },
      { speaker: "you" as const, text: "What happened? I'm on my way", at: 3 },
      { speaker: "caller" as const, text: "The client called, it's urgent. How far are you?", at: 6 },
      { speaker: "you" as const, text: "15 minutes. I'm leaving right now", at: 10 },
      { speaker: "caller" as const, text: "Okay, I'll stall. Hurry!", at: 13 },
    ],
  },
  {
    id: "friend_pickup",
    label: "Friend — needs pickup",
    callerName: "Anjali 🙋‍♀️",
    lines: [
      { speaker: "caller" as const, text: "Hey! Are you nearby? Can you come get me?", at: 0 },
      { speaker: "you" as const, text: "Yeah I'm close, where are you?", at: 4 },
      { speaker: "caller" as const, text: "I'm at the main road, come now!", at: 7 },
      { speaker: "you" as const, text: "Okay leaving right now, 5 minutes", at: 10 },
    ],
  },
];

export default function FakeCallPage() {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [selectedScript, setSelectedScript] = useState(SCRIPTS[0]);
  const [customCallerName, setCustomCallerName] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [ambientSound, setAmbientSound] = useState<keyof typeof AMBIENT_SOUNDS>("none");
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [callDuration, setCallDuration] = useState(0);
  const [customizing, setCustomizing] = useState(false);

  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scriptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const { deactivateFakeCall } = useUIStore();

  const callerName = customCallerName || selectedScript.callerName;

  // Start ringing with delay
  const scheduleFakeCall = useCallback(() => {
    setPhase("idle"); // reset
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);

    Analytics.fakeCallScheduled(delaySeconds, selectedScript.id);

    // Pendo Track Event
    if (typeof pendo !== "undefined") {
      pendo.track("Fake Call Scheduled", {
        delay_seconds: delaySeconds,
        script_id: selectedScript.id,
        ambient_sound: ambientSound,
        has_custom_caller_name: !!customCallerName,
      });
    }

    delayTimerRef.current = setTimeout(() => {
      setPhase("ringing");
      // Vibrate pattern for incoming call
      if ("vibrate" in navigator) {
        navigator.vibrate([1000, 500, 1000, 500, 1000]);
      }
    }, delaySeconds * 1000);
  }, [delaySeconds]);

  // Answer call
  const answerCall = useCallback(() => {
    setPhase("active");
    setCallDuration(0);
    setActiveLineIndex(0);

    callStartTimeRef.current = Date.now();

    // Pendo Track Event
    if (typeof pendo !== "undefined") {
      pendo.track("Fake Call Answered", {
        script_id: selectedScript.id,
        ambient_sound: ambientSound,
        caller_name_customized: !!customCallerName,
      });
    }

    // Ambient sound
    if (ambientSound !== "none" && AMBIENT_SOUNDS[ambientSound]) {
      const audio = new Audio(AMBIENT_SOUNDS[ambientSound]);
      audio.loop = true;
      audio.volume = 0.15;
      audio.play().catch(() => {});
      ambientRef.current = audio;
    }

    // Call duration counter
    callTimerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);

    // Script teleprompter
    selectedScript.lines.forEach((line, idx) => {
      scriptTimerRef.current = setTimeout(() => {
        setActiveLineIndex(idx);
      }, line.at * 1000) as any;
    });

    // Auto-end after last line + 3s
    const lastLine = selectedScript.lines[selectedScript.lines.length - 1];
    setTimeout(() => endCall(), (lastLine.at + 5) * 1000);
  }, [ambientSound, selectedScript]);

  const endCall = useCallback(() => {
    // Pendo Track Event
    if (typeof pendo !== "undefined" && callStartTimeRef.current) {
      const durationSeconds = Math.round((Date.now() - callStartTimeRef.current) / 1000);
      pendo.track("Fake Call Completed", {
        call_duration_seconds: durationSeconds,
      });
      callStartTimeRef.current = null;
    }

    setPhase("ended");
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (ambientRef.current) { ambientRef.current.pause(); ambientRef.current = null; }
    setTimeout(() => setPhase("idle"), 3000);
  }, []);

  useEffect(() => () => {
    [delayTimerRef, callTimerRef].forEach((r) => { if (r.current) clearInterval(r.current as any); });
    ambientRef.current?.pause();
  }, []);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-dvh bg-night-950 flex flex-col">
      {/* Incoming call fullscreen overlay */}
      <AnimatePresence>
        {(phase === "ringing" || phase === "active") && (
          <motion.div
            className="fixed inset-0 z-50 bg-night-900 flex flex-col"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            {/* Status bar */}
            <div className="pt-safe px-6 pt-4 text-night-400 text-xs text-center">
              {phase === "active" ? formatDuration(callDuration) : "Incoming call..."}
            </div>

            {/* Caller info */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              {/* Avatar */}
              <motion.div
                className="w-32 h-32 rounded-full bg-shield-500/20 border-2 border-shield-500/30 flex items-center justify-center mb-6"
                animate={phase === "ringing" ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="text-6xl">
                  {callerName.includes("Mom") ? "👩" :
                   callerName.includes("Boss") ? "👩‍💼" : "👩‍🦰"}
                </span>
              </motion.div>

              <h1 className="font-display font-bold text-3xl text-white mb-2">{callerName}</h1>

              {phase === "ringing" && (
                <motion.p
                  className="text-night-400 text-base"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  Mobile
                </motion.p>
              )}

              {/* Teleprompter — only during active call */}
              {phase === "active" && (
                <div className="w-full mt-8">
                  <div className="bg-night-800/60 rounded-2xl p-4 border border-white/5 space-y-3 max-h-64 overflow-hidden">
                    {selectedScript.lines.map((line, idx) => (
                      <AnimatePresence key={idx}>
                        {idx <= activeLineIndex && (
                          <motion.div
                            className={`flex gap-3 items-start ${line.speaker === "you" ? "flex-row-reverse" : ""}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: idx === activeLineIndex ? 1 : 0.35, y: 0 }}
                          >
                            <div className={`px-3 py-2 rounded-xl text-sm max-w-xs ${
                              line.speaker === "you"
                                ? "bg-shield-500/20 text-shield-200"
                                : "bg-night-700 text-night-200"
                            }`}>
                              {line.text}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    ))}
                  </div>
                  {activeLineIndex < selectedScript.lines.length &&
                    selectedScript.lines[activeLineIndex]?.speaker === "you" && (
                      <motion.p
                        className="text-center text-shield-400 text-xs mt-2 font-medium"
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >
                        ↑ Say this
                      </motion.p>
                    )}
                </div>
              )}
            </div>

            {/* Call controls */}
            <div className="pb-safe px-10 pb-12">
              {phase === "ringing" ? (
                <div className="flex items-center justify-between">
                  <button
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-danger-DEFAULT flex items-center justify-center"
                  >
                    <span className="text-2xl">📵</span>
                  </button>
                  <motion.button
                    onClick={answerCall}
                    className="w-16 h-16 rounded-full bg-safe-DEFAULT flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    <span className="text-2xl">📞</span>
                  </motion.button>
                </div>
              ) : (
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-danger-DEFAULT flex items-center justify-center mx-auto"
                >
                  <span className="text-2xl">📵</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ended overlay */}
      <AnimatePresence>
        {phase === "ended" && (
          <motion.div
            className="fixed inset-0 z-50 bg-night-950 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">📴</div>
              <p className="text-night-400 text-lg">Call ended</p>
              <p className="text-night-500 text-sm mt-1">{formatDuration(callDuration)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Setup screen */}
      <div className="pt-safe px-5 pt-5 pb-8 flex flex-col gap-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Fake Call</h1>
          <p className="text-night-400 text-sm mt-1">Set up a realistic incoming call to exit any situation</p>
        </div>

        {/* Script selector */}
        <div>
          <p className="text-night-400 text-xs uppercase tracking-widest mb-3">Call scenario</p>
          <div className="space-y-2">
            {SCRIPTS.map((script) => (
              <button
                key={script.id}
                onClick={() => setSelectedScript(script)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  selectedScript.id === script.id
                    ? "bg-shield-500/10 border-shield-500/40 text-white"
                    : "bg-night-800 border-white/5 text-night-300"
                }`}
              >
                <span className="text-xl">
                  {script.id === "mom_check" ? "💕" : script.id === "boss_urgent" ? "💼" : "👯‍♀️"}
                </span>
                <div className="text-left">
                  <p className="font-medium text-sm">{script.label}</p>
                  <p className="text-xs opacity-60">{script.lines.length} lines · ~{script.lines[script.lines.length-1].at + 5}s</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom caller name */}
        <div>
          <p className="text-night-400 text-xs uppercase tracking-widest mb-2">Caller name (optional)</p>
          <input
            className="input-dark"
            placeholder={selectedScript.callerName}
            value={customCallerName}
            onChange={(e) => setCustomCallerName(e.target.value)}
          />
        </div>

        {/* Delay */}
        <div>
          <div className="flex justify-between mb-2">
            <p className="text-night-400 text-xs uppercase tracking-widest">Delay before ringing</p>
            <p className="text-shield-400 text-xs font-bold">{delaySeconds}s</p>
          </div>
          <input
            type="range" min={3} max={30} step={1}
            value={delaySeconds}
            onChange={(e) => setDelaySeconds(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-night-600 text-xs mt-1">
            <span>3s</span><span>30s</span>
          </div>
        </div>

        {/* Ambient sound */}
        <div>
          <p className="text-night-400 text-xs uppercase tracking-widest mb-2">Ambient background</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(AMBIENT_SOUNDS).map((key) => (
              <button
                key={key}
                onClick={() => setAmbientSound(key as any)}
                className={`px-3 py-1.5 rounded-full text-sm capitalize transition-all ${
                  ambientSound === key
                    ? "bg-shield-500 text-white"
                    : "bg-night-800 text-night-400 border border-white/10"
                }`}
              >
                {key === "none" ? "Silent" : key}
              </button>
            ))}
          </div>
        </div>

        {/* Trigger button */}
        <button
          onClick={scheduleFakeCall}
          className="btn-primary w-full text-base"
        >
          Schedule Call (rings in {delaySeconds}s)
        </button>

        <p className="text-center text-night-600 text-xs">
          Lock your screen after tapping — the call will ring through
        </p>
      </div>
    </div>
  );
}
