"use client";

export function LoadingHouse({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="loading-house">
          <path d="M24 4L4 20h6v20h28V20h6L24 4z" fill="#10b981" opacity="0.9" />
          <rect x="18" y="26" width="12" height="14" rx="1" fill="var(--bg-elev)" />
          <rect x="21" y="14" width="6" height="6" rx="1" fill="var(--bg-elev)" opacity="0.7" />
        </svg>
        <div className="loading-shadow mx-auto mt-1 w-10 h-1.5 bg-[var(--fg)] rounded-full opacity-20" />
      </div>
      <p className="text-mute text-sm">{text}</p>
    </div>
  );
}
