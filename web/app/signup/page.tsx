"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { FacebookButton } from "@/components/facebook-button";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const { user, signupEmail, loading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [user, loading, next, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setBusy(true);
    try {
      await signupEmail(email.trim().toLowerCase(), password, name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto container-fluid py-12 sm:py-20 rise">
      <h1 className="font-display font-semibold text-3xl sm:text-4xl lg:text-5xl tracking-tightest text-center mb-2">
        Create your account
      </h1>
      <p className="text-mute text-center text-sm mb-8">Save, compare, and track properties.</p>

      <div className="surface rounded-2xl p-6 sm:p-8 space-y-5">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--brand-soft)] border border-ember-300 text-ember-800 dark:text-ember-200 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="text-[10px] uppercase tracking-widest text-mute block mb-1">Full name</label>
            <input id="name" type="text" value={name} onChange={e => setName(e.target.value)}
              required autoComplete="name" className="field" />
          </div>
          <div>
            <label htmlFor="email" className="text-[10px] uppercase tracking-widest text-mute block mb-1">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email" className="field" />
          </div>
          <div>
            <label htmlFor="password" className="text-[10px] uppercase tracking-widest text-mute block mb-1">Password</label>
            <div className="relative">
              <input id="password" type={showPw ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                required autoComplete="new-password" className="field pr-10" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ember-500 transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-mute text-[10px] mt-1.5">At least 8 characters. Avoid common words.</p>
          </div>
          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500 shrink-0" />
              <span className="text-mute">I agree to the <a href="/terms" target="_blank" className="text-emerald-600 hover:underline font-medium">Terms & Conditions</a></span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input type="checkbox" checked={agreePrivacy} onChange={e => setAgreePrivacy(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500 shrink-0" />
              <span className="text-mute">I agree to the <a href="/privacy" target="_blank" className="text-emerald-600 hover:underline font-medium">Privacy Policy</a></span>
            </label>
          </div>
          <button type="submit" disabled={busy || !name || !email || !password || !agreeTerms || !agreePrivacy} className="btn-primary w-full">
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <div className="relative text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--line)]" /></div>
          <span className="relative bg-[var(--bg-elev)] px-3 text-xs text-mute uppercase tracking-widest">or</span>
        </div>

        <FacebookButton onError={setError} />

        <p className="text-center text-sm text-mute">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="link-underline brand-link font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto container-fluid py-20 text-center text-mute">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
