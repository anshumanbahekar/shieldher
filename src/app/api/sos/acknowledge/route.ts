// POST /api/sos/acknowledge
// Called by contact's tracking page when they acknowledge the alert
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { alert_id, contact_name } = await request.json();
  if (!alert_id) return NextResponse.json({ error: "alert_id required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: alert } = await admin
    .from("sos_alerts")
    .select("status")
    .eq("id", alert_id)
    .single();

  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  if (alert.status !== "active") {
    return NextResponse.json({ data: { status: alert.status } });
  }

  await admin
    .from("sos_alerts")
    .update({
      status: "acknowledged",
      acknowledged_by: contact_name ?? "A trusted contact",
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alert_id);

  return NextResponse.json({ data: { acknowledged: true } });
}
