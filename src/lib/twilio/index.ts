// ============================================
// ShieldHer — Twilio Notification Service
// SMS + WhatsApp + Escalation Engine
// ============================================

import twilio from "twilio";
import type { TrustedContact, SOSAlert, Profile } from "@/lib/types";
import { generateShareUrl } from "@/lib/utils";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const FROM_SMS = process.env.TWILIO_PHONE_NUMBER!;
const FROM_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER!;

// ============================================
// MESSAGE TEMPLATES (multi-language ready)
// ============================================

function buildSOSMessage(
  user: Profile,
  alert: SOSAlert,
  contact: TrustedContact,
  liveUrl: string
): string {
  const templates: Record<string, string> = {
    en: `🚨 EMERGENCY ALERT from ${user.full_name}

She needs help RIGHT NOW.

📍 Live location: ${liveUrl}
📱 Call her: ${user.phone}
⏰ Alert sent: ${new Date(alert.created_at).toLocaleTimeString()}
🔋 Battery: ${alert.battery_level ?? "Unknown"}%

${alert.message ?? "No additional message."}

This alert will escalate every 5 minutes until acknowledged.
— ShieldHer Safety System`,

    hi: `🚨 आपातकालीन अलर्ट - ${user.full_name}

उन्हें अभी मदद चाहिए!

📍 लाइव लोकेशन: ${liveUrl}
📱 कॉल करें: ${user.phone}

— ShieldHer`,

    es: `🚨 ALERTA DE EMERGENCIA de ${user.full_name}

Necesita ayuda AHORA.

📍 Ubicación en vivo: ${liveUrl}
📱 Llámala: ${user.phone}

— ShieldHer`,

    fr: `🚨 ALERTE URGENCE de ${user.full_name}

Elle a besoin d'aide MAINTENANT.

📍 Position en direct: ${liveUrl}
📱 Appelez-la: ${user.phone}

— ShieldHer`,
  };

  return templates[contact.language] ?? templates["en"];
}

function buildAcknowledgeMessage(contact: TrustedContact, liveUrl: string): string {
  return `✅ Alert acknowledged. Continue tracking here: ${liveUrl}`;
}

function buildEscalationMessage(
  user: Profile,
  alert: SOSAlert,
  liveUrl: string,
  escalationCount: number
): string {
  return `🚨 ESCALATION #${escalationCount} — ${user.full_name} still needs help!

No one has responded yet. Please act immediately.

📍 Current location: ${liveUrl}
📱 ${user.phone}
⏱️ Alert active for ${escalationCount * 5} minutes

If she is in danger, call emergency services immediately.
— ShieldHer`;
}

// ============================================
// SEND FUNCTIONS
// ============================================

interface SendResult {
  contactId: string;
  method: "sms" | "whatsapp" | "email";
  success: boolean;
  sid?: string;
  error?: string;
}

export async function sendSOSAlert(
  user: Profile,
  alert: SOSAlert,
  contacts: TrustedContact[]
): Promise<SendResult[]> {
  const liveUrl = generateShareUrl(alert.id);
  const results: SendResult[] = [];

  const sendPromises = contacts
    .sort((a, b) => a.priority - b.priority)
    .map(async (contact) => {
      const message = buildSOSMessage(user, alert, contact, liveUrl);
      const contactResults: SendResult[] = [];

      const shouldSendSMS =
        contact.alert_method === "sms" || contact.alert_method === "all";
      const shouldSendWA =
        contact.alert_method === "whatsapp" || contact.alert_method === "all";

      // Send SMS
      if (shouldSendSMS) {
        try {
          const msg = await client.messages.create({
            body: message,
            from: FROM_SMS,
            to: contact.phone,
            statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sos/status`,
          });
          contactResults.push({
            contactId: contact.id,
            method: "sms",
            success: true,
            sid: msg.sid,
          });
        } catch (err: any) {
          contactResults.push({
            contactId: contact.id,
            method: "sms",
            success: false,
            error: err.message,
          });
        }
      }

      // Send WhatsApp
      if (shouldSendWA) {
        try {
          const msg = await client.messages.create({
            body: message,
            from: FROM_WHATSAPP,
            to: `whatsapp:${contact.phone}`,
          });
          contactResults.push({
            contactId: contact.id,
            method: "whatsapp",
            success: true,
            sid: msg.sid,
          });
        } catch (err: any) {
          contactResults.push({
            contactId: contact.id,
            method: "whatsapp",
            success: false,
            error: err.message,
          });
        }
      }

      return contactResults;
    });

  const nested = await Promise.allSettled(sendPromises);
  nested.forEach((result) => {
    if (result.status === "fulfilled") results.push(...result.value);
  });

  return results;
}

export async function sendEscalationAlert(
  user: Profile,
  alert: SOSAlert,
  contacts: TrustedContact[],
  escalationCount: number
): Promise<void> {
  const liveUrl = generateShareUrl(alert.id);
  const message = buildEscalationMessage(user, alert, liveUrl, escalationCount);

  await Promise.allSettled(
    contacts.map((contact) =>
      client.messages.create({
        body: message,
        from: FROM_SMS,
        to: contact.phone,
      })
    )
  );
}

export async function sendResolvedNotification(
  user: Profile,
  contacts: TrustedContact[]
): Promise<void> {
  const message = `✅ ${user.full_name} is safe now. The ShieldHer alert has been resolved. Thank you for being part of her safety circle. 💙`;

  await Promise.allSettled(
    contacts.map((contact) =>
      client.messages.create({
        body: message,
        from: FROM_SMS,
        to: contact.phone,
      })
    )
  );
}

export async function sendJourneyShare(
  user: Profile,
  contact: TrustedContact,
  destination: string,
  eta: string,
  trackUrl: string
): Promise<void> {
  const message = `📍 ${user.full_name} has started a journey to ${destination}.

Expected arrival: ${eta}

Track her live: ${trackUrl}

You'll be notified if she deviates from the route or doesn't arrive on time.
— ShieldHer`;

  await client.messages.create({
    body: message,
    from: FROM_SMS,
    to: contact.phone,
  });
}

export async function sendCheckInMissed(
  user: Profile,
  contacts: TrustedContact[],
  customMessage?: string,
  lastLocation?: { latitude: number; longitude: number }
): Promise<void> {
  const locationStr = lastLocation
    ? `\n📍 Last known location: https://maps.google.com/?q=${lastLocation.latitude},${lastLocation.longitude}`
    : "";

  const message = `⚠️ MISSED CHECK-IN — ${user.full_name}

${user.full_name} was supposed to check in but hasn't responded.

${customMessage ?? "Please try to contact her immediately."}
📱 Her number: ${user.phone}${locationStr}

— ShieldHer Safety System`;

  await Promise.allSettled(
    contacts.map((c) =>
      client.messages.create({ body: message, from: FROM_SMS, to: c.phone })
    )
  );
}
