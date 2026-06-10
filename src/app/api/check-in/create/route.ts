// POST /api/check-in/create
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendCheckInMissed } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, safe_by_minutes, custom_message, contact_ids } = await request.json();

  const safe_by = new Date(Date.now() + safe_by_minutes * 60 * 1000).toISOString();
  const admin = createAdminClient();

  const { data: checkIn } = await admin
    .from("check_ins")
    .insert({ user_id: user.id, label, safe_by, custom_message, contacts_to_alert: contact_ids ?? [] })
    .select().single();

  // Schedule the check — in production use Vercel Cron or Supabase pg_cron
  // For hackathon: use a simple delayed fetch
  const delay = safe_by_minutes * 60 * 1000 + 60000; // +1 min grace
  setTimeout(async () => {
    const { data: current } = await admin.from("check_ins").select("status").eq("id", checkIn!.id).single();
    if (current?.status !== "active") return; // already checked in

    // Mark missed
    await admin.from("check_ins").update({ status: "missed" }).eq("id", checkIn!.id);

    // Get profile + contacts and alert
    const [profileRes, contactsRes, locationRes] = await Promise.all([
      admin.from("profiles").select("*").eq("id", user.id).single(),
      admin.from("trusted_contacts").select("*").eq("user_id", user.id).in("id", contact_ids ?? []),
      admin.from("location_pings").select("latitude,longitude").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single(),
    ]);

    if (profileRes.data && contactsRes.data?.length) {
      await sendCheckInMissed(
        profileRes.data, contactsRes.data, custom_message,
        locationRes.data ?? undefined
      );
    }
  }, delay);

  return NextResponse.json({ data: { check_in_id: checkIn!.id, safe_by } }, { status: 201 });
}
