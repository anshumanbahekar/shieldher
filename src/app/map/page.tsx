"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Map, { Source, Layer, Marker, NavigationControl, Popup } from "react-map-gl";
import type { LayerProps } from "react-map-gl";
import { createClient } from "@/lib/supabase/client";
import { useLocationStore } from "@/stores";
import { Analytics } from "@/lib/analytics/novus";
import type { SafetyReport } from "@/lib/types";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const REPORT_TYPES = [
  { id: "harassment", label: "Harassment", emoji: "😣", color: "#FF4D6D" },
  { id: "poor_lighting", label: "Poor Lighting", emoji: "🌑", color: "#FFB800" },
  { id: "unsafe_area", label: "Unsafe Area", emoji: "⚠️", color: "#FF8C00" },
  { id: "theft", label: "Theft", emoji: "👜", color: "#A855F7" },
  { id: "assault", label: "Assault", emoji: "🚨", color: "#FF3B30" },
  { id: "other", label: "Other", emoji: "📍", color: "#6B7280" },
];

const TIME_FILTERS = ["any", "morning", "afternoon", "evening", "night"];

const heatmapLayer: LayerProps = {
  id: "heatmap",
  type: "heatmap",
  paint: {
    "heatmap-weight": ["interpolate", ["linear"], ["get", "upvotes"], 0, 0, 10, 1],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
    "heatmap-color": [
      "interpolate", ["linear"], ["heatmap-density"],
      0, "rgba(229,41,78,0)",
      0.2, "rgba(229,41,78,0.2)",
      0.5, "rgba(229,41,78,0.6)",
      1, "rgba(229,41,78,1)",
    ],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 15, 30],
    "heatmap-opacity": 0.7,
  },
};

const pointLayer: LayerProps = {
  id: "points",
  type: "circle",
  minzoom: 13,
  paint: {
    "circle-radius": 8,
    "circle-color": ["match", ["get", "report_type"],
      "harassment", "#FF4D6D", "assault", "#FF3B30",
      "theft", "#A855F7", "poor_lighting", "#FFB800",
      "unsafe_area", "#FF8C00", "#6B7280"
    ],
    "circle-opacity": 0.85,
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "rgba(255,255,255,0.3)",
  },
};

