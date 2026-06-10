export default function OfflinePage() {
  return (
    <div className="min-h-dvh bg-night-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-warn-DEFAULT/20 border border-warn-DEFAULT/30 flex items-center justify-center mx-auto mb-6">
        <span className="text-4xl">📡</span>
      </div>
      <h1 className="font-display font-bold text-white text-2xl mb-2">You're offline</h1>
      <p className="text-night-400 text-base mb-2">No internet connection detected.</p>
      <p className="text-night-500 text-sm mb-8 leading-relaxed max-w-xs">
        SOS alerts are queued and will send automatically when you reconnect.
        Emergency numbers still work — they're stored on your device.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <a href="/emergency" className="btn-primary text-center">View Emergency Numbers</a>
        <a href="/dashboard" className="btn-ghost text-center">Try Dashboard</a>
      </div>
    </div>
  );
}
