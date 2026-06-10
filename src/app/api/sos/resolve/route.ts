// POST /api/sos/resolve
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendResolvedNotification } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { alert_id } = await request.json();
  if (!alert_id) return NextResponse.json({ error: "alert_id required" }, { status: 400 });

  const admin = createAdminClient();

  // Fetch alert and verify ownership
  const { data: alert } = await admin
    .from("sos_alerts")
    .select("*")
    .eq("id", alert_id)
    .eq("user_id", user.id)
    .single();

  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  if (alert.status === "resolved") return NextResponse.json({ data: { already_resolved: true } });

  // Mark resolved
  await admin
    .from("sos_alerts")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", alert_id);

  // Notify contacts that she's safe
  const [profileResult, contactsResult] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).single(),
    admin.from("trusted_contacts").select("*").eq("user_id", user.id).in("id", alert.contacts_notified),
  ]);

  if (profileResult.data && contactsResult.data?.length) {
    await sendResolvedNotification(profileResult.data, contactsResult.data).catch(console.error);
  }

  return NextResponse.json({ data: { resolved: true } });
}
