// POST /api/push/send — VAPID push notification sender
// Called by edge functions and check-in monitor to notify users
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const key = request.headers.get("x-internal-key");
  if (key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user_id, title, body, type = "general", url = "/dashboard", data = {} } = await request.json();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles").select("push_subscription").eq("id", user_id).single();

  if (!profile?.push_subscription) {
    return NextResponse.json({ data: { sent: false, reason: "no_subscription" } });
  }

  let subscription;
  try { subscription = JSON.parse(profile.push_subscription); }
  catch { return NextResponse.json({ data: { sent: false, reason: "invalid_subscription" } }); }

  const payload = JSON.stringify({ title, body, type, url, ...data });

  try {
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    await webpush.sendNotification(subscription, payload);
    return NextResponse.json({ data: { sent: true } });
  } catch (err: any) {
    if (err.statusCode === 410) {
      await admin.from("profiles").update({ push_subscription: null }).eq("id", user_id);
    }
    return NextResponse.json({ data: { sent: false, error: err.message } });
  }
}
