import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBattery(level: number | null): string {
  if (level === null) return "Unknown";
  return `${level}%`;
}

export function formatAccuracy(meters: number | null): string {
  if (meters === null) return "Unknown";
  if (meters < 10) return "High accuracy";
  if (meters < 50) return "Good";
  return `±${Math.round(meters)}m`;
}

export function formatSpeed(mps: number | null): string {
  if (mps === null || mps === 0) return "Stationary";
  const kmh = mps * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

export function getTimeAgo(date: Date | string): string {
  const d = new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function generateShareUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://shieldher.app";
  return `${base}/track/${token}`;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=address`
    );
    const data = await res.json();
    return data.features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
