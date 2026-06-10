"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[ShieldHer] Global error:", error); }, [error]);

  return (
    <html>
      <body className="bg-night-950 min-h-dvh flex items-center justify-center px-6">
        <motion.div className="text-center max-w-sm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-16 h-16 rounded-2xl bg-danger-DEFAULT/20 border border-danger-DEFAULT/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="font-display font-bold text-white text-2xl mb-2">Something went wrong</h1>
          <p className="text-night-400 text-sm mb-6 leading-relaxed">
            ShieldHer encountered an unexpected error. Your safety features are still available — try refreshing.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={reset} className="btn-primary w-full">Try again</button>
            <a href="/dashboard" className="btn-ghost w-full text-center block">Go to dashboard</a>
          </div>
          {error.digest && <p className="text-night-700 text-xs mt-4 font-mono">Error: {error.digest}</p>}
        </motion.div>
      </body>
    </html>
  );
}
