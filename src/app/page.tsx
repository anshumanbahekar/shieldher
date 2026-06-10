import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-night-950 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
        <div className="w-20 h-20 rounded-3xl bg-shield-500 flex items-center justify-center mb-6 shadow-shield-lg">
          <span className="text-4xl">🛡️</span>
        </div>

        <h1 className="font-display font-bold text-white text-5xl leading-tight mb-4">
          Shield<span className="text-gradient-shield">Her</span>
        </h1>

        <p className="text-night-300 text-xl leading-relaxed max-w-sm mb-3">
          Real-time safety for every woman, everywhere.
        </p>

        <p className="text-night-500 text-sm max-w-xs mb-10">
          One tap to alert your trusted circle. Live location tracking. AI companion. Works in 195 countries.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {["🆘 SOS in 1 tap", "📍 Live tracking", "🤖 AI companion", "📞 Fake call", "🌍 195 countries", "🔒 Encrypted journal"].map((f) => (
            <span key={f} className="text-xs px-3 py-1.5 rounded-full bg-night-800 text-night-300 border border-white/5">{f}</span>
          ))}
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/auth/signup" className="btn-primary text-center text-base py-4">
            Get Protected — It's Free
          </Link>
          <Link href="/auth/login" className="btn-ghost text-center">
            Sign In
          </Link>
        </div>
      </div>

      <div className="text-center pb-8 text-night-600 text-xs">
        Built for World Product Day 2026 · ShieldHer
      </div>
    </div>
  );
}
