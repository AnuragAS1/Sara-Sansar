"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, GitCompare, Trash2 } from "lucide-react";
import { useCompare } from "@/contexts/compare-context";
import { formatNPR } from "@/lib/api";

export function CompareTray() {
  const router = useRouter();
  const { items, remove, clear, count } = useCompare();

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 slide-up px-3 pb-3 pointer-events-none">
      <div className="max-w-5xl mx-auto pointer-events-auto">
        <div className="surface rounded-2xl shadow-card dark:shadow-card-dark p-3 sm:p-4 flex items-center gap-3">
          <GitCompare size={18} className="text-ember-500 shrink-0" />
          <div className="flex-1 flex items-center gap-2 overflow-x-auto">
            {items.map(p => (
              <div key={p.slug}
                className="relative shrink-0 surface rounded-lg overflow-hidden flex items-center gap-2 pr-7 pl-1 py-1">
                {p.primary_image && (
                  <img src={p.primary_image} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                )}
                <div className="text-xs leading-tight min-w-0">
                  <div className="font-medium truncate max-w-[100px] sm:max-w-[140px]">{p.title}</div>
                  <div className="text-mute text-[10px]">{formatNPR(p.price)}</div>
                </div>
                <button onClick={() => remove(p.slug)}
                  className="absolute top-1 right-1 text-mute hover:text-ember-500 transition-colors"
                  aria-label="Remove">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={clear} className="text-mute hover:text-ember-500 p-1" title="Clear all">
              <Trash2 size={16} />
            </button>
            <Link
              href={`/compare?slugs=${items.map(i => i.slug).join(",")}`}
              className="btn-primary text-xs py-2"
            >
              Compare {count} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
