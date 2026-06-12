"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Analytics } from "@/lib/analytics/novus";

const STEPS = ["Your Info", "Your Country", "First Contact", "Test SOS"];

const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("IN");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const saveProfile = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const emergencyNumbers: Record<string, string> = {
      IN: "112", US: "911", GB: "999", AU: "000", CA: "911",
      DE: "112", FR: "112", SG: "999", AE: "999", ZA: "112",
    };

    await supabase.from("profiles").update({
      full_name: fullName, phone, country_code: country,
      emergency_number: emergencyNumbers[country] ?? "112",
    }).eq("id", user.id);

    if (contactName && contactPhone) {
      await supabase.from("trusted_contacts").insert({
        user_id: user.id, name: contactName, phone: contactPhone,
        relationship: "Trusted Contact", role: "first_responder",
        alert_method: "all", priority: 1,
      });
    }

    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    setIsSaving(false);
    next();
  };

  const finish = () => {
    Analytics.onboardingCompleted(country, contactName ? 1 : 0);

    // Pendo Track Event
    if (typeof pendo !== "undefined") {
      pendo.track("Onboarding Completed", {
        country_code: country,
        contact_count: contactName ? 1 : 0,
        has_phone_number: !!phone,
      });
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-dvh bg-night-950 flex flex-col px-5 pt-safe pb-safe">
      {/* Progress */}
      <div className="pt-6 pb-8">
        <div className="flex gap-2 mb-3">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-shield-500" : "bg-night-800"}`} />
          ))}
        </div>
        <p className="text-night-500 text-xs">Step {step + 1} of {STEPS.length}</p>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Info */}
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex flex-col gap-6 flex-1">
            <div>
              <h1 className="font-display font-bold text-white text-3xl mb-2">Let's set up your shield</h1>
              <p className="text-night-400">This takes 2 minutes and could save your life.</p>
            </div>
            <div className="space-y-3">
              <input className="input-dark" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <input className="input-dark" type="tel" placeholder="Your phone number (for SOS)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="mt-auto">
              <button onClick={next} disabled={!fullName || !phone} className="btn-primary w-full disabled:opacity-40">Continue →</button>
            </div>
          </motion.div>
        )}

        {/* Step 1: Country */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex flex-col gap-6 flex-1">
            <div>
              <h1 className="font-display font-bold text-white text-3xl mb-2">Where are you?</h1>
              <p className="text-night-400">We'll load local emergency numbers automatically.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1">
              {COUNTRIES.map((c) => (
                <button key={c.code} onClick={() => setCountry(c.code)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${country === c.code ? "bg-shield-500/10 border-shield-500/40 text-white" : "bg-night-800 border-white/5 text-night-300"}`}>
                  <span className="text-2xl">{c.flag}</span>
                  <span className="text-sm font-medium">{c.name}</span>
                </button>
              ))}
            </div>
            <button onClick={next} className="btn-primary w-full">Continue →</button>
          </motion.div>
        )}

        {/* Step 2: First contact */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex flex-col gap-6 flex-1">
            <div>
              <h1 className="font-display font-bold text-white text-3xl mb-2">Add one trusted person</h1>
              <p className="text-night-400">They'll be alerted if you press SOS. You can add more later.</p>
            </div>
            <div className="space-y-3">
              <input className="input-dark" placeholder="Their name (e.g. Mom, Sister)" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <input className="input-dark" type="tel" placeholder="Their phone number" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div className="space-y-3 mt-auto">
              <button onClick={saveProfile} disabled={isSaving || !contactName || !contactPhone} className="btn-primary w-full disabled:opacity-40">
                {isSaving ? "Setting up..." : "Save & Continue →"}
              </button>
              <button onClick={() => { saveProfile(); }} className="btn-ghost w-full text-night-500">Skip for now</button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Test SOS */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="flex flex-col items-center justify-center gap-6 flex-1 text-center">
            <motion.div
              className="w-24 h-24 rounded-full bg-shield-500/20 border-2 border-shield-500/40 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-5xl">🛡️</span>
            </motion.div>
            <div>
              <h1 className="font-display font-bold text-white text-3xl mb-2">You're protected</h1>
              <p className="text-night-400 text-base leading-relaxed">
                Hold the SOS button for 2 seconds to send an emergency alert.<br />
                Shake your phone 3 times. Or say <span className="text-shield-400">"help me now"</span>.
              </p>
            </div>
            <div className="space-y-3 w-full mt-4">
              <button onClick={finish} className="btn-primary w-full text-lg py-5">Enter ShieldHer →</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
