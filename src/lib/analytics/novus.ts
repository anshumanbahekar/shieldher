"use client";
// ============================================
// ShieldHer — Novus.ai Analytics Integration
// REQUIRED for hackathon prize eligibility
// Tracks: page views, feature usage, SOS events,
// journey starts, companion messages, map reports
// ============================================

declare global {
  interface Window {
    novus?: {
      track: (event: string, properties?: Record<string, any>) => void;
      identify: (userId: string, traits?: Record<string, any>) => void;
      page: (name: string, properties?: Record<string, any>) => void;
    };
  }
}

// ============================================
// NOVUS SCRIPT LOADER
// Add to _document or layout <head>
// ============================================
export function NovusScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function(n,o,v,u,s){
            n[s]=n[s]||function(){(n[s].q=n[s].q||[]).push(arguments)};
            var t=o.createElement('script');t.async=1;
            t.src='https://cdn.novus.ai/analytics.js';
            var f=o.getElementsByTagName('script')[0];
            f.parentNode.insertBefore(t,f);
          })(window,document,'novus','https://cdn.novus.ai','novus');
          novus('init', '${process.env.NEXT_PUBLIC_NOVUS_PROJECT_ID}');
        `,
      }}
    />
  );
}

// ============================================
// TYPED ANALYTICS WRAPPER
// Use these functions throughout the app
// ============================================

export const Analytics = {
  // Identify user after login
  identify(userId: string, traits: {
    name?: string;
    country?: string;
    contactCount?: number;
  }) {
    window.novus?.identify(userId, {
      ...traits,
      app: "ShieldHer",
      platform: "web-pwa",
    });
  },

  // Page views
  page(name: string, props?: Record<string, any>) {
    window.novus?.page(name, props);
  },

  // SOS events
  sosTriggered(trigger: string) {
    window.novus?.track("SOS Triggered", {
      trigger_method: trigger, // button | shake | voice | timer
      timestamp: new Date().toISOString(),
    });
  },
  sosResolved(durationSeconds: number) {
    window.novus?.track("SOS Resolved", { duration_seconds: durationSeconds });
  },

  // Journey events
  journeyStarted(contactCount: number) {
    window.novus?.track("Journey Started", { contact_count: contactCount });
  },
  journeyCompleted(durationMinutes: number) {
    window.novus?.track("Journey Completed", { duration_minutes: durationMinutes });
  },

  // Feature usage
  fakeCallScheduled(delaySeconds: number, scriptId: string) {
    window.novus?.track("Fake Call Scheduled", { delay_seconds: delaySeconds, script_id: scriptId });
  },
  companionMessageSent(isCrisis: boolean) {
    window.novus?.track("Companion Message Sent", { crisis_mode: isCrisis });
  },
  journalEntryCreated(severity: number, hasTags: boolean) {
    window.novus?.track("Journal Entry Created", { severity, has_tags: hasTags });
  },
  safetyReportSubmitted(type: string) {
    window.novus?.track("Safety Report Submitted", { report_type: type });
  },
  checkInStarted(minutes: number) {
    window.novus?.track("Check-in Started", { duration_minutes: minutes });
  },
  checkInConfirmed() {
    window.novus?.track("Check-in Confirmed");
  },
  checkInMissed() {
    window.novus?.track("Check-in Missed");
  },
  disguiseModeActivated(type: string) {
    window.novus?.track("Disguise Mode Activated", { disguise_type: type });
  },
  emergencyNumberViewed(countryCode: string) {
    window.novus?.track("Emergency Number Viewed", { country_code: countryCode });
  },
  contactAdded(role: string) {
    window.novus?.track("Contact Added", { role });
  },
  onboardingCompleted(countryCode: string, contactCount: number) {
    window.novus?.track("Onboarding Completed", { country_code: countryCode, contact_count: contactCount });
  },
};
