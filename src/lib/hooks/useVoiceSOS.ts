"use client";
import { useEffect, useRef, useCallback } from "react";

interface UseVoiceSOSOptions {
  triggerPhrase: string;
  enabled?: boolean;
  onTrigger: () => void;
}

export function useVoiceSOS({
  triggerPhrase,
  enabled = true,
  onTrigger,
}: UseVoiceSOSOptions) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const normalizedPhrase = triggerPhrase.toLowerCase().trim();

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return;
    try {
      recognitionRef.current.start();
      isListeningRef.current = true;
    } catch {}
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("ShieldHer: Web Speech API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          const transcript = event.results[i][j].transcript.toLowerCase().trim();

          if (transcript.includes(normalizedPhrase)) {
            onTrigger();
            return;
          }
        }
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      // Auto-restart if still enabled
      if (enabled) {
        setTimeout(startListening, 500);
      }
    };

    recognition.onerror = (event) => {
      isListeningRef.current = false;
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("ShieldHer voice SOS error:", event.error);
      }
      setTimeout(startListening, 1000);
    };

    recognitionRef.current = recognition;
    startListening();

    return () => {
      recognition.abort();
      isListeningRef.current = false;
      recognitionRef.current = null;
    };
  }, [enabled, normalizedPhrase, onTrigger, startListening]);
}
