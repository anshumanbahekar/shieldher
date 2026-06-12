"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/stores";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { Analytics } from "@/lib/analytics/novus";
import { Toaster } from "sonner";
import type { Profile, TrustedContact } from "@/lib/types";

function PushInit() {
  // Gap 3 — auto-subscribe to push notifications when user is loaded
  usePushNotifications();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const { setProfile, setContacts, setLoaded, profile } = useUserStore();
  const supabase = createClient();

  useEffect(() => {
    pendo.initialize({ visitor: { id: '' } });

    const bootstrap = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }

      const [profileRes, contactsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("trusted_contacts").select("*").eq("user_id", user.id).order("priority"),
      ]);

      if (profileRes.data) {
        const p = profileRes.data;
        setProfile(p as Profile);
        // Gap 2 — identify user in Novus after profile loads
        Analytics.identify(user.id, {
          name: p.full_name,
          country: p.country_code,
          contactCount: contactsRes.data?.length ?? 0,
        });
        pendo.identify({
          visitor: {
            id: p.id,
            email: p.email,
            full_name: p.full_name,
            country_code: p.country_code,
            disguise_mode_enabled: p.disguise_mode_enabled,
            disguise_type: p.disguise_type,
            shake_sensitivity: p.shake_sensitivity,
            voice_sos_enabled: p.voice_sos_enabled,
            check_in_default_minutes: p.check_in_default_minutes,
            onboarding_completed: (p as any).onboarding_completed,
            created_at: p.created_at,
            updated_at: p.updated_at,
          },
        });
      }
      if (contactsRes.data) setContacts(contactsRes.data as TrustedContact[]);
      setLoaded(true);
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        useUserStore.getState().reset();
        pendo.clearSession();
        window.location.href = "/auth/login";
      }
      if (event === "SIGNED_IN") bootstrap();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      {children}
      <PushInit />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#16161F",
            border: "0.5px solid rgba(255,255,255,0.08)",
            color: "#F7F7F8",
            borderRadius: "14px",
            fontSize: "14px",
          },
        }}
      />
    </>
  );
}
