// POST /api/journey/start
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendJourneyShare } from "@/lib/twilio";
import { generateShareUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    title, origin_address, destination_address,
    origin_lat, origin_lng, destination_lat, destination_lng,
    expected_arrival, contact_ids, deviation_threshold_meters = 200,
  } = body;

  const admin = createAdminClient();

  // Fetch route polyline from Mapbox
  let routePolyline: string | null = null;
  try {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${origin_lng},${origin_lat};${destination_lng},${destination_lat}?geometries=polyline&access_token=${mapboxToken}`
    );
    const data = await res.json();
    routePolyline = data.routes?.[0]?.geometry ?? null;
  } catch {}

  const { data: journey, error } = await admin
    .from("journeys")
    .insert({
      user_id: user.id,
      title,
      origin_address,
      destination_address,
      origin_lat, origin_lng,
      destination_lat, destination_lng,
      expected_arrival,
      contacts_sharing_with: contact_ids ?? [],
      deviation_threshold_meters,
      route_polyline: routePolyline,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !journey) {
    return NextResponse.json({ error: "Failed to create journey" }, { status: 500 });
  }

  // Notify contacts
  if (contact_ids?.length) {
    const [profileRes, contactsRes] = await Promise.all([
      admin.from("profiles").select("*").eq("id", user.id).single(),
      admin.from("trusted_contacts").select("*").eq("user_id", user.id).in("id", contact_ids),
    ]);

    if (profileRes.data && contactsRes.data) {
      const shareUrl = generateShareUrl(journey.share_token);
      const eta = new Date(expected_arrival).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      await Promise.allSettled(
        contactsRes.data.map((c) =>
          sendJourneyShare(profileRes.data, c, destination_address, eta, shareUrl)
        )
      );
    }
  }

  return NextResponse.json({ data: { journey_id: journey.id, share_token: journey.share_token } }, { status: 201 });
}
