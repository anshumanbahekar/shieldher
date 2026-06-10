// POST /api/journey/complete
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { journey_id } = await request.json();
  const admin = createAdminClient();

  const { data: journey } = await admin
    .from("journeys").select("*, profiles(full_name, phone)")
    .eq("id", journey_id).eq("user_id", user.id).single();

  if (!journey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await admin.from("journeys").update({
    status: "completed", completed_at: new Date().toISOString()
  }).eq("id", journey_id);

  // Notify contacts she arrived safely
  if (journey.contacts_sharing_with?.length) {
    const { data: contacts } = await admin
      .from("trusted_contacts").select("phone, name")
      .in("id", journey.contacts_sharing_with);

    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).single();

    if (contacts && profile) {
      const msg = `✅ ${profile.full_name} has arrived safely at ${journey.destination_address}. Journey complete. — ShieldHer`;
      await Promise.allSettled(
        contacts.map((c) => client.messages.create({ body: msg, from: process.env.TWILIO_PHONE_NUMBER!, to: c.phone }))
      );
    }
  }

  return NextResponse.json({ data: { completed: true } });
}
