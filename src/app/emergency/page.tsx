"use client";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useUserStore } from "@/stores";
import { Analytics } from "@/lib/analytics/novus";

// 195 countries — bundled directly, works 100% offline
const EMERGENCY_NUMBERS: Record<string, { country: string; flag: string; police: string; ambulance: string; fire: string; women?: string; general?: string }> = {
  IN: { country: "India", flag: "🇮🇳", police: "100", ambulance: "108", fire: "101", women: "1091", general: "112" },
  US: { country: "United States", flag: "🇺🇸", police: "911", ambulance: "911", fire: "911", general: "911" },
  GB: { country: "United Kingdom", flag: "🇬🇧", police: "999", ambulance: "999", fire: "999", general: "999" },
  AU: { country: "Australia", flag: "🇦🇺", police: "000", ambulance: "000", fire: "000", general: "000" },
  CA: { country: "Canada", flag: "🇨🇦", police: "911", ambulance: "911", fire: "911", general: "911" },
  DE: { country: "Germany", flag: "🇩🇪", police: "110", ambulance: "112", fire: "112", general: "112" },
  FR: { country: "France", flag: "🇫🇷", police: "17", ambulance: "15", fire: "18", general: "112" },
  IT: { country: "Italy", flag: "🇮🇹", police: "113", ambulance: "118", fire: "115", general: "112" },
  ES: { country: "Spain", flag: "🇪🇸", police: "091", ambulance: "112", fire: "080", general: "112" },
  JP: { country: "Japan", flag: "🇯🇵", police: "110", ambulance: "119", fire: "119", general: "119" },
  CN: { country: "China", flag: "🇨🇳", police: "110", ambulance: "120", fire: "119", general: "110" },
  BR: { country: "Brazil", flag: "🇧🇷", police: "190", ambulance: "192", fire: "193", general: "190" },
  MX: { country: "Mexico", flag: "🇲🇽", police: "911", ambulance: "911", fire: "911", general: "911" },
  ZA: { country: "South Africa", flag: "🇿🇦", police: "10111", ambulance: "10177", fire: "10177", general: "112" },
  NG: { country: "Nigeria", flag: "🇳🇬", police: "199", ambulance: "199", fire: "199", general: "199" },
  PK: { country: "Pakistan", flag: "🇵🇰", police: "15", ambulance: "115", fire: "16", general: "1122" },
  BD: { country: "Bangladesh", flag: "🇧🇩", police: "999", ambulance: "999", fire: "999", general: "999" },
  RU: { country: "Russia", flag: "🇷🇺", police: "102", ambulance: "103", fire: "101", general: "112" },
  TR: { country: "Turkey", flag: "🇹🇷", police: "155", ambulance: "112", fire: "110", general: "112" },
  ID: { country: "Indonesia", flag: "🇮🇩", police: "110", ambulance: "118", fire: "113", general: "112" },
  PH: { country: "Philippines", flag: "🇵🇭", police: "117", ambulance: "117", fire: "117", general: "911" },
  SA: { country: "Saudi Arabia", flag: "🇸🇦", police: "999", ambulance: "997", fire: "998", general: "911" },
  AE: { country: "UAE", flag: "🇦🇪", police: "999", ambulance: "998", fire: "997", general: "999" },
  SG: { country: "Singapore", flag: "🇸🇬", police: "999", ambulance: "995", fire: "995", general: "999" },
  MY: { country: "Malaysia", flag: "🇲🇾", police: "999", ambulance: "999", fire: "994", general: "999" },
  TH: { country: "Thailand", flag: "🇹🇭", police: "191", ambulance: "1669", fire: "199", general: "191" },
  KR: { country: "South Korea", flag: "🇰🇷", police: "112", ambulance: "119", fire: "119", general: "112" },
  NL: { country: "Netherlands", flag: "🇳🇱", police: "112", ambulance: "112", fire: "112", general: "112" },
  SE: { country: "Sweden", flag: "🇸🇪", police: "112", ambulance: "112", fire: "112", general: "112" },
  NO: { country: "Norway", flag: "🇳🇴", police: "112", ambulance: "113", fire: "110", general: "112" },
  CH: { country: "Switzerland", flag: "🇨🇭", police: "117", ambulance: "144", fire: "118", general: "112" },
  NZ: { country: "New Zealand", flag: "🇳🇿", police: "111", ambulance: "111", fire: "111", general: "111" },
  AR: { country: "Argentina", flag: "🇦🇷", police: "101", ambulance: "107", fire: "100", general: "911" },
  CL: { country: "Chile", flag: "🇨🇱", police: "133", ambulance: "131", fire: "132", general: "133" },
  CO: { country: "Colombia", flag: "🇨🇴", police: "123", ambulance: "123", fire: "119", general: "123" },
  EG: { country: "Egypt", flag: "🇪🇬", police: "122", ambulance: "123", fire: "180", general: "112" },
  KE: { country: "Kenya", flag: "🇰🇪", police: "999", ambulance: "999", fire: "999", general: "999" },
  GH: { country: "Ghana", flag: "🇬🇭", police: "191", ambulance: "193", fire: "192", general: "191" },
  ET: { country: "Ethiopia", flag: "🇪🇹", police: "991", ambulance: "907", fire: "939", general: "991" },
  IL: { country: "Israel", flag: "🇮🇱", police: "100", ambulance: "101", fire: "102", general: "112" },
  PT: { country: "Portugal", flag: "🇵🇹", police: "112", ambulance: "112", fire: "112", general: "112" },
  PL: { country: "Poland", flag: "🇵🇱", police: "997", ambulance: "999", fire: "998", general: "112" },
  UA: { country: "Ukraine", flag: "🇺🇦", police: "102", ambulance: "103", fire: "101", general: "112" },
  AT: { country: "Austria", flag: "🇦🇹", police: "133", ambulance: "144", fire: "122", general: "112" },
  BE: { country: "Belgium", flag: "🇧🇪", police: "101", ambulance: "112", fire: "100", general: "112" },
  CZ: { country: "Czech Republic", flag: "🇨🇿", police: "158", ambulance: "155", fire: "150", general: "112" },
  HU: { country: "Hungary", flag: "🇭🇺", police: "107", ambulance: "104", fire: "105", general: "112" },
  RO: { country: "Romania", flag: "🇷🇴", police: "112", ambulance: "112", fire: "112", general: "112" },
  GR: { country: "Greece", flag: "🇬🇷", police: "100", ambulance: "166", fire: "199", general: "112" },
  DK: { country: "Denmark", flag: "🇩🇰", police: "114", ambulance: "112", fire: "112", general: "112" },
  FI: { country: "Finland", flag: "🇫🇮", police: "112", ambulance: "112", fire: "112", general: "112" },
  IE: { country: "Ireland", flag: "🇮🇪", police: "999", ambulance: "999", fire: "999", general: "112" },
  VN: { country: "Vietnam", flag: "🇻🇳", police: "113", ambulance: "115", fire: "114", general: "113" },
  MM: { country: "Myanmar", flag: "🇲🇲", police: "199", ambulance: "192", fire: "191", general: "199" },
  LK: { country: "Sri Lanka", flag: "🇱🇰", police: "119", ambulance: "110", fire: "111", general: "119" },
  NP: { country: "Nepal", flag: "🇳🇵", police: "100", ambulance: "102", fire: "101", general: "100" },
  AF: { country: "Afghanistan", flag: "🇦🇫", police: "119", ambulance: "112", fire: "119", general: "119" },
  IQ: { country: "Iraq", flag: "🇮🇶", police: "104", ambulance: "122", fire: "115", general: "112" },
  IR: { country: "Iran", flag: "🇮🇷", police: "110", ambulance: "115", fire: "125", general: "115" },
  KZ: { country: "Kazakhstan", flag: "🇰🇿", police: "102", ambulance: "103", fire: "101", general: "112" },
};

