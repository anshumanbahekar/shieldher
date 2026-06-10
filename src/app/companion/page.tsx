"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSOS } from "@/lib/hooks/useSOS";
import { Analytics } from "@/lib/analytics/novus";
import { useUserStore, useLocationStore } from "@/stores";

interface Message { id: string; role: "user" | "assistant"; content: string; timestamp: Date; }

const QUICK_ACTIONS = [
  { label: "I'm being followed", prompt: "I think someone is following me. What should I do right now?" },
  { label: "I feel unsafe", prompt: "I'm in a situation where I feel unsafe. Can you help me?" },
  { label: "Safety tips", prompt: "Give me quick safety tips for walking alone at night" },
  { label: "Emergency numbers", prompt: "What are the emergency numbers I should know?" },
];

export default function CompanionPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi, I'm your ShieldHer companion. I'm here 24/7 — whether you need safety advice, feel unsafe, or just want someone to talk to. How can I help you right now?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [crisisMode, setCrisisMode] = useState(false);
  const { triggerSOS } = useSOS();
  const { profile } = useUserStore();
  const { latitude, longitude } = useLocationStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect crisis keywords in user messages
  const detectCrisis = (text: string) => {
    const crisisWords = ["following me", "being attacked", "help me", "scared", "unsafe", "danger", "emergency", "someone is", "threatening"];
    return crisisWords.some((w) => text.toLowerCase().includes(w));
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
    const assistantId = (Date.now() + 1).toString();

    if (detectCrisis(text)) setCrisisMode(true);
    Analytics.companionMessageSent(detectCrisis(text));

    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);
    setInput("");
    setIsStreaming(true);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          userLocation: { country_code: profile?.country_code },
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.replace("data: ", "");
          if (data === "[DONE]") break;
          try {
            const { text } = JSON.parse(data);
            fullText += text;
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m)
            );
          } catch {}
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId
          ? { ...m, content: "I'm having trouble connecting. If this is an emergency, please call 112 or press SOS." }
          : m
        )
      );
    }

    setIsStreaming(false);
  }, [messages, isStreaming, profile]);

  return (
    <div className="min-h-dvh bg-night-950 flex flex-col">
      {/* Header */}
      <div className="pt-safe px-5 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-shield-500/20 border border-shield-500/40 flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-base">ShieldHer AI</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-safe-DEFAULT" />
              <span className="text-safe-DEFAULT text-xs">Always available</span>
            </div>
          </div>
          {/* Crisis SOS shortcut */}
          <button
            onClick={() => triggerSOS("manual")}
            className="ml-auto px-3 py-1.5 rounded-full bg-shield-500/10 border border-shield-500/30 text-shield-400 text-xs font-bold"
          >
            SOS
          </button>
        </div>
      </div>

      {/* Crisis banner */}
      <AnimatePresence>
        {crisisMode && (
          <motion.div
            className="mx-4 mt-3 bg-danger-DEFAULT/10 border border-danger-DEFAULT/30 rounded-xl px-4 py-3 flex items-center gap-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <span className="text-danger-DEFAULT text-lg">🚨</span>
            <div className="flex-1">
              <p className="text-danger-DEFAULT font-semibold text-sm">If you're in immediate danger</p>
              <p className="text-danger-DEFAULT/70 text-xs">Press SOS to alert your trusted circle</p>
            </div>
            <button
              onClick={() => triggerSOS("manual")}
              className="px-3 py-1.5 rounded-lg bg-danger-DEFAULT text-white text-xs font-bold"
            >
              SOS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hidden">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-shield-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm">🛡️</span>
              </div>
            )}
            <div
              className={`max-w-xs px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-shield-500 text-white rounded-tr-sm"
                  : "bg-night-800 text-night-100 rounded-tl-sm border border-white/5"
              }`}
            >
              {msg.content}
              {msg.role === "assistant" && isStreaming && msg === messages[messages.length - 1] && (
                <motion.span
                  className="inline-block w-1 h-4 bg-night-400 ml-1 align-text-bottom rounded-sm"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
              )}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions — only when idle */}
      {messages.length <= 1 && !isStreaming && (
        <div className="px-4 pb-2">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.prompt)}
                className="text-left px-3 py-2.5 rounded-xl bg-night-800 border border-white/5 text-night-300 text-xs hover:border-shield-500/30 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="pb-safe px-4 pb-6 pt-2 border-t border-white/5">
        <div className="flex gap-2 items-end">
          <input
            ref={inputRef}
            className="input-dark flex-1 !py-3"
            placeholder="Type anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            disabled={isStreaming}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="w-11 h-11 rounded-xl bg-shield-500 flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
