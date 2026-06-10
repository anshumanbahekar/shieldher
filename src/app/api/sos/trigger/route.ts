// ============================================
// ShieldHer — POST /api/sos/trigger
// The most critical endpoint in the app.
// Must be bulletproof, fast, and never fail silently.
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendSOSAlert } from "@/lib/twilio";
import { reverseGeocode } from "@/lib/utils";
import type { SOSTrigger, TrustedContact } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30; // Vercel function timeout

interface TriggerSOSBody {
  trigger: SOSTrigger;
  latitude: number;
  longitude: number;
  accuracy?: number;
  battery_level?: number;
  message?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: "Unauthorized", code: "AUTH_REQUIRED" } },
        { status: 401 }
      );
    }

    // 2. Parse and validate body
    const body: TriggerSOSBody = await request.json();

    if (
      typeof body.latitude !== "number" ||
      typeof body.longitude !== "number" ||
      !body.trigger
    ) {
      return NextResponse.json(
        { error: { message: "Missing required fields: latitude, longitude, trigger", code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 3. Check for existing active alert — deduplicate rapid triggers
    const { data: existingAlert } = await admin
      .from("sos_alerts")
      .select("id, created_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingAlert) {
      const ageSeconds = (Date.now() - new Date(existingAlert.created_at).getTime()) / 1000;
      if (ageSeconds < 10) {
        // Return the existing alert — don't spam contacts
        return NextResponse.json(
          { data: { alert_id: existingAlert.id, deduplicated: true } },
          { status: 200 }
        );
      }
    }

    // 4. Fetch user profile + trusted contacts in parallel
    const [profileResult, contactsResult] = await Promise.all([
      admin.from("profiles").select("*").eq("id", user.id).single(),
      admin
        .from("trusted_contacts")
        .select("*")
        .eq("user_id", user.id)
        .neq("role", "emergency_only") // emergency_only contacts don't get SOS alerts automatically
        .order("priority", { ascending: true }),
    ]);

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json(
        { error: { message: "Profile not found", code: "PROFILE_NOT_FOUND" } },
        { status: 404 }
      );
    }

    const profile = profileResult.data;
    const contacts: TrustedContact[] = contactsResult.data ?? [];

    // 5. Reverse geocode in background (don't block the SOS)
    const addressPromise = reverseGeocode(body.latitude, body.longitude);

    // 6. Create SOS alert record immediately
    const { data: alert, error: alertError } = await admin
      .from("sos_alerts")
      .insert({
        user_id: user.id,
        status: "active",
        trigger: body.trigger,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy ?? null,
        battery_level: body.battery_level ?? null,
        message: body.message ?? profile.sos_message,
        contacts_notified: contacts.map((c) => c.id),
      })
      .select()
      .single();

    if (alertError || !alert) {
      console.error("[SOS] Failed to create alert record:", alertError);
      return NextResponse.json(
        { error: { message: "Failed to create alert", code: "DB_ERROR" } },
        { status: 500 }
      );
    }

    // 7. Log initial location ping
    await admin.from("location_pings").insert({
      user_id: user.id,
      session_id: alert.id,
      session_type: "sos",
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy ?? null,
      battery_level: body.battery_level ?? null,
    });

    // 8. Send notifications (parallel, non-blocking for response)
    const notificationPromise = (async () => {
      const address = await addressPromise;

      // Update alert with resolved address
      await admin
        .from("sos_alerts")
        .update({ address })
        .eq("id", alert.id);

      if (contacts.length === 0) {
        console.warn(`[SOS] Alert ${alert.id} — no contacts to notify`);
        return;
      }

      const results = await sendSOSAlert(
        { ...profile, emergency_number: profile.emergency_number },
        { ...alert, address },
        contacts
      );

      const successCount = results.filter((r) => r.success).length;
      console.log(
        `[SOS] Alert ${alert.id} — ${successCount}/${results.length} notifications sent in ${Date.now() - startTime}ms`
      );
    })();

    // 9. Schedule escalation via Vercel Cron / background (fire and forget)
    scheduleEscalation(alert.id, user.id);

    // 10. Don't await notifications — return immediately to client
    notificationPromise.catch((err) => {
      console.error("[SOS] Notification error:", err);
    });

    return NextResponse.json(
      {
        data: {
          alert_id: alert.id,
          status: "active",
          contacts_count: contacts.length,
          response_time_ms: Date.now() - startTime,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[SOS] Unexpected error:", err);
    return NextResponse.json(
      { error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}

// ============================================
// ESCALATION SCHEDULER
// Checks every 5 min if alert is unacknowledged
// In production: use Vercel Cron or Supabase Edge Function
// ============================================
function scheduleEscalation(alertId: string, userId: string) {
  // In serverless, we can't use setInterval.
  // This triggers a background check via our escalation endpoint.
  const escalationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sos/escalate`;

  // Fire-and-forget escalation scheduling
  fetch(escalationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    body: JSON.stringify({ alert_id: alertId, user_id: userId, escalation_count: 1 }),
  }).catch(() => {
    // Escalation scheduling failed — alert still exists, contacts already notified
    console.warn(`[SOS] Escalation scheduling failed for alert ${alertId}`);
  });
}
