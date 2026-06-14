"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ArrowLeft, X } from "lucide-react";
import { LoadingHouse } from "@/components/loading";
import { properties as propApi, PropertyDetail, formatNPR, sqmToAana } from "@/lib/api";
import { useCompare } from "@/contexts/compare-context";

function CompareContent() {
  const params = useSearchParams();
  const slugsParam = params.get("slugs") || "";
  const slugs = slugsParam.split(",").map(s => s.trim()).filter(Boolean).slice(0, 5);
  const [items, setItems] = useState<PropertyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const { remove } = useCompare();

  useEffect(() => {
    if (slugs.length === 0) { setLoading(false); return; }
    propApi.compare(slugs).then(setItems).catch(() => {}).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugsParam]);

  if (loading) return <LoadingHouse text="Loading comparison…" />;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto container-fluid py-20 text-center rise">
        <h1 className="font-display text-3xl tracking-tightest mb-3">Nothing to compare</h1>
        <p className="text-mute mb-6 text-sm">Add up to 5 properties from any listing card to compare them side-by-side.</p>
        <Link href="/browse" className="btn-primary inline-flex">Browse listings</Link>
      </div>
    );
  }

  function dropOne(slug: string) {
    remove(slug);
    setItems(prev => prev.filter(p => p.slug !== slug));
  }

  const rows: Array<{ label: string; render: (p: PropertyDetail) => React.ReactNode }> = [
    { label: "Price", render: p => <span className="font-display text-lg text-ember-600">{formatNPR(p.price)}</span> },
    { label: "Listing", render: p => <span className="capitalize">{p.listing_type}</span> },
    { label: "Type", render: p => <span className="capitalize">{p.property_type.replace("_"," ")}</span> },
    { label: "Category", render: p => <span className="capitalize">{p.category}</span> },
    { label: "City", render: p => p.city },
    { label: "Address", render: p => <span className="text-xs">{p.address}</span> },
    { label: "Area", render: p => `${sqmToAana(p.area_sqm)} aana` },
    { label: "Bedrooms", render: p => p.bedrooms || "—" },
    { label: "Bathrooms", render: p => p.bathrooms || "—" },
    { label: "Parking", render: p => (p as any).parking > 0 ? `${(p as any).parking} car` : "—" },
    { label: "Living rooms", render: p => p.living_rooms || "—" },
    { label: "Floors", render: p => p.floors || "—" },
    { label: "Built year", render: p => p.built_year || "—" },
    { label: "Luxury", render: p => p.is_luxury ? "✓ Yes" : "—" },
    { label: "Agent", render: p => <span className="text-xs">{p.agent_name}</span> },
    { label: "Top amenities", render: p => (
      <ul className="text-xs space-y-1">
        {(p.nearby_amenities ?? []).slice(0,3).map((a,i) => <li key={i}>· {a.name} ({a.distance_m}m)</li>)}
      </ul>
    )},
  ];

  return (
    <div className="max-w-7xl mx-auto container-fluid py-6 sm:py-10 rise">
      <Link href="/browse" className="inline-flex items-center gap-2 text-mute hover:text-ember-500 text-sm mb-6">
        <ArrowLeft size={16} /> Back to browse
      </Link>
      <h1 className="font-display text-3xl sm:text-5xl tracking-tightest mb-2">Compare</h1>
      <p className="text-mute text-sm mb-8">{items.length} of 5 properties side-by-side.</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="text-left p-3 text-[10px] uppercase tracking-widest text-mute w-32 sticky left-0 bg-[var(--bg)] z-10">
                Property
              </th>
              {items.map(p => (
                <th key={p.slug} className="p-3 align-top min-w-[180px]">
                  <div className="surface rounded-xl p-3 relative">
                    <button onClick={() => dropOne(p.slug)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--bg)] grid place-items-center hover:text-ember-500"
                      aria-label="Remove">
                      <X size={12} />
                    </button>
                    {p.gallery_items?.[0] && (
                      <img src={p.gallery_items[0].url} alt={p.title}
                        className="w-full aspect-[4/3] object-cover rounded-lg mb-2" />
                    )}
                    <Link href={`/property/${p.slug}`} className="font-display text-base leading-tight line-clamp-2 hover:text-ember-500 transition-colors block">
                      {p.title}
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-t border-[var(--line)]">
                <td className="text-mute text-[10px] uppercase tracking-widest p-3 sticky left-0 bg-[var(--bg)] z-10">{row.label}</td>
                {items.map(p => (
                  <td key={p.slug} className="p-3 align-top text-sm">{row.render(p)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<LoadingHouse text="Loading comparison…" />}>
      <CompareContent />
    </Suspense>
  );
}
