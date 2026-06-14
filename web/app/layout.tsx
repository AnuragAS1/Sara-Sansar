import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { CompareProvider } from "@/contexts/compare-context";
import { Nav } from "@/components/nav";
import { CompareTray } from "@/components/compare-tray";

export const metadata: Metadata = {
  title: "Sara Sansar — Find your home in Nepal",
  description: "Browse properties across Kathmandu, Pokhara, and beyond.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try { const t=localStorage.getItem('gs.theme');
            if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))
              document.documentElement.classList.add('dark');
          } catch{}
        `}} />
      </head>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <CompareProvider>
            <Suspense><Nav /></Suspense>
            <main className="relative z-10 flex-1 pb-24">
              <Suspense>{children}</Suspense>
            </main>
            <footer className="border-t border-[var(--line)] bg-[var(--bg-elev)]">
              <div className="max-w-7xl mx-auto container-fluid py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-mute">
                <span>© 2026 Sara Sansar · Real estate, Nepal</span>
                <div className="surface rounded-lg px-6 py-3 text-center text-[10px] uppercase tracking-widest">
                  Ad space · 728 × 90
                </div>
              </div>
            </footer>
            <CompareTray />
          </CompareProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
