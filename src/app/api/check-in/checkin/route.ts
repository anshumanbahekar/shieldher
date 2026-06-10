// POST /api/check-in/checkin — user confirms they're safe
import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { check_in_id } = await request.json();
  const admin = createAdminClient();

  await admin.from("check_ins")
    .update({ status: "checked_in" })
    .eq("id", check_in_id)
    .eq("user_id", user.id);

  if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
  return NextResponse.json({ data: { safe: true } });
}
