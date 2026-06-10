// supabase/functions/sos-escalation/index.ts
// Called by /api/sos/trigger after initial alert
// Re-alerts contacts every 5 minutes if unacknowledged

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const { alert_id, escalation_count } = await req.json();
  if (!alert_id) return new Response("Missing alert_id", { status: 400 });

  // Wait 5 minutes before checking
  await new Promise((r) => setTimeout(r, 5 * 60 * 1000));

  const { data: alert } = await supabase
    .from("sos_alerts")
    .select("*, profiles(full_name, phone, country_code)")
    .eq("id", alert_id)
    .single();

  // Only escalate if still active (not acknowledged or resolved)
  if (!alert || alert.status !== "active") {
    return new Response(JSON.stringify({ escalated: false, reason: alert?.status }), { status: 200 });
  }

  const { data: contacts } = await supabase
    .from("trusted_contacts")
    .select("*")
    .eq("user_id", alert.user_id)
    .in("id", alert.contacts_notified);

  const { data: latestPing } = await supabase
    .from("location_pings")
    .select("latitude, longitude")
    .eq("session_id", alert_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const profile = alert.profiles;
  const appUrl = Deno.env.get("APP_URL") ?? "https://shieldher.app";
  const trackUrl = `${appUrl}/track/${alert_id}`;
  const locationStr = latestPing
    ? `\n📍 Current location: https://maps.google.com/?q=${latestPing.latitude},${latestPing.longitude}`
    : "";

  const message = `🚨 ESCALATION #${escalation_count} — ${profile.full_name} STILL NEEDS HELP!\n\nNo one has responded yet. ${profile.full_name} has been in SOS for ${escalation_count * 5} minutes.\n\nIf she is in danger, call emergency services NOW.\n\n📱 Her number: ${profile.phone}${locationStr}\n🔗 Live tracking: ${trackUrl}\n\n— ShieldHer`;

  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER")!;

  if (contacts?.length) {
    await Promise.allSettled(
      contacts.map((c: any) =>
        fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ Body: message, From: fromNumber, To: c.phone }),
        })
      )
    );
  }

  // Schedule next escalation (max 6 escalations = 30 minutes)
  if (escalation_count < 6) {
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sos-escalation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ alert_id, escalation_count: escalation_count + 1 }),
    });
  }

  return new Response(JSON.stringify({ escalated: true, escalation_count }), { status: 200 });
});
