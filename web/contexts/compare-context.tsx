"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Property } from "@/lib/api";

export const MAX_COMPARE = 5;
const STORE_KEY = "gs.compare";

type CompareCtx = {
  items: Property[];
  isInCompare: (slug: string) => boolean;
  add: (p: Property) => boolean; // returns false if full
  remove: (slug: string) => void;
  clear: () => void;
  count: number;
  full: boolean;
};

const Ctx = createContext<CompareCtx | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Property[]>([]);

  // hydrate from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  // persist
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const isInCompare = useCallback(
    (slug: string) => items.some(i => i.slug === slug),
    [items]
  );

  const add = useCallback((p: Property): boolean => {
    if (items.some(i => i.slug === p.slug)) return true;
    if (items.length >= MAX_COMPARE) return false;
    setItems(prev => [...prev, p]);
    return true;
  }, [items]);

  const remove = useCallback((slug: string) => {
    setItems(prev => prev.filter(i => i.slug !== slug));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return (
    <Ctx.Provider value={{
      items, isInCompare, add, remove, clear,
      count: items.length, full: items.length >= MAX_COMPARE,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompare must be inside CompareProvider");
  return ctx;
}
