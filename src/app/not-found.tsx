import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-night-950 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🛡️</div>
        <h1 className="font-display font-bold text-white text-3xl mb-2">Page not found</h1>
        <p className="text-night-400 mb-6">This page doesn't exist or has moved.</p>
        <Link href="/dashboard" className="btn-primary px-8">Back to safety</Link>
      </div>
    </div>
  );
}
