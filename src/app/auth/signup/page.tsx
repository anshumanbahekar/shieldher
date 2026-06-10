"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase", pass: /[A-Z]/.test(password) },
    { label: "Number", pass: /[0-9]/.test(password) },
    { label: "Special char", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ["bg-danger-DEFAULT", "bg-warn-DEFAULT", "bg-warn-DEFAULT", "bg-safe-DEFAULT", "bg-safe-DEFAULT"];

  if (!password) return null;
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-colors duration-300 ${i < score ? colors[score] : "bg-night-700"}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map(({ label, pass }) => (
          <span key={label} className={`text-xs ${pass ? "text-safe-DEFAULT" : "text-night-600"}`}>
            {pass ? "✓" : "○"} {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const signUp = async () => {
    if (!fullName || !email || !password) return;
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");

    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true);
    setTimeout(() => router.push("/auth/onboarding"), 2000);
  };

  const signUpWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  if (success) return (
    <div className="min-h-dvh bg-night-950 flex items-center justify-center px-5">
      <motion.div className="text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="w-20 h-20 rounded-full bg-safe-DEFAULT/20 border-2 border-safe-DEFAULT/40 flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">✓</span>
        </div>
        <h2 className="font-display font-bold text-white text-2xl mb-2">Account created!</h2>
        <p className="text-night-400">Setting up your shield...</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-night-950 flex flex-col items-center justify-center px-5">
      <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-16 h-16 rounded-2xl bg-shield-500 flex items-center justify-center mx-auto mb-4 shadow-shield">
          <span className="text-3xl">🛡️</span>
        </div>
        <h1 className="font-display font-bold text-white text-3xl">Create your shield</h1>
        <p className="text-night-400 text-sm mt-1">Free forever. No credit card needed.</p>
      </motion.div>

      <motion.div className="w-full max-w-sm space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {error && (
          <div className="bg-danger-DEFAULT/10 border border-danger-DEFAULT/30 rounded-xl px-4 py-3">
            <p className="text-danger-DEFAULT text-sm">{error}</p>
          </div>
        )}

        <input className="input-dark" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input className="input-dark" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="space-y-2">
          <input className="input-dark" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordStrength password={password} />
        </div>

        <button onClick={signUp} disabled={loading || !fullName || !email || !password} className="btn-primary w-full disabled:opacity-40">
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-night-800" />
          <span className="text-night-600 text-xs">or</span>
          <div className="flex-1 h-px bg-night-800" />
        </div>

        <button onClick={signUpWithGoogle} className="btn-ghost w-full flex items-center justify-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <p className="text-center text-night-500 text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-shield-400 font-medium">Sign in</Link>
        </p>

        <p className="text-center text-night-600 text-xs leading-relaxed">
          By signing up you agree to our Terms of Service and Privacy Policy. Your data is encrypted and never sold.
        </p>
      </motion.div>
    </div>
  );
}
