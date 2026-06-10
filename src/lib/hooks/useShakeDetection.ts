"use client";
import { useEffect, useRef, useCallback } from "react";

interface UseShakeOptions {
  threshold?: number; // 1-10 sensitivity (maps to acceleration threshold)
  enabled?: boolean;
  onShake: () => void;
}

export function useShakeDetection({
  threshold = 5,
  enabled = true,
  onShake,
}: UseShakeOptions) {
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });
  const shakeCountRef = useRef(0);
  const lastShakeTimeRef = useRef(0);
  const cooldownRef = useRef(false);

  // Map sensitivity 1-10 to acceleration threshold (higher sensitivity = lower threshold)
  const accelerationThreshold = 25 - (threshold * 1.5); // ~23.5 at 1, ~10 at 10

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      if (!enabled || cooldownRef.current) return;

      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const deltaX = Math.abs(acc.x! - lastAccelRef.current.x);
      const deltaY = Math.abs(acc.y! - lastAccelRef.current.y);
      const deltaZ = Math.abs(acc.z! - lastAccelRef.current.z);

      lastAccelRef.current = { x: acc.x!, y: acc.y!, z: acc.z! };

      const total = deltaX + deltaY + deltaZ;

      if (total > accelerationThreshold) {
        const now = Date.now();

        // Count shakes within a 1.5-second window
        if (now - lastShakeTimeRef.current < 1500) {
          shakeCountRef.current++;
        } else {
          shakeCountRef.current = 1;
        }

        lastShakeTimeRef.current = now;

        // Require 3 shakes to trigger
        if (shakeCountRef.current >= 3) {
          shakeCountRef.current = 0;
          cooldownRef.current = true;

          // 3-second cooldown to prevent accidental re-trigger
          setTimeout(() => { cooldownRef.current = false; }, 3000);

          onShake();
        }
      }
    },
    [enabled, accelerationThreshold, onShake]
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // iOS 13+ requires permission
    if (
      typeof (DeviceMotionEvent as any).requestPermission === "function"
    ) {
      (DeviceMotionEvent as any)
        .requestPermission()
        .then((state: string) => {
          if (state === "granted") {
            window.addEventListener("devicemotion", handleMotion);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener("devicemotion", handleMotion);
    }

    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [enabled, handleMotion]);
}
