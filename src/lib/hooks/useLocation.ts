"use client";
import { useEffect, useRef, useCallback } from "react";
import { useLocationStore } from "@/stores";

interface UseLocationOptions {
  enabled?: boolean;
  highAccuracy?: boolean;
  intervalMs?: number;
  onUpdate?: (coords: GeolocationCoordinates) => void;
}

export function useLocation({
  enabled = true,
  highAccuracy = true,
  intervalMs = 5000,
  onUpdate,
}: UseLocationOptions = {}) {
  const { setLocation, setBattery, setTracking, setError } = useLocationStore();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handlePosition = useCallback(
    (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      setLocation({ latitude, longitude, accuracy, heading, speed });
      onUpdate?.(position.coords);
    },
    [setLocation, onUpdate]
  );

  const handleError = useCallback(
    (error: GeolocationPositionError) => {
      const messages: Record<number, string> = {
        1: "Location permission denied. Please enable in browser settings.",
        2: "Location unavailable. Check your GPS signal.",
        3: "Location request timed out.",
      };
      setError(messages[error.code] ?? "Unknown location error.");
    },
    [setError]
  );

  // Monitor battery level
  useEffect(() => {
    if (!("getBattery" in navigator)) return;
    (navigator as any).getBattery().then((battery: any) => {
      setBattery(Math.round(battery.level * 100));
      battery.addEventListener("levelchange", () => {
        setBattery(Math.round(battery.level * 100));
      });
    });
  }, [setBattery]);

  useEffect(() => {
    if (!enabled || !("geolocation" in navigator)) return;

    setTracking(true);
    setError(null);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      timeout: 10000,
      maximumAge: 0,
    };

    // Immediate first read
    navigator.geolocation.getCurrentPosition(handlePosition, handleError, geoOptions);

    // Continuous watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      geoOptions
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTracking(false);
    };
  }, [enabled, highAccuracy, handlePosition, handleError, setTracking, setError]);

  return useLocationStore();
}
