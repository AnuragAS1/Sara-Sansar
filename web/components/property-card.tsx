"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BedDouble, Bath, Maximize2, MapPin, Heart, GitCompare } from "lucide-react";
import { useState } from "react";
import { formatNPR, Property, sqmToAana, properties as propApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useCompare, MAX_COMPARE } from "@/contexts/compare-context";

const TYPE_LABEL: Record<string, string> = { sale: "For Sale", rent: "For Rent", lease: "For Lease" };

export function PropertyCard({ p, view = "grid", onSaveToggle }: {
  p: Property; view?: "grid" | "list"; onSaveToggle?: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { add, remove, isInCompare, full } = useCompare();
  const [saved, setSaved] = useState(p.is_saved);
  const [saving, setSaving] = useState(false);

  const inCompare = isInCompare(p.slug);

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const res = await propApi.toggleSave(p.slug);
      setSaved(res.saved);
      onSaveToggle?.();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  function toggleCompare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (inCompare) remove(p.slug);
    else {
      const ok = add(p);
      if (!ok) alert(`You can compare up to ${MAX_COMPARE} properties.`);
    }
  }

  return view === "list"
    ? <ListCard p={p} saved={saved} inCompare={inCompare} compareFull={full}
        onSave={toggleSave} onCompare={toggleCompare} />
    : <GridCard p={p} saved={saved} inCompare={inCompare} compareFull={full}
        onSave={toggleSave} onCompare={toggleCompare} />;
}

type CardProps = {
  p: Property; saved: boolean; inCompare: boolean; compareFull: boolean;
  onSave: (e: React.MouseEvent) => void; onCompare: (e: React.MouseEvent) => void;
};

function ActionButtons({ saved, inCompare, compareFull, onSave, onCompare }: Omit<CardProps, "p">) {
  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
      <button onClick={onSave} aria-label={saved ? "Unsave" : "Save"}
        className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 shadow grid place-items-center hover:scale-110 transition-transform">
        <Heart size={15} className={saved ? "fill-ember-500 text-ember-500" : "text-[var(--fg)]"} />
      </button>
      <button onClick={onCompare}
        disabled={!inCompare && compareFull}
        aria-label={inCompare ? "Remove from compare" : "Add to compare"}
        className={`w-10 h-10 rounded-full shadow grid place-items-center hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${
          inCompare ? "bg-ember-500 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-[var(--fg)]"
        }`}>
        <GitCompare size={14} />
      </button>
    </div>
  );
}

function GridCard({ p, ...rest }: CardProps) {
  return (
    <Link href={`/property/${p.slug}`}
      className="surface rounded-2xl overflow-hidden block group hover:border-ember-500 transition-colors">
      <div className="aspect-[4/3] bg-[var(--brand-soft)] overflow-hidden relative">
        {p.primary_image ? (
          <img src={p.primary_image} alt={p.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full grid place-items-center text-mute font-display text-2xl">{p.city}</div>
        )}
        <span className="absolute top-3 left-3 bg-[var(--bg)]/90 backdrop-blur px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-medium">
          {TYPE_LABEL[p.listing_type] || p.listing_type}
        </span>
        {p.is_luxury && (
          <span className="absolute bottom-3 left-3 bg-ember-700 text-white px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-medium">
            Luxury
          </span>
        )}
        <ActionButtons {...rest} />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-mute text-xs mb-1.5">
          <MapPin size={11} /><span>{p.city}</span><span>·</span>
          <span className="capitalize">{p.property_type.replace("_", " ")}</span>
        </div>
        <h3 className="font-display text-lg leading-tight line-clamp-2 min-h-[2.75rem]">{p.title}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-xl text-ember-600 dark:text-ember-400">{formatNPR(p.price)}</span>
          {p.listing_type === "rent" && <span className="text-mute text-xs">/ mo</span>}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--line)] flex items-center gap-3 text-mute text-xs">
          {p.bedrooms > 0 && <span className="inline-flex items-center gap-1"><BedDouble size={13} />{p.bedrooms}</span>}
          {p.bathrooms > 0 && <span className="inline-flex items-center gap-1"><Bath size={13} />{p.bathrooms}</span>}
          <span className="inline-flex items-center gap-1 ml-auto"><Maximize2 size={13} />{sqmToAana(p.area_sqm)} aana</span>
        </div>
      </div>
    </Link>
  );
}

function ListCard({ p, ...rest }: CardProps) {
  return (
    <Link href={`/property/${p.slug}`}
      className="surface rounded-xl overflow-hidden flex group hover:border-ember-500 transition-colors">
      <div className="w-32 sm:w-48 lg:w-64 shrink-0 bg-[var(--brand-soft)] overflow-hidden relative">
        {p.primary_image ? (
          <img src={p.primary_image} alt={p.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full grid place-items-center text-mute font-display">{p.city}</div>
        )}
        <ActionButtons {...rest} />
      </div>
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center gap-2 text-xs mb-1 flex-wrap">
            <span className="bg-ember-100 dark:bg-ember-900/40 text-ember-700 dark:text-ember-300 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-medium">
              {TYPE_LABEL[p.listing_type]}
            </span>
            <span className="text-mute flex items-center gap-1"><MapPin size={11} />{p.city}</span>
            {p.is_luxury && (
              <span className="bg-ember-700 text-white px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-medium">Luxury</span>
            )}
          </div>
          <h3 className="font-display text-base sm:text-lg leading-tight line-clamp-2">{p.title}</h3>
        </div>
        <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg sm:text-xl text-ember-600 dark:text-ember-400">{formatNPR(p.price)}</span>
            {p.listing_type === "rent" && <span className="text-mute text-xs">/ mo</span>}
          </div>
          <div className="flex items-center gap-3 text-mute text-xs">
            {p.bedrooms > 0 && <span className="inline-flex items-center gap-1"><BedDouble size={12} />{p.bedrooms}</span>}
            {p.bathrooms > 0 && <span className="inline-flex items-center gap-1"><Bath size={12} />{p.bathrooms}</span>}
            <span className="inline-flex items-center gap-1"><Maximize2 size={12} />{sqmToAana(p.area_sqm)} aana</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
