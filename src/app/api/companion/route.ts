// POST /api/companion
// Claude-powered safety companion
// Knows emergency numbers, stays calm, guides through crisis
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `You are ShieldHer's AI safety companion — a calm, warm, and highly capable assistant dedicated to women's safety.

Your core responsibilities:
1. CRISIS SUPPORT: If someone is in immediate danger, always prioritize getting them to safety. Guide them step by step. Stay calm and clear.
2. EMOTIONAL SUPPORT: Be warm, non-judgmental, and empowering. Never minimize concerns.
3. PRACTICAL GUIDANCE: Know safety strategies — how to lose a follower, what to say to bystanders, how to signal for help discreetly.
4. LOCAL KNOWLEDGE: Know emergency numbers worldwide. If user mentions a country/city, mention the correct emergency number.
5. SAFETY TIPS: Proactively share relevant safety information based on context.

Emergency numbers you should know:
- India: 112 (all emergencies), 1091 (women's helpline), 100 (police), 108 (ambulance)
- US/Canada: 911
- UK: 999
- Europe (most countries): 112
- Australia: 000
- Always say "Press SOS in ShieldHer to alert your trusted contacts immediately"

Tone guidelines:
- Short, clear messages during obvious crisis (2-3 sentences max)
- Warmer and more conversational for general support
- NEVER lecture or moralize
- NEVER ask for personal details you don't need
- ALWAYS validate her feelings first before offering advice

If someone seems to be in immediate physical danger:
1. Acknowledge ("I hear you, stay calm")  
2. Tell them to press SOS
3. Give one concrete immediate action
4. Stay with them

You are NOT a replacement for emergency services. Always encourage calling 112/911 for immediate physical danger.`;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, userLocation } = await request.json();

  if (!messages?.length) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  // Add location context if available
  let systemWithContext = SYSTEM_PROMPT;
  if (userLocation?.country_code) {
    systemWithContext += `\n\nUser's current country: ${userLocation.country_code}. Use the correct local emergency numbers.`;
  }

  // Stream the response
  const stream = await anthropic.messages.stream({
    model: "claude-opus-4-5-20251101",
    max_tokens: 500,
    system: systemWithContext,
    messages: messages.slice(-20), // Keep last 20 messages for context
  });

  // Return as Server-Sent Events for real-time streaming
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
