// /track/[token]/page.tsx
// Public page — no auth required
// Server-side fetches alert data, passes to client component
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import TrackPageClient from "@/components/sos/TrackPageClient";
import type { Metadata } from "next";

interface Props {
  params: { token: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: "ShieldHer — Live Safety Alert",
    description: "Someone needs your help. Tap to view their live location.",
    openGraph: {
      title: "🚨 ShieldHer Safety Alert",
      description: "Someone in your trusted circle needs help right now. Tap to see their live location.",
    },
  };
}

export default async function TrackPage({ params }: Props) {
  const admin = createAdminClient();

  // token = alert ID (we use the alert ID as the share token for simplicity)
  // In production you'd use the journey share_token or a separate SOS token
  const { data: alert } = await admin
    .from("sos_alerts")
    .select("*")
    .eq("id", params.token)
    .single();

  if (!alert) notFound();

  const [profileResult, pingResult] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, phone, avatar_url")
      .eq("id", alert.user_id)
      .single(),
    admin
      .from("location_pings")
      .select("*")
      .eq("session_id", alert.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  if (!profileResult.data) notFound();

  return (
    <TrackPageClient
      alertId={alert.id}
      initialData={{
        alert,
        user: profileResult.data,
        latestPing: pingResult.data ?? null,
      }}
    />
  );
}
