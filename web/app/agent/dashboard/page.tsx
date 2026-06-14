"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, MapPin, Trash2, Pencil } from "lucide-react";
import { LoadingHouse } from "@/components/loading";
import { properties, Property, formatNPR, sqmToAana } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

export default function AgentDashboard() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const [items, setItems] = useState<Property[]>([]);
  const [busy, setBusy] = useState(true);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login?next=/agent/dashboard"); return; }
    // Grace period: if user just registered as agent, refresh once more.
    if (!user.is_agent && retries < 1) {
      setRetries(r => r + 1);
      refreshUser();
      return;
    }
    if (!user.is_agent) { router.replace("/agent/register"); return; }

    properties.myListings()
      .then(r => setItems(r.results || []))
      .catch(() => {})
      .finally(() => setBusy(false));
  }, [user, loading, router, refreshUser, retries]);

  async function deleteProperty(slug: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await properties.remove(slug);
      setItems(prev => prev.filter(p => p.slug !== slug));
    } catch { alert("Could not delete. Try again."); }
  }

  if (loading || !user || !user.is_agent) return <LoadingHouse text="Loading dashboard…" />;
  if (busy) return <LoadingHouse text="Loading your listings…" />;

  return (
    <div className="max-w-6xl mx-auto container-fluid py-10 sm:py-16 rise">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-mute uppercase tracking-[0.3em] text-[10px] mb-2">Agent Dashboard</p>
          <h1 className="font-display text-3xl sm:text-5xl tracking-tightest">{user.full_name || user.email}</h1>
          {user.agent_profile?.agency_name && (
            <p className="text-mute mt-1">{user.agent_profile.agency_name}</p>
          )}
        </div>
        <Link href="/agent/listings/new" className="btn-primary">
          <Plus size={16} /> New listing
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="surface rounded-2xl p-12 text-center">
          <p className="font-display text-2xl mb-2">No listings yet</p>
          <p className="text-mute mb-6 text-sm">Add your first property to get started.</p>
          <Link href="/agent/listings/new" className="btn-primary inline-flex">
            <Plus size={16} /> Add your first property
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {items.map(p => (
            <Link key={p.id} href={`/property/${p.slug}`}
              className="surface rounded-2xl overflow-hidden block hover:border-ember-500 transition-colors">
              <div className="aspect-[4/3] bg-[var(--brand-soft)] overflow-hidden">
                {p.primary_image && <img src={p.primary_image} alt={p.title} className="w-full h-full object-cover" />}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2 text-xs flex-wrap gap-1">
                  <span className="bg-ember-100 dark:bg-ember-900/40 text-ember-700 dark:text-ember-300 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest">
                    {p.status}
                  </span>
                  {p.is_luxury && (
                    <span className="bg-ember-700 text-white px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest">
                      Luxury
                    </span>
                  )}
                </div>
                <h3 className="font-display text-lg leading-tight line-clamp-2">{p.title}</h3>
                <div className="flex items-center gap-1.5 text-mute text-xs mt-2">
                  <MapPin size={11} /><span>{p.city}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--line)] flex items-center justify-between">
                  <span className="font-display text-lg text-ember-600">{formatNPR(p.price)}</span>
                  <span className="text-mute text-xs">{sqmToAana(p.area_sqm)} aana</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link href={`/agent/listings/edit/${p.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 text-emerald-600 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors">
                    <Pencil size={12} /> Edit
                  </Link>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteProperty(p.slug, p.title); }}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-500 text-xs hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
