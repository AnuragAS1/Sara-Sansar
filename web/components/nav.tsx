"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, Menu, X } from "lucide-react";
import { Suspense, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "./theme-toggle";

// Extracted so only this small component needs Suspense (useSearchParams requirement)
function NavLinks() {
  const pathname = usePathname();
  const params = useSearchParams();

  function isActive(path: string, query?: Record<string, string>) {
    if (path === "/" && pathname !== "/") return false;
    if (path !== "/" && !pathname.startsWith(path)) return false;
    if (!query) return true;
    return Object.entries(query).every(([k, v]) => params.get(k) === v);
  }

  const links = [
    { label: "Buy",        href: "/browse?listing_type=sale&category=residential",
      active: isActive("/browse", { listing_type: "sale", category: "residential" }) },
    { label: "Rent",       href: "/browse?listing_type=rent",
      active: isActive("/browse", { listing_type: "rent" }) },
    { label: "Land",       href: "/browse?category=land",
      active: isActive("/browse", { category: "land" }) },
    { label: "Commercial", href: "/browse?category=commercial",
      active: isActive("/browse", { category: "commercial" }) },
    { label: "Premium",     href: "/luxury", active: isActive("/luxury") },
    { label: "Our Agents", href: "/agents", active: isActive("/agents") },
    { label: "Tools", href: "/tools", active: isActive("/tools") },
    { label: "Help", href: "/help", active: isActive("/help") },
  ];

  return (
    <>
      {links.map(l => (
        <Link key={l.label} href={l.href}
          className={`link-underline py-1 text-sm font-medium ${l.active ? "active text-ember-600 dark:text-ember-400" : ""}`}>
          {l.label}
        </Link>
      ))}
    </>
  );
}

export function Nav() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isWatchlist = pathname === "/watchlist";
  const isDashboard = pathname.startsWith("/agent/dashboard");

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur-xl shadow-sm">
      <div className="max-w-7xl mx-auto container-fluid">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo — large and bold as requested */}
          <Link href="/" className="flex items-baseline gap-2 shrink-0">
            <span className="font-display font-semibold tracking-tightest leading-none"
              style={{ fontSize: "clamp(1.4rem, 3.5vw, 2rem)" }}>
              Sara<span className="text-ember-500">·</span>Sansar
            </span>
            <span className="text-mute text-[10px] uppercase tracking-[0.2em] hidden sm:inline opacity-70">
              सारासंसार
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-5">
            <Suspense fallback={null}>
              <NavLinks />
            </Suspense>
            <Link href={user?.is_agent ? "/agent/listings/new" : "/agent/register"}
              className="link-underline brand-link py-1 text-sm font-medium">
              List Property
            </Link>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {!loading && user && (
              <Link href="/watchlist" className="p-2 hover:text-ember-500 transition-colors" title="Watchlist">
                <Heart size={18} className={isWatchlist ? "fill-ember-500 text-ember-500" : ""} />
              </Link>
            )}

            {!loading && !user && (
              <>
                <Link href="/login" className="text-sm font-medium link-underline hidden sm:inline">Sign in</Link>
                <Link href="/signup" className="btn-primary text-sm py-2 px-4">Sign up</Link>
              </>
            )}

            {!loading && user && (
              <div className="hidden sm:flex items-center gap-3">
                {user.is_agent && (
                  <Link href="/agent/dashboard"
                    className={`text-sm font-medium link-underline ${isDashboard ? "active" : ""}`}>
                    Dashboard
                  </Link>
                )}
                <button onClick={logout} className="text-sm text-mute hover:text-ember-500">Sign out</button>
              </div>
            )}

            <button onClick={() => setOpen(!open)} className="lg:hidden p-2" aria-label="Toggle menu">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-[var(--line)] bg-[var(--bg)] container-fluid py-4 space-y-1 slide-up">
          {[
            { label: "Buy",        href: "/browse?listing_type=sale&category=residential" },
            { label: "Rent",       href: "/browse?listing_type=rent" },
            { label: "Land",       href: "/browse?category=land" },
            { label: "Commercial", href: "/browse?category=commercial" },
            { label: "Premium",     href: "/luxury" },
            { label: "Tools",       href: "/tools" },
            { label: "Help",        href: "/help" },
            { label: "Our Agents", href: "/agents" },
          ].map(l => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)}
              className="block py-2.5 text-sm font-medium border-b border-[var(--line)] last:border-0">
              {l.label}
            </Link>
          ))}
          <Link href={user?.is_agent ? "/agent/listings/new" : "/agent/register"}
            onClick={() => setOpen(false)}
            className="block py-2.5 text-sm font-medium brand-link">
            List Property
          </Link>
          {user?.is_agent && (
            <Link href="/agent/dashboard" onClick={() => setOpen(false)}
              className="block py-2.5 text-sm font-medium">
              Dashboard
            </Link>
          )}
          {user && (
            <button onClick={() => { logout(); setOpen(false); }}
              className="block py-2.5 text-sm text-mute w-full text-left">
              Sign out
            </button>
          )}
          {!user && (
            <Link href="/login" onClick={() => setOpen(false)} className="block py-2.5 text-sm font-medium">
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
