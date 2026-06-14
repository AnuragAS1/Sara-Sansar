"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { agentsApi as agents } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
// Simple photo upload — Dropzone is for multi-file gallery

export default function AgentRegisterPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();

  const [agency, setAgency] = useState("");
  const [license, setLicense] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [tier, setTier] = useState<"basic" | "standard" | "premium">("standard");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent("/agent/register")}`);
    if (!loading && user?.is_agent) router.replace("/agent/dashboard");
  }, [user, loading, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("agency_name", agency);
      fd.append("license_number", license);
      fd.append("bio", bio);
      fd.append("contact_phone", phone);
      fd.append("whatsapp_number", whatsapp);
      fd.append("pricing_tier", tier);
      if (photo) fd.append("photo", photo);

      await agents.register(fd);

      // Refresh user from backend; only navigate once is_agent flips true.
      const me = await refreshUser();
      if (me?.is_agent) {
        router.push("/agent/dashboard");
      } else {
        setError("Registered, but agent status not yet active. Please refresh the page or sign out and back in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register as agent.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="max-w-2xl mx-auto container-fluid py-10 sm:py-16 rise">
      <p className="text-mute uppercase tracking-[0.3em] text-[10px] mb-3">For agents</p>
      <h1 className="font-display text-3xl sm:text-5xl tracking-tightest mb-3">List property as an agent.</h1>
      <p className="text-mute mb-8 text-sm sm:text-base">
        Complete your agent profile to start listing properties. Verified agents appear on the Agents page and earn buyer trust.
      </p>

      <form onSubmit={submit} className="surface rounded-2xl p-6 sm:p-8 space-y-5">
        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-[var(--brand-soft)] border border-ember-300 text-ember-800 dark:text-ember-200 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Agency name</label>
          <input value={agency} onChange={e => setAgency(e.target.value)} required className="field" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">License #</label>
            <input value={license} onChange={e => setLicense(e.target.value)} className="field" placeholder="optional" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Tier</label>
            <select value={tier} onChange={e => setTier(e.target.value as "basic" | "standard" | "premium")} className="field">
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Contact phone *</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} required className="field"
              placeholder="+977-98XXXXXXXX" pattern="\+?[0-9\-\s]{7,}" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">WhatsApp</label>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="field" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="field"
            placeholder="Your experience, neighborhoods, and what makes you trustworthy." />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-mute block mb-2">Profile photo</label>
          <div className="flex items-center gap-4">
            {photo && (
              <img src={URL.createObjectURL(photo)} alt="Preview"
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500" />
            )}
            <label className="surface rounded-xl border-2 border-dashed px-6 py-4 text-center cursor-pointer hover:border-emerald-500 transition-colors flex-1">
              <p className="text-sm font-medium">{photo ? photo.name : "Click to upload photo"}</p>
              <p className="text-mute text-xs mt-0.5">JPG / PNG · 8 MB max</p>
              <input type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setPhoto(f); }} />
            </label>
          </div>
        </div>

        <button type="submit" disabled={busy || !agency || !phone} className="btn-primary w-full">
          {busy ? "Registering…" : "Become an agent"}
        </button>
      </form>
    </div>
  );
}
