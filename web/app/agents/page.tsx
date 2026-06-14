"use client";

import { useEffect, useState } from "react";
import { Star, Phone, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { LoadingHouse } from "@/components/loading";
import { agentsApi, AgentPublic } from "@/lib/api";

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    agentsApi.list()
      .then(res => {
        // Defensive: DRF can return plain array OR {count, results} if pagination isn't disabled
        const arr = Array.isArray(res) ? res : (res as any)?.results ?? [];
        setAgents(arr);
      })
      .catch(err => setError(err instanceof Error ? err.message : "Could not load agents."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingHouse text="Loading agents…" />;

  return (
    <div className="max-w-6xl mx-auto container-fluid py-10 sm:py-16 rise">
      <p className="text-mute uppercase tracking-[0.3em] text-[10px] mb-3 text-center">Verified network</p>
      <h1 className="font-display text-3xl sm:text-5xl tracking-tightest font-bold text-center mb-2">
        Our agents
      </h1>
      <p className="text-mute text-center text-sm mb-10 max-w-xl mx-auto">
        Trusted local agents across Nepal. Verified by the Sara Sansar team.
      </p>

      {error && (
        <div className="surface rounded-xl p-6 text-center text-mute mb-6">
          <p>{error}</p>
          <p className="text-xs mt-2">Make sure the backend is running and seeded.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {agents.map(a => (
          <div key={a.id} className="surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-[var(--brand-soft)] overflow-hidden shrink-0">
                {a.photo
                  ? <img src={a.photo} alt={a.full_name} className="w-full h-full object-cover" />
                  : (
                    <div className="w-full h-full grid place-items-center text-ember-600 font-display text-xl font-bold">
                      {a.full_name?.[0] ?? "?"}
                    </div>
                  )
                }
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg leading-tight">{a.full_name}</h3>
                <p className="text-mute text-xs truncate">{a.agency_name}</p>
                {parseFloat(a.rating_avg) > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={11} className="fill-ember-500 text-ember-500" />
                    <span className="text-xs">{a.rating_avg}</span>
                    {a.rating_count > 0 && <span className="text-mute text-[10px]">({a.rating_count})</span>}
                  </div>
                )}
              </div>
            </div>
            <p className="text-mute text-xs line-clamp-3 mb-4 min-h-[3rem]">
              {a.bio || "No bio yet."}
            </p>
            <div className="space-y-1.5 text-xs">
              {a.contact_phone && (
                <a href={`tel:${a.contact_phone}`} className="flex items-center gap-2 hover:text-ember-500 transition-colors">
                  <Phone size={12} /> {a.contact_phone}
                </a>
              )}
              <a href={`mailto:${a.email}`} className="flex items-center gap-2 hover:text-ember-500 transition-colors break-all">
                <Mail size={12} /> {a.email}
              </a>
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs">
              <span className="text-mute">{a.listing_count} active listing{a.listing_count !== 1 ? "s" : ""}</span>
              <span className="capitalize bg-ember-100 dark:bg-ember-900/40 text-ember-700 dark:text-ember-300 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest">
                {a.pricing_tier}
              </span>
            </div>
            {a.listing_count > 0 && (
              <Link href={`/browse?agent=${a.id}`}
                className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border border-[var(--line)] text-xs font-medium hover:border-ember-500 hover:text-ember-500 transition-colors">
                View listings <ArrowRight size={12} />
              </Link>
            )}
          </div>
        ))}
      </div>

      {!error && agents.length === 0 && (
        <div className="surface rounded-2xl p-12 text-center">
          <p className="font-display text-2xl mb-2">No agents yet</p>
          <p className="text-mute text-sm">
            Run <code className="font-mono text-xs bg-[var(--brand-soft)] px-1 py-0.5 rounded">
              python manage.py seed_demo
            </code> to populate.
          </p>
        </div>
      )}
    </div>
  );
}
