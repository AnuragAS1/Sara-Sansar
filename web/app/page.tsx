"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Crown } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { LoadingHouse } from "@/components/loading";
import { properties, Property } from "@/lib/api";

const PropertyMap = dynamic(
  () => import("@/components/property-map").then(m => m.PropertyMap),
  { ssr: false }
);

const CATS = [
  { title: "Residential Buy",  href: "/browse?listing_type=sale&category=residential" },
  { title: "Residential Rent", href: "/browse?listing_type=rent&category=residential" },
  { title: "Commercial Buy",   href: "/browse?listing_type=sale&category=commercial" },
  { title: "Commercial Rent",  href: "/browse?listing_type=rent&category=commercial" },
  { title: "Land",             href: "/browse?category=land" },
  { title: "Premium & Hotels",  href: "/luxury" },
];

export default function HomePage() {
  const [all, setAll] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    properties.publicList({ sort: "-created_at" })
      .then(r => setAll(Array.isArray(r) ? r : (r as any).results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const recent = all.slice(0, 6);

  if (loading) return <LoadingHouse text="Loading Sara Sansar…" />;

  return (
    <div className="rise">
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto container-fluid pt-12 sm:pt-20 pb-14 text-center">
        <p className="text-mute uppercase tracking-[0.4em] text-[10px] sm:text-xs mb-5 font-medium">
          Real estate · Nepal
        </p>
        {/* Larger, bolder heading */}
        <h1 className="font-display tracking-tightest font-bold leading-[0.92]
                        text-[clamp(3rem,10vw,7.5rem)]">
          A home that<br/>
          <span className="italic font-semibold text-ember-600 dark:text-ember-400">feels like</span>{" "}yours.
        </h1>
        <p className="mt-6 sm:mt-8 text-base sm:text-xl text-mute max-w-2xl mx-auto leading-relaxed">
          Verified listings across Kathmandu, Lalitpur, Pokhara, and beyond.
          Filter by Aana, view on a live map, save and compare instantly.
        </p>
        <div className="mt-8 sm:mt-10 flex flex-wrap gap-3 justify-center">
          <Link href="/browse" className="btn-primary text-base px-6 py-3">
            Browse listings <ArrowRight size={16} />
          </Link>
          <Link href="/luxury" className="btn-ghost text-base px-6 py-3">
            <Crown size={15} /> Premium collection
          </Link>
        </div>

        {/* Stats row */}
        <div className="mt-12 grid grid-cols-3 gap-3 sm:gap-5 max-w-2xl mx-auto">
          {[
            { l: "Active listings", v: all.length || "—" },
            { l: "Cities covered", v: "5" },
            { l: "Verified agents", v: "4" },
          ].map(s => (
            <div key={s.l} className="surface rounded-2xl p-4 sm:p-6">
              <div className="font-display text-3xl sm:text-4xl font-bold text-ember-600">{s.v}</div>
              <div className="text-mute text-[10px] sm:text-xs uppercase tracking-wider mt-1.5">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recent listings ──────────────────────────── */}
      {recent.length > 0 && (
        <section className="max-w-7xl mx-auto container-fluid pb-16">
          <div className="flex items-end justify-between mb-7">
            <h2 className="font-display text-3xl sm:text-5xl tracking-tightest font-bold">Recent listings</h2>
            <Link href="/browse" className="link-underline brand-link text-sm font-medium">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {recent.map(p => <PropertyCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ── Browse by intent ─────────────────────────── */}
      <section className="max-w-7xl mx-auto container-fluid pb-16">
        <h2 className="font-display text-3xl sm:text-5xl tracking-tightest font-bold mb-7 text-center">
          Browse by intent
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {CATS.map((c, i) => (
            <Link key={c.title} href={c.href}
              className="surface rounded-2xl p-5 sm:p-8 group hover:border-ember-500 transition-colors">
              <div className="font-mono text-[10px] uppercase tracking-widest text-mute">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="font-display text-xl sm:text-2xl mt-2 group-hover:text-ember-600 transition-colors font-medium">
                {c.title}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Map ──────────────────────────────────────── */}
      {all.length > 0 && (
        <section className="max-w-7xl mx-auto container-fluid pb-16">
          <h2 className="font-display text-3xl sm:text-5xl tracking-tightest font-bold mb-7 text-center">
            Explore on the map
          </h2>
          <PropertyMap properties={all} height={480} />
        </section>
      )}
    </div>
  );
}
