"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";

type Step = "email" | "otp" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOTP(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api<{ detail: string }>("/users/password/reset/", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally { setBusy(false); }
  }

  async function confirmReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setBusy(true);
    try {
      await api<{ detail: string }>("/users/password/reset/confirm/", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim(), new_password: newPassword }),
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally { setBusy(false); }
  }

  if (step === "done") {
    return (
      <div className="max-w-md mx-auto container-fluid py-12 sm:py-20 rise text-center">
        <CheckCircle size={40} className="text-ember-500 mx-auto mb-4" />
        <h1 className="font-display font-semibold text-3xl tracking-tightest mb-2">Password updated!</h1>
        <p className="text-mute text-sm mb-6">You can now sign in with your new password.</p>
        <Link href="/login" className="btn-primary inline-flex">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto container-fluid py-12 sm:py-20 rise">
      <Link href="/login" className="inline-flex items-center gap-2 text-mute hover:text-ember-500 text-sm mb-8">
        <ArrowLeft size={14} /> Back to sign in
      </Link>

      {step === "email" ? (
        <>
          <h1 className="font-display font-semibold text-3xl sm:text-4xl tracking-tightest mb-2">Forgot password?</h1>
          <p className="text-mute text-sm mb-8">Enter your email and we'll send a 6-digit reset code.</p>
          <div className="surface rounded-2xl p-6 sm:p-8 space-y-5">
            {error && <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--brand-soft)] border border-ember-300 text-ember-800 dark:text-ember-200 text-sm"><AlertCircle size={16} className="shrink-0 mt-0.5" /><span>{error}</span></div>}
            <form onSubmit={requestOTP} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="field" />
              </div>
              <button type="submit" disabled={busy || !email} className="btn-primary w-full">{busy ? "Sending…" : "Send reset code"}</button>
            </form>
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display font-semibold text-3xl sm:text-4xl tracking-tightest mb-2">Enter your code</h1>
          <p className="text-mute text-sm mb-8">We sent a 6-digit code to <strong>{email}</strong>. Check your email (or the Django console in dev mode).</p>
          <div className="surface rounded-2xl p-6 sm:p-8 space-y-5">
            {error && <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--brand-soft)] border border-ember-300 text-ember-800 dark:text-ember-200 text-sm"><AlertCircle size={16} className="shrink-0 mt-0.5" /><span>{error}</span></div>}
            <form onSubmit={confirmReset} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">6-digit code</label>
                <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} required className="field text-center text-2xl tracking-[0.5em] font-mono" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">New password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoComplete="new-password" className="field pr-10" />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ember-500">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                <p className="text-mute text-[10px] mt-1.5">At least 8 characters.</p>
              </div>
              <button type="submit" disabled={busy || otp.length !== 6 || !newPassword} className="btn-primary w-full">{busy ? "Resetting…" : "Reset password"}</button>
            </form>
            <button onClick={() => { setStep("email"); setError(null); setOtp(""); }} className="w-full text-center text-sm text-mute hover:text-ember-500">← Try a different email</button>
          </div>
        </>
      )}
    </div>
  );
}
