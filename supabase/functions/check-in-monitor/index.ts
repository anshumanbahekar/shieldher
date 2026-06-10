// supabase/functions/check-in-monitor/index.ts
// Runs every minute via Supabase scheduler
// Catches missed check-ins and fires alerts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  const now = new Date().toISOString();

  // Find all active check-ins that are past their safe_by time
  const { data: missed } = await supabase
    .from("check_ins")
    .select("*, profiles(full_name, phone, country_code), trusted_contacts(*)")
    .eq("status", "active")
    .lt("safe_by", now);

  if (!missed?.length) {
    return new Response(JSON.stringify({ checked: 0 }), { status: 200 });
  }

  let alerted = 0;

  for (const checkIn of missed) {
    // Mark as missed
    await supabase
      .from("check_ins")
      .update({ status: "missed" })
      .eq("id", checkIn.id);

    // Get contacts to alert
    const { data: contacts } = await supabase
      .from("trusted_contacts")
      .select("*")
      .eq("user_id", checkIn.user_id)
      .in("id", checkIn.contacts_to_alert ?? []);

    if (!contacts?.length) continue;

    // Get last known location
    const { data: lastPing } = await supabase
      .from("location_pings")
      .select("latitude, longitude")
      .eq("user_id", checkIn.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const profile = checkIn.profiles;
    const locationStr = lastPing
      ? `\n📍 Last location: https://maps.google.com/?q=${lastPing.latitude},${lastPing.longitude}`
      : "";

    const message = `⚠️ MISSED CHECK-IN — ${profile.full_name}\n\n${profile.full_name} was supposed to check in by ${new Date(checkIn.safe_by).toLocaleTimeString()} but hasn't responded.\n\n${checkIn.custom_message ?? "Please try to contact them immediately."}\n📱 ${profile.phone}${locationStr}\n\n— ShieldHer Safety System`;

    // Send via Twilio
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    await Promise.allSettled(
      contacts.map((contact: any) =>
        fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ Body: message, From: fromNumber, To: contact.phone }),
        })
      )
    );

    alerted++;
  }

  return new Response(JSON.stringify({ checked: missed.length, alerted }), { status: 200 });
});
