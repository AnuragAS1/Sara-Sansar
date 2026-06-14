"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Crown, ArrowRight } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { LoadingHouse } from "@/components/loading";
import { properties as propApi, Property } from "@/lib/api";

const PropertyMap = dynamic(() => import("@/components/property-map").then(m => m.PropertyMap), { ssr: false });

export default function PremiumPage() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    propApi.publicList({ is_luxury: "true", sort: "-price" })
      .then(r => setItems(r.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const penthouses = items.filter(i => i.property_type === "penthouse");
  const villas = items.filter(i => i.property_type === "villa");
  const hotels = items.filter(i => ["hotel", "resort"].includes(i.property_type));

  if (loading) return <LoadingHouse text="Loading premium collection…" />;

  return (
    <div className="rise">
      {/* dark hero */}
      <section className="bg-ember-900 text-ember-50 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto container-fluid text-center">
          <Crown size={32} className="mx-auto text-ember-300 mb-4" />
          <p className="text-ember-300 uppercase tracking-[0.3em] text-[10px] sm:text-xs mb-3">Curated</p>
          <h1 className="font-display tracking-tightest font-light leading-[0.95] text-[clamp(2.5rem,7vw,5.5rem)]">
            Premium & <span className="italic font-normal">hospitality</span>
          </h1>
          <p className="mt-5 sm:mt-7 text-sm sm:text-lg text-ember-100/80 max-w-2xl mx-auto">
            Penthouses, lakeside villas, boutique hotels, and mountain resorts —
            curated for those seeking the extraordinary.
          </p>
          <div className="mt-7 grid grid-cols-3 gap-3 sm:gap-4 max-w-xl mx-auto text-center">
            <Stat label="Penthouses" value={penthouses.length} />
            <Stat label="Villas" value={villas.length} />
            <Stat label="Hospitality" value={hotels.length} />
          </div>
        </div>
      </section>

      {/* sections */}
      <div className="max-w-7xl mx-auto container-fluid py-12 sm:py-16 space-y-12 sm:space-y-16">
        {penthouses.length > 0 && (
          <Section title="Penthouses" subtitle="Sky-high city living" items={penthouses} />
        )}
        {villas.length > 0 && (
          <Section title="Villas" subtitle="Private estates, exceptional land" items={villas} />
        )}
        {hotels.length > 0 && (
          <Section title="Hotels & resorts" subtitle="Operational hospitality opportunities" items={hotels} />
        )}

        {items.length === 0 && (
          <div className="surface rounded-2xl p-12 text-center">
            <p className="font-display text-2xl mb-3">No premium listings yet</p>
            <Link href="/browse" className="link-underline brand-link">Browse all listings →</Link>
          </div>
        )}

        {items.length > 0 && (
          <section>
            <h2 className="font-display text-2xl sm:text-3xl tracking-tightest mb-6 text-center">On the map</h2>
            <PropertyMap properties={items} height={500} />
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ember-700 rounded-xl py-3 px-2">
      <div className="font-display text-2xl sm:text-3xl text-ember-200">{value}</div>
      <div className="text-ember-300/70 text-[10px] uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function Section({ title, subtitle, items }: { title: string; subtitle: string; items: Property[] }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl sm:text-4xl tracking-tightest">{title}</h2>
          <p className="text-mute text-sm mt-1">{subtitle}</p>
        </div>
        <Link href={`/browse?is_luxury=true`} className="link-underline brand-link text-sm font-medium hidden sm:inline-flex items-center gap-1">
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {items.slice(0, 6).map(p => <PropertyCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