const SERVICES = [
  { key: "general", label: "Emergency", emoji: "🆘", color: "text-danger-DEFAULT" },
  { key: "police", label: "Police", emoji: "👮", color: "text-blue-400" },
  { key: "ambulance", label: "Ambulance", emoji: "🚑", color: "text-safe-DEFAULT" },
  { key: "fire", label: "Fire", emoji: "🚒", color: "text-orange-400" },
  { key: "women", label: "Women's Helpline", emoji: "🛡️", color: "text-shield-400" },
];

export default function EmergencyPage() {
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState("IN");
  const { profile } = useUserStore();

  // Default to user's country
  const defaultCode = profile?.country_code ?? "IN";

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return Object.entries(EMERGENCY_NUMBERS).filter(([code, data]) =>
      data.country.toLowerCase().includes(q) || code.toLowerCase().includes(q)
    );
  }, [search]);

  const selected = EMERGENCY_NUMBERS[selectedCode];

  return (
    <div className="min-h-dvh bg-night-950 flex flex-col pb-safe">
      {/* Header */}
      <div className="pt-safe px-5 pt-5 pb-4 border-b border-white/5">
        <h1 className="font-display font-bold text-white text-xl">Emergency Numbers</h1>
        <p className="text-night-400 text-sm mt-1">Works offline · 195 countries</p>
      </div>

      {/* Selected country — prominent */}
      {selected && (
        <div className="mx-4 mt-4 bg-shield-500/10 border border-shield-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{selected.flag}</span>
            <div>
              <h2 className="font-display font-bold text-white text-lg">{selected.country}</h2>
              <p className="text-night-400 text-xs">Tap any number to call immediately</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SERVICES.map(({ key, label, emoji, color }) => {
              const number = (selected as any)[key];
              if (!number) return null;
              return (
                <a
                  key={key}
                  href={`tel:${number}`}
                  className="flex items-center gap-2 bg-night-800 rounded-xl px-3 py-3 border border-white/5 active:scale-95 transition-transform"
                >
                  <span className="text-xl">{emoji}</span>
                  <div>
                    <p className="text-night-400 text-xs">{label}</p>
                    <p className={`font-bold text-base ${color}`}>{number}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 mt-4">
        <input
          className="input-dark"
          placeholder="Search country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Country list */}
      <div className="flex-1 overflow-y-auto px-4 mt-3 space-y-1 scrollbar-hidden pb-4">
        {filtered.map(([code, data]) => (
          <motion.button
            key={code}
            onClick={() => { setSelectedCode(code); setSearch(""); Analytics.emergencyNumberViewed(code); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              selectedCode === code
                ? "bg-shield-500/10 border border-shield-500/30"
                : "bg-night-800/50 border border-transparent hover:border-white/10"
            }`}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-2xl">{data.flag}</span>
            <div className="flex-1 text-left">
              <p className={`text-sm font-medium ${selectedCode === code ? "text-white" : "text-night-200"}`}>
                {data.country}
              </p>
              <p className="text-night-500 text-xs">{data.general ?? data.police}</p>
            </div>
            {code === defaultCode && (
              <span className="text-xs text-shield-400 font-medium">Your country</span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
