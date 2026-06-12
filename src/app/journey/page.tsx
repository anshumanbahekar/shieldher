"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Map, { Marker, Source, Layer, NavigationControl } from "react-map-gl";
import type { LayerProps } from "react-map-gl";
import { useLocation } from "@/lib/hooks/useLocation";
import { useJourneyStore, useUserStore } from "@/stores";
import { useSOS } from "@/lib/hooks/useSOS";
import { Analytics } from "@/lib/analytics/novus";
import "mapbox-gl/dist/mapbox-gl.css";

// Module-level dedup guard for journey completion tracked inside polling loop
const trackedJourneyCompletions = new Set<string>();

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const routeLayer: LayerProps = {
  id: "route",
  type: "line",
  layout: { "line-join": "round", "line-cap": "round" },
  paint: { "line-color": "#E5294E", "line-width": 4, "line-opacity": 0.9 },
};

const breadcrumbLayer: LayerProps = {
  id: "breadcrumb",
  type: "circle",
  paint: { "circle-radius": 4, "circle-color": "#E5294E", "circle-opacity": 0.5 },
};

type JourneyStep = "setup" | "active" | "arrived" | "deviated";

export default function JourneyPage() {
  const [step, setStep] = useState<JourneyStep>("setup");
  const [destination, setDestination] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [eta, setEta] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<[number, number][]>([]);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [deviationAlert, setDeviationAlert] = useState(false);

  const { latitude, longitude, batteryLevel } = useLocation({ enabled: true });
  const { contacts } = useUserStore();
  const { activeJourney, setActiveJourney } = useJourneyStore();
  const { triggerSOS } = useSOS();
  const pingRef = useRef<NodeJS.Timeout | null>(null);

  // Default ETA to 30 min from now
  useEffect(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    setEta(d.toTimeString().slice(0, 5));
  }, []);

  // Ping location during active journey
  useEffect(() => {
    if (step !== "active" || !journeyId || !latitude || !longitude) return;

    const ping = async () => {
      setBreadcrumbs((prev) => [...prev.slice(-49), [longitude!, latitude!]]);
      const res = await fetch("/api/location/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: journeyId, session_type: "journey",
          latitude, longitude, battery_level: batteryLevel,
        }),
      });
      const { data } = await res.json();
      if (data?.journey_completed) {
        setStep("arrived");
        Analytics.journeyCompleted(0);

        // Pendo Track Event — dedup to avoid re-firing on remount
        if (typeof pendo !== "undefined" && journeyId && !trackedJourneyCompletions.has(journeyId)) {
          trackedJourneyCompletions.add(journeyId);
          pendo.track("Journey Completed", {
            completion_method: "auto_detected",
            contact_count: selectedContacts.length,
            breadcrumb_count: breadcrumbs.length,
          });
        }
      }
    };

    ping();
    pingRef.current = setInterval(ping, 5000);
    return () => { if (pingRef.current) clearInterval(pingRef.current); };
  }, [step, journeyId, latitude, longitude]);

  const startJourney = async () => {
    if (!destination || !latitude || !longitude) return;
    setIsStarting(true);

    // Geocode destination
    let destCoords = { lat: 0, lng: 0, address: destination };
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      const data = await res.json();
      if (data.features?.[0]) {
        destCoords = {
          lat: data.features[0].center[1],
          lng: data.features[0].center[0],
          address: data.features[0].place_name,
        };
      }
    } catch {}

    const today = new Date();
    const [h, m] = eta.split(":").map(Number);
    today.setHours(h, m, 0, 0);

    const res = await fetch("/api/journey/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `To ${destination}`,
        origin_address: `${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`,
        destination_address: destCoords.address,
        origin_lat: latitude, origin_lng: longitude,
        destination_lat: destCoords.lat, destination_lng: destCoords.lng,
        expected_arrival: today.toISOString(),
        contact_ids: selectedContacts,
      }),
    });

    const { data } = await res.json();
    if (data?.journey_id) {
      setJourneyId(data.journey_id);
      setBreadcrumbs([[longitude!, latitude!]]);
      setStep("active");
      Analytics.journeyStarted(selectedContacts.length);

      // Pendo Track Event
      if (typeof pendo !== "undefined") {
        pendo.track("Journey Started", {
          contact_count: selectedContacts.length,
          destination_address: destCoords.address,
          has_route_polyline: false,
        });
      }
    }
    setIsStarting(false);
  };

  const completeJourney = async () => {
    if (!journeyId) return;
    if (pingRef.current) clearInterval(pingRef.current);
    await fetch("/api/journey/complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ journey_id: journeyId }),
    });
    setStep("arrived");
    Analytics.journeyCompleted(0);

    // Pendo Track Event — dedup to avoid double-firing with auto-detection
    if (typeof pendo !== "undefined" && journeyId && !trackedJourneyCompletions.has(journeyId)) {
      trackedJourneyCompletions.add(journeyId);
      pendo.track("Journey Completed", {
        completion_method: "manual",
        contact_count: selectedContacts.length,
        breadcrumb_count: breadcrumbs.length,
      });
    }
  };

  return (
    <div className="min-h-dvh bg-night-950 flex flex-col">
      {/* Map background — always visible */}
      <div className="fixed inset-0 z-0">
        {latitude && longitude && (
          <Map
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{ latitude, longitude, zoom: 14 }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: "100%", height: "100%" }}
          >
            {/* User location dot */}
            {latitude && longitude && (
              <Marker latitude={latitude} longitude={longitude}>
                <motion.div
                  className="w-5 h-5 rounded-full bg-shield-500 border-2 border-white shadow-shield"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </Marker>
            )}

            {/* Breadcrumb trail */}
            {breadcrumbs.length > 1 && (
              <Source type="geojson" data={{
                type: "FeatureCollection",
                features: [{
                  type: "Feature",
                  geometry: { type: "LineString", coordinates: breadcrumbs },
                  properties: {},
                }],
              }}>
                <Layer {...routeLayer} />
              </Source>
            )}

            <NavigationControl position="top-right" />
          </Map>
        )}
      </div>

      {/* Overlay content */}
      <div className="relative z-10 flex flex-col min-h-dvh">
        {/* Header */}
        <div className="pt-safe px-5 pt-5">
          <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-shield-500/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h18M3 12l4-4m-4 4l4 4M21 12l-4-4m4 4l-4 4" stroke="#E5294E" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-white font-display font-bold text-base">Journey Mode</span>
            {step === "active" && (
              <motion.div
                className="ml-auto flex items-center gap-1.5"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="w-2 h-2 rounded-full bg-safe-DEFAULT" />
                <span className="text-safe-DEFAULT text-xs font-medium">Live</span>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex-1" />

        {/* Bottom sheet */}
        <AnimatePresence mode="wait">
          {step === "setup" && (
            <motion.div
              key="setup"
              className="glass rounded-t-3xl px-5 pt-6 pb-8"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <h2 className="font-display font-bold text-xl text-white mb-1">Where are you going?</h2>
              <p className="text-night-400 text-sm mb-5">Your circle will track you in real-time</p>

              <div className="space-y-4">
                <input
                  className="input-dark"
                  placeholder="Destination (address or place name)"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />

                <div>
                  <label className="text-night-400 text-xs uppercase tracking-widest mb-2 block">
                    Expected arrival time
                  </label>
                  <input
                    type="time"
                    className="input-dark"
                    value={eta}
                    onChange={(e) => setEta(e.target.value)}
                  />
                </div>

                {/* Contact selector */}
                <div>
                  <label className="text-night-400 text-xs uppercase tracking-widest mb-2 block">
                    Share with ({selectedContacts.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedContacts((prev) =>
                          prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        )}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          selectedContacts.includes(c.id)
                            ? "bg-shield-500 text-white"
                            : "bg-night-800 text-night-300 border border-white/10"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startJourney}
                  disabled={!destination || isStarting}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {isStarting ? "Starting..." : "Start Journey"}
                </button>
              </div>
            </motion.div>
          )}

          {step === "active" && (
            <motion.div
              key="active"
              className="glass rounded-t-3xl px-5 pt-6 pb-8"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              {/* Deviation warning */}
              <AnimatePresence>
                {deviationAlert && (
                  <motion.div
                    className="bg-warn-DEFAULT/10 border border-warn-DEFAULT/30 rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <span className="text-warn-DEFAULT text-xl">⚠️</span>
                    <div>
                      <p className="text-warn-DEFAULT font-semibold text-sm">Route deviation detected</p>
                      <p className="text-warn-DEFAULT/70 text-xs">Your contacts have been notified</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-night-400 text-xs uppercase tracking-widest mb-1">Heading to</p>
                  <p className="text-white font-semibold text-base">{destination}</p>
                </div>
                <div className="text-right">
                  <p className="text-night-400 text-xs mb-1">ETA</p>
                  <p className="text-shield-400 font-bold text-lg">{eta}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Battery", value: `${batteryLevel ?? "--"}%` },
                  { label: "Sharing with", value: `${selectedContacts.length} people` },
                  { label: "Pings sent", value: `${breadcrumbs.length}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-night-800/50 rounded-xl p-3 text-center">
                    <p className="text-night-400 text-xs mb-1">{label}</p>
                    <p className="text-white font-semibold text-sm">{value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => triggerSOS("manual")}
                  className="flex-1 py-4 rounded-2xl bg-shield-500/10 border border-shield-500/30 text-shield-400 font-semibold"
                >
                  🆘 SOS
                </button>
                <button
                  onClick={completeJourney}
                  className="flex-1 btn-primary"
                >
                  I've Arrived ✓
                </button>
              </div>
            </motion.div>
          )}

          {step === "arrived" && (
            <motion.div
              key="arrived"
              className="glass rounded-t-3xl px-5 pt-6 pb-8 text-center"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-safe-DEFAULT/20 border-2 border-safe-DEFAULT/40 flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <span className="text-4xl">✓</span>
              </motion.div>
              <h2 className="font-display font-bold text-2xl text-white mb-2">Journey Complete</h2>
              <p className="text-night-400 text-sm">Your trusted circle has been notified you arrived safely.</p>
              <button
                onClick={() => setStep("setup")}
                className="mt-6 btn-ghost w-full"
              >
                Start new journey
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
