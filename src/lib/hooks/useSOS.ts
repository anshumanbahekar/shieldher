"use client";
import { useCallback, useEffect, useRef } from "react";
import { useSOSStore, useLocationStore, useUserStore } from "@/stores";
import { useShakeDetection } from "./useShakeDetection";
import { useVoiceSOS } from "./useVoiceSOS";
import { Analytics } from "@/lib/analytics/novus";

const PING_INTERVAL_MS = 5000;

export function useSOS() {
  const { phase, activeAlert, holdProgress, countdownSeconds,
    setPhase, setActiveAlert, setHoldProgress, setCountdown, reset } = useSOSStore();
  const { latitude, longitude, accuracy, batteryLevel } = useLocationStore();
  const { profile } = useUserStore();

  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdProgressRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const sosStartTimeRef = useRef<number | null>(null);

  const triggerSOS = useCallback(
    async (trigger: "button" | "shake" | "voice" | "timer" | "manual") => {
      if (phase === "active" || phase === "arming") return;
      if (!latitude || !longitude) return;

      setPhase("arming");
      sosStartTimeRef.current = Date.now();

      // Track in Novus
      Analytics.sosTriggered(trigger);

      try {
        const response = await fetch("/api/sos/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trigger, latitude, longitude, accuracy, battery_level: batteryLevel }),
        });

        if (!response.ok) throw new Error("SOS trigger failed");
        const { data } = await response.json();
        setPhase("active");
        setActiveAlert({ id: data.alert_id } as any);

        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200, 100, 200, 100, 600]);
        startLocationPinging(data.alert_id, "sos");
      } catch (err) {
        setPhase("idle");
        setTimeout(() => triggerSOS(trigger), 2000);
      }
    },
    [phase, latitude, longitude, accuracy, batteryLevel, setPhase, setActiveAlert]
  );

  const startHold = useCallback(() => {
    if (phase !== "idle") return;
    let progress = 0;
    const HOLD_DURATION_MS = 2000;
    const TICK_MS = 50;

    holdProgressRef.current = setInterval(() => {
      progress += (TICK_MS / HOLD_DURATION_MS) * 100;
      setHoldProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(holdProgressRef.current!);
        triggerSOS("button");
      }
    }, TICK_MS);
  }, [phase, triggerSOS, setHoldProgress]);

  const cancelHold = useCallback(() => {
    if (holdProgressRef.current) { clearInterval(holdProgressRef.current); holdProgressRef.current = null; }
    setHoldProgress(0);
  }, [setHoldProgress]);

  const initiateCancelCountdown = useCallback(() => {
    if (phase !== "active" || !activeAlert) return;
    setPhase("cancelling");
    setCountdown(5);
    let remaining = 5;
    countdownRef.current = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining <= 0) { clearInterval(countdownRef.current!); resolveSOS(); }
    }, 1000);
  }, [phase, activeAlert]);

  const abortCancel = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setPhase("active");
    setCountdown(null);
  }, [setPhase, setCountdown]);

  const resolveSOS = useCallback(async () => {
    if (!activeAlert) return;
    stopLocationPinging();

    // Track duration in Novus
    if (sosStartTimeRef.current) {
      Analytics.sosResolved(Math.round((Date.now() - sosStartTimeRef.current) / 1000));
      sosStartTimeRef.current = null;
    }

    await fetch("/api/sos/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: activeAlert.id }),
    }).catch(console.error);

    if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
    reset();
  }, [activeAlert, reset]);

  const startLocationPinging = useCallback(
    (sessionId: string, sessionType: "sos" | "journey") => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      const ping = () => {
        const { latitude: lat, longitude: lng, accuracy: acc, speed, heading, batteryLevel: bat } =
          useLocationStore.getState();
        if (!lat || !lng) return;
        fetch("/api/location/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, session_type: sessionType, latitude: lat, longitude: lng, accuracy: acc, speed, heading, battery_level: bat }),
        }).catch(console.error);
      };
      ping();
      pingIntervalRef.current = setInterval(ping, PING_INTERVAL_MS);
    }, []
  );

  const stopLocationPinging = useCallback(() => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
  }, []);

  useShakeDetection({
    threshold: profile?.shake_sensitivity ?? 5,
    enabled: phase === "idle",
    onShake: () => triggerSOS("shake"),
  });

  useVoiceSOS({
    triggerPhrase: profile?.voice_trigger_phrase ?? "help me now",
    enabled: (profile?.voice_sos_enabled ?? false) && phase === "idle",
    onTrigger: () => triggerSOS("voice"),
  });

  useEffect(() => () => {
    stopLocationPinging();
    if (holdProgressRef.current) clearInterval(holdProgressRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, [stopLocationPinging]);

  return {
    phase, activeAlert, holdProgress, countdownSeconds,
    isActive: phase === "active", isArming: phase === "arming", isCancelling: phase === "cancelling",
    startHold, cancelHold, triggerSOS,
    initiateCancelCountdown, abortCancel, resolveSOS,
    startLocationPinging, stopLocationPinging,
  };
}
