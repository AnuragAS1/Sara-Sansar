"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LoadingHouse } from "@/components/loading";
import { PropertyCard } from "@/components/property-card";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { properties as propApi, Property } from "@/lib/api";

export default function WatchlistPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(() => {
    propApi.savedListings()
      .then(r => setItems(r.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login?next=/watchlist"); return; }
    fetchSaved();
  }, [user, authLoading, router, fetchSaved]);

  if (authLoading || loading) return <LoadingHouse text="Loading watchlist…" />;

  return (
    <div className="max-w-7xl mx-auto container-fluid py-10 sm:py-16 rise">
      <p className="text-mute uppercase tracking-[0.3em] text-[10px] mb-3">Your watchlist</p>
      <h1 className="font-display text-3xl sm:text-5xl tracking-tightest mb-8">Saved properties</h1>

      {items.length === 0 ? (
        <div className="surface rounded-2xl p-12 text-center">
          <p className="font-display text-2xl mb-3">Nothing saved yet</p>
          <p className="text-mute mb-6 text-sm">Tap the heart icon on any listing to save it.</p>
          <Link href="/browse" className="btn-primary inline-flex">Browse listings</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {items.map(p => <PropertyCard key={p.id} p={p} onSaveToggle={fetchSaved} />)}
        </div>
      )}
    </div>
  );
}