export default function SafetyMapPage() {
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [timeFilter, setTimeFilter] = useState("any");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportType, setReportType] = useState<string>("harassment");
  const [reportTimeOfDay, setReportTimeOfDay] = useState("any");
  const [reportDesc, setReportDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [popup, setPopup] = useState<SafetyReport | null>(null);

  const { latitude, longitude } = useLocationStore();
  const supabase = createClient();

  const loadReports = useCallback(async () => {
    let query = supabase.from("safety_reports").select("*").order("upvotes", { ascending: false }).limit(500);
    if (timeFilter !== "any") query = query.or(`time_of_day.eq.${timeFilter},time_of_day.eq.any`);
    if (typeFilter.length > 0) query = query.in("report_type", typeFilter);
    const { data } = await query;
    setReports(data ?? []);
  }, [timeFilter, typeFilter]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const geojsonData = {
    type: "FeatureCollection" as const,
    features: reports.map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [r.longitude, r.latitude] },
      properties: { report_type: r.report_type, upvotes: r.upvotes, id: r.id },
    })),
  };

  const submitReport = async () => {
    if (!latitude || !longitude) return;
    setIsSubmitting(true);
    await supabase.from("safety_reports").insert({
      latitude, longitude,
      report_type: reportType,
      time_of_day: reportTimeOfDay,
      description: reportDesc || null,
    });
    setIsSubmitting(false);
    Analytics.safetyReportSubmitted(reportType);

    // Pendo Track Event
    if (typeof pendo !== "undefined") {
      pendo.track("Safety Report Submitted", {
        report_type: reportType,
        time_of_day: reportTimeOfDay,
        has_description: !!reportDesc,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      });
    }

    setSubmitted(true);
    setShowReportSheet(false);
    setTimeout(() => setSubmitted(false), 3000);
    await loadReports();
  };

  return (
    <div className="relative min-h-dvh flex flex-col">
      {/* Full screen map */}
      <div className="fixed inset-0 z-0">
        {latitude && longitude && (
          <Map
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{ latitude, longitude, zoom: 13 }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: "100%", height: "100%" }}
          >
            <Source type="geojson" data={geojsonData}>
              <Layer {...heatmapLayer} />
              <Layer {...pointLayer} />
            </Source>

            {/* User location */}
            {latitude && longitude && (
              <Marker latitude={latitude} longitude={longitude}>
                <motion.div
                  className="w-4 h-4 rounded-full bg-blue-400 border-2 border-white shadow-lg"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </Marker>
            )}

            <NavigationControl position="top-right" />
          </Map>
        )}
      </div>

      {/* Overlay UI */}
      <div className="relative z-10 flex flex-col min-h-dvh pointer-events-none">
        {/* Header */}
        <div className="pt-safe px-4 pt-4 pointer-events-auto">
          <div className="glass rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h1 className="font-display font-bold text-white text-base">Safety Map</h1>
              <span className="text-night-400 text-xs">{reports.length} reports</span>
            </div>

            {/* Time filter pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hidden">
              {TIME_FILTERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs capitalize transition-all ${
                    timeFilter === t ? "bg-shield-500 text-white" : "bg-night-800/80 text-night-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Legend + report button */}
        <div className="px-4 pb-safe pb-6 pointer-events-auto space-y-3">
          {/* Success toast */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                className="glass rounded-xl px-4 py-3 flex items-center gap-2 border border-safe-DEFAULT/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <span className="text-safe-DEFAULT">✓</span>
                <p className="text-safe-DEFAULT text-sm font-medium">Report submitted anonymously</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Type filter legend */}
          <div className="glass rounded-2xl px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {REPORT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setTypeFilter((prev) =>
                    prev.includes(type.id) ? prev.filter((t) => t !== type.id) : [...prev, type.id]
                  )}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all border ${
                    typeFilter.includes(type.id)
                      ? "border-transparent text-white"
                      : "border-white/10 text-night-400"
                  }`}
                  style={typeFilter.includes(type.id) ? { backgroundColor: type.color + "30", borderColor: type.color + "50", color: type.color } : {}}
                >
                  <span>{type.emoji}</span> {type.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowReportSheet(true)}
            className="btn-primary w-full"
          >
            + Report Unsafe Area
          </button>
        </div>
      </div>

      {/* Report sheet */}
      <AnimatePresence>
        {showReportSheet && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowReportSheet(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-night-900 rounded-t-3xl px-5 pt-6 pb-safe pb-8 border-t border-white/10"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <h2 className="font-display font-bold text-white text-lg mb-1">Report Unsafe Area</h2>
              <p className="text-night-500 text-sm mb-5">100% anonymous. Helps other women stay safe.</p>

              <div className="space-y-4">
                <div>
                  <p className="text-night-400 text-xs uppercase tracking-widest mb-2">Type of concern</p>
                  <div className="grid grid-cols-2 gap-2">
                    {REPORT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setReportType(type.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all border ${
                          reportType === type.id ? "bg-shield-500/10 border-shield-500/40 text-white" : "bg-night-800 border-white/5 text-night-400"
                        }`}
                      >
                        <span>{type.emoji}</span> {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-night-400 text-xs uppercase tracking-widest mb-2">Time of day</p>
                  <div className="flex gap-2">
                    {TIME_FILTERS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setReportTimeOfDay(t)}
                        className={`flex-1 py-2 rounded-xl text-xs capitalize ${
                          reportTimeOfDay === t ? "bg-shield-500 text-white" : "bg-night-800 text-night-400"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  className="input-dark min-h-[80px] resize-none text-sm"
                  placeholder="Optional: describe what happened (no personal details needed)"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                />

                <p className="text-night-600 text-xs text-center">
                  Your identity is never stored. Location is used only for the map pin.
                </p>

                <button
                  onClick={submitReport}
                  disabled={isSubmitting || !latitude}
                  className="btn-primary w-full disabled:opacity-40"
                >
                  {isSubmitting ? "Submitting..." : "Submit Anonymously"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
