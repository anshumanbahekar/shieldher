// POST /api/notifications/subscribe
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscription } = await request.json();
  if (!subscription?.endpoint) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

  const admin = createAdminClient();

  // Store push subscription against user profile
  await admin.from("profiles")
    .update({ push_subscription: JSON.stringify(subscription) })
    .eq("id", user.id);

  return NextResponse.json({ data: { subscribed: true } });
}
