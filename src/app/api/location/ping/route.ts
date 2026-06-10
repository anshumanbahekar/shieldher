// POST /api/location/ping
// Receives GPS updates every 5s during active SOS or journey
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "edge"; // Ultra-fast edge function for location pings

interface PingBody {
  session_id: string;
  session_type: "sos" | "journey";
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: PingBody = await request.json();

  if (!body.session_id || !body.latitude || !body.longitude) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  await admin.from("location_pings").insert({
    user_id: user.id,
    session_id: body.session_id,
    session_type: body.session_type,
    latitude: body.latitude,
    longitude: body.longitude,
    accuracy: body.accuracy ?? null,
    speed: body.speed ?? null,
    heading: body.heading ?? null,
    battery_level: body.battery_level ?? null,
  });

  // For journey mode: check route deviation
  if (body.session_type === "journey") {
    const { data: journey } = await admin
      .from("journeys")
      .select("destination_lat, destination_lng, deviation_threshold_meters, status")
      .eq("id", body.session_id)
      .single();

    if (journey && journey.status === "active") {
      // Simple deviation check — in production use Mapbox Directions API
      const distToDestination = haversineDistance(
        body.latitude, body.longitude,
        journey.destination_lat, journey.destination_lng
      );

      // If within 50m of destination, auto-complete
      if (distToDestination < 50) {
        await admin
          .from("journeys")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", body.session_id);

        return NextResponse.json({ data: { ping: "ok", journey_completed: true } });
      }
    }
  }

  return NextResponse.json({ data: { ping: "ok" } });
}

// Haversine distance in meters
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
