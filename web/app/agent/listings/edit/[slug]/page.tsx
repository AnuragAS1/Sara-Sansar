"use client";

import { useRouter, useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { properties as propApi, Property } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { LoadingHouse } from "@/components/loading";

export default function EditListingPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();

  const [prop, setProp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceLakh, setPriceLakh] = useState("");
  const [status, setStatus] = useState("active");
  const [furnishingStatus, setFurnishingStatus] = useState("");
  const [facingDirection, setFacingDirection] = useState("");
  const [roadAccessFt, setRoadAccessFt] = useState("");
  const [roadType, setRoadType] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    propApi.get(slug).then((d: any) => {
      setProp(d);
      setTitle(d.title);
      setDescription(d.description);
      setPriceLakh(String(Math.round(d.price / 100_000 / 100)));
      setStatus(d.status);
      setFurnishingStatus(d.furnishing_status || "");
      setFacingDirection(d.facing_direction || "");
      setRoadAccessFt(d.road_access_ft ? String(d.road_access_ft) : "");
      setRoadType(d.road_type || "");
    }).catch(() => setError("Could not load property."))
      .finally(() => setLoading(false));
  }, [slug, user, authLoading, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await propApi.update(slug, {
        title, description,
        price: Math.round(parseFloat(priceLakh) * 100_000 * 100),
        status,
        furnishing_status: furnishingStatus,
        facing_direction: facingDirection,
        road_access_ft: roadAccessFt ? parseInt(roadAccessFt) : null,
        road_type: roadType,
      });
      setSaved(true);
      setTimeout(() => router.push("/agent/dashboard"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally { setBusy(false); }
  }

  if (authLoading || loading) return <LoadingHouse text="Loading property…" />;
  if (!prop) return <div className="container-fluid py-20 text-center text-mute">Property not found.</div>;

  if (saved) {
    return (
      <div className="max-w-lg mx-auto container-fluid py-20 text-center rise">
        <CheckCircle size={40} className="text-emerald-500 mx-auto mb-4" />
        <h1 className="font-display text-3xl tracking-tightest mb-2">Saved!</h1>
        <p className="text-mute">Redirecting to dashboard…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto container-fluid py-10 sm:py-16 rise">
      <Link href="/agent/dashboard" className="inline-flex items-center gap-2 text-mute hover:text-emerald-500 text-sm mb-6">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>
      <h1 className="font-display text-3xl sm:text-4xl tracking-tightest mb-8 font-semibold">Edit listing</h1>

      <form onSubmit={submit} className="surface rounded-2xl p-6 sm:p-8 space-y-5">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-300 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /><span>{error}</span>
          </div>
        )}

        <div>
          <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">TITLE</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required className="field" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">DESCRIPTION</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="field" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">PRICE (LAKH NPR)</label>
            <input type="number" step="0.01" value={priceLakh} onChange={e => setPriceLakh(e.target.value)} className="field" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">STATUS</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="field">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">PROPERTY DIRECTION</label>
            <select value={facingDirection} onChange={e => setFacingDirection(e.target.value)} className="field">
              <option value="">—</option>
              <option value="north">North</option><option value="south">South</option>
              <option value="east">East</option><option value="west">West</option>
              <option value="north_east">North-East</option><option value="north_west">North-West</option>
              <option value="south_east">South-East</option><option value="south_west">South-West</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">PROPERTY CONDITION STATUS</label>
            <select value={furnishingStatus} onChange={e => setFurnishingStatus(e.target.value)} className="field">
              <option value="">—</option>
              <option value="furnished">Furnished</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="semi_furnished">Semi-furnished</option>
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">ROAD ACCESS (FT)</label>
            <input type="number" value={roadAccessFt} onChange={e => setRoadAccessFt(e.target.value)} className="field" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">ROAD TYPE</label>
            <select value={roadType} onChange={e => setRoadType(e.target.value)} className="field">
              <option value="">—</option>
              <option value="main_road">Main Road</option><option value="side_road">Side Road</option>
              <option value="highway">Highway</option><option value="private_street">Private Street</option>
              <option value="alley">Alley / Galli</option>
            </select>
          </div>
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
