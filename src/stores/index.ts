import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Profile, TrustedContact, SOSAlert, Journey, CheckIn } from "@/lib/types";

// ============================================
// USER STORE
// ============================================
interface UserStore {
  profile: Profile | null;
  contacts: TrustedContact[];
  isLoaded: boolean;
  setProfile: (profile: Profile) => void;
  setContacts: (contacts: TrustedContact[]) => void;
  setLoaded: (v: boolean) => void;
  reset: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  contacts: [],
  isLoaded: false,
  setProfile: (profile) => set({ profile }),
  setContacts: (contacts) => set({ contacts }),
  setLoaded: (isLoaded) => set({ isLoaded }),
  reset: () => set({ profile: null, contacts: [], isLoaded: false }),
}));

// ============================================
// LOCATION STORE
// ============================================
interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  batteryLevel: number | null;
  lastUpdated: Date | null;
  isTracking: boolean;
  error: string | null;
  setLocation: (coords: Partial<LocationState>) => void;
  setBattery: (level: number) => void;
  setTracking: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  accuracy: null,
  heading: null,
  speed: null,
  batteryLevel: null,
  lastUpdated: null,
  isTracking: false,
  error: null,
  setLocation: (coords) => set({ ...coords, lastUpdated: new Date() }),
  setBattery: (batteryLevel) => set({ batteryLevel }),
  setTracking: (isTracking) => set({ isTracking }),
  setError: (error) => set({ error }),
}));

// ============================================
// SOS STORE
// ============================================
type SOSPhase = "idle" | "arming" | "active" | "cancelling" | "resolved";

interface SOSStore {
  phase: SOSPhase;
  activeAlert: SOSAlert | null;
  holdProgress: number; // 0-100, for the hold-to-activate UI
  countdownSeconds: number | null; // cancel window countdown
  setPhase: (phase: SOSPhase) => void;
  setActiveAlert: (alert: SOSAlert | null) => void;
  setHoldProgress: (p: number) => void;
  setCountdown: (s: number | null) => void;
  reset: () => void;
}

export const useSOSStore = create<SOSStore>()(
  subscribeWithSelector((set) => ({
    phase: "idle",
    activeAlert: null,
    holdProgress: 0,
    countdownSeconds: null,
    setPhase: (phase) => set({ phase }),
    setActiveAlert: (activeAlert) => set({ activeAlert }),
    setHoldProgress: (holdProgress) => set({ holdProgress }),
    setCountdown: (countdownSeconds) => set({ countdownSeconds }),
    reset: () => set({ phase: "idle", activeAlert: null, holdProgress: 0, countdownSeconds: null }),
  }))
);

// ============================================
// JOURNEY STORE
// ============================================
interface JourneyStore {
  activeJourney: Journey | null;
  setActiveJourney: (j: Journey | null) => void;
}

export const useJourneyStore = create<JourneyStore>((set) => ({
  activeJourney: null,
  setActiveJourney: (activeJourney) => set({ activeJourney }),
}));

// ============================================
// CHECK-IN STORE
// ============================================
interface CheckInStore {
  activeCheckIn: CheckIn | null;
  setActiveCheckIn: (c: CheckIn | null) => void;
}

export const useCheckInStore = create<CheckInStore>((set) => ({
  activeCheckIn: null,
  setActiveCheckIn: (activeCheckIn) => set({ activeCheckIn }),
}));

// ============================================
// UI STORE (app-wide UI state)
// ============================================
interface UIStore {
  isDisguiseModeActive: boolean;
  isFakeCallActive: boolean;
  activateFakeCall: () => void;
  deactivateFakeCall: () => void;
  activateDisguise: () => void;
  deactivateDisguise: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isDisguiseModeActive: false,
  isFakeCallActive: false,
  activateFakeCall: () => set({ isFakeCallActive: true }),
  deactivateFakeCall: () => set({ isFakeCallActive: false }),
  activateDisguise: () => set({ isDisguiseModeActive: true }),
  deactivateDisguise: () => set({ isDisguiseModeActive: false }),
}));
