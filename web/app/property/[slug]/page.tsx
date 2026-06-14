"use client";
import React from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  BedDouble, Bath, Maximize2, MapPin, ArrowLeft, Calculator,
  Heart, Phone, Mail, ChevronLeft, ChevronRight, Layout,
  Calendar, Layers, ChefHat, Car, Play, Volume2, VolumeX,
  RotateCcw, Maximize, Minimize, Video, Image as ImageIcon,
  Compass, AlertCircle, Download, Droplets, Zap, Wifi, Check, BarChart3,
} from "lucide-react";
import { LoadingHouse } from "@/components/loading";
import {
  properties as propApi, PropertyDetail, PropertyMediaT,
  formatNPR, sqmToAana, formatDuration,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useCompare, MAX_COMPARE } from "@/contexts/compare-context";

const PropertyMap = dynamic(
  () => import("@/components/property-map").then(m => m.PropertyMap),
  { ssr: false }
);

const sqmToSqft = (sqm: string | number) => Math.round(parseFloat(String(sqm)) * 10.764);

const AMENITY_ICONS: Record<string, string> = {
  school: "🏫", hospital: "🏥", bus_stop: "🚌", mall: "🏬",
  grocery: "🛒", bank: "🏦", temple: "🛕", park: "🌳",
};

const AMENITY_LABEL: Record<string, { icon: string; label: string }> = {
  water_supply: { icon: "💧", label: "Water Supply" },
  electricity: { icon: "⚡", label: "Electricity" },
  internet: { icon: "📶", label: "Internet / WiFi" },
  car_parking: { icon: "🚗", label: "Car Parking" },
  bike_parking: { icon: "🏍️", label: "Bike Parking" },
  water_tank: { icon: "🪣", label: "Water Tank" },
  water_pump: { icon: "⛽", label: "Water Pump" },
};

const MEDIA_LABEL: Record<string, string> = {
  gallery: "Photo", video_tour: "Tour", video_live: "Live view",
  video_360: "360°", panorama: "Panorama", floorplan: "Floor plan",
};

const AUTOSCROLL_MS = 4000;

// ── MediaGallery ──────────────────────────────────────────────────────────────
function MediaGallery({ items }: { items: PropertyMediaT[] }) {
  const [idx, setIdx] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const progressAnim = useRef<Animation | null>(null);

  const current = items[idx];
  const isVideo = current?.is_video;
  const shouldPause = hovering || (isVideo && videoPlaying);

  const advance = useCallback(() => {
    setIdx(i => (i + 1) % items.length);
    setVideoPlaying(false);
  }, [items.length]);

  const go = (n: number) => {
    setIdx(n);
    setVideoPlaying(false);
    restartProgress();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  function restartProgress() {
    progressAnim.current?.cancel();
    if (progressRef.current) {
      progressAnim.current = progressRef.current.animate(
        [{ width: "0%" }, { width: "100%" }],
        { duration: AUTOSCROLL_MS, fill: "forwards" }
      );
    }
  }

  // Auto-scroll timer
  useEffect(() => {
    if (items.length <= 1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (!shouldPause) {
      restartProgress();
      timerRef.current = setInterval(advance, AUTOSCROLL_MS);
    } else {
      progressAnim.current?.pause();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPause, idx, items.length]);

  if (!items.length) {
    return (
      <div className="aspect-[16/9] surface rounded-2xl grid place-items-center text-mute mb-6">
        No photos
      </div>
    );
  }

  return (
    <div className={`mb-6 sm:mb-8 ${fullscreen ? "fixed inset-0 z-50 bg-black" : ""}`}>
      {/* Main media area */}
      <div
        className={`relative overflow-hidden surface rounded-2xl ${fullscreen ? "rounded-none h-full" : "aspect-[16/9]"}`}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            key={current.url}
            src={current.url}
            className="w-full h-full object-contain bg-black"
            muted={muted}
            playsInline
            controls={false}
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
            onEnded={() => { setVideoPlaying(false); advance(); }}
          />
        ) : (
          <img
            src={current.url}
            alt=""
            className="w-full h-full object-cover transition-opacity duration-500"
          />
        )}

        {/* Video: play overlay */}
        {isVideo && !videoPlaying && (
          <button
            onClick={() => videoRef.current?.play()}
            className="absolute inset-0 flex items-center justify-center group"
            aria-label="Play video"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--bg)]/90 backdrop-blur grid place-items-center shadow-card group-hover:scale-110 transition-transform">
              <Play size={24} className="text-ember-500 ml-1" />
            </div>
          </button>
        )}

        {/* Video controls overlay */}
        {isVideo && videoPlaying && (
          <div className="absolute bottom-14 right-4 flex items-center gap-2">
            <button
              onClick={() => { videoRef.current?.pause(); setVideoPlaying(false); }}
              className="w-8 h-8 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white hover:bg-black/80"
              aria-label="Pause"
            >
              <div className="flex gap-0.5"><div className="w-1 h-3 bg-white rounded-sm"/><div className="w-1 h-3 bg-white rounded-sm"/></div>
            </button>
            <button
              onClick={() => setMuted(m => { if (videoRef.current) videoRef.current.muted = !m; return !m; })}
              className="w-8 h-8 rounded-full bg-black/60 backdrop-blur grid place-items-center text-white hover:bg-black/80"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        )}

        {/* Media type badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="bg-[var(--bg)]/90 backdrop-blur px-2.5 py-1 rounded-full text-[10px] uppercase tracking-widest font-medium flex items-center gap-1">
            {isVideo ? <Video size={10} /> : <ImageIcon size={10} />}
            {MEDIA_LABEL[current.media_type] || current.media_type}
          </span>
          {current.media_type === "video_360" && (
            <span className="bg-ember-500 text-white px-2 py-1 rounded-full text-[10px] uppercase tracking-widest font-medium flex items-center gap-1">
              <Compass size={10} /> 360°
            </span>
          )}
        </div>

        {/* Fullscreen toggle */}
        <button
          onClick={() => setFullscreen(f => !f)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--bg)]/80 backdrop-blur grid place-items-center text-mute hover:text-ember-500 transition-colors"
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {fullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>

        {/* Prev / Next */}
        {items.length > 1 && (
          <>
            <button
              onClick={() => go((idx - 1 + items.length) % items.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[var(--bg)]/90 backdrop-blur grid place-items-center hover:scale-110 transition-transform shadow"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => go((idx + 1) % items.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[var(--bg)]/90 backdrop-blur grid place-items-center hover:scale-110 transition-transform shadow"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Counter */}
        {items.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur text-white text-xs px-3 py-1 rounded-full">
            {idx + 1} / {items.length}
          </div>
        )}

        {/* Progress bar (autoscroll indicator) */}
        {items.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
            <div ref={progressRef} className="h-full bg-ember-400" style={{ width: "0%" }} />
          </div>
        )}
      </div>

      {/* Dot + thumbnail strip */}
      {items.length > 1 && (
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => go(i)}
              className={`shrink-0 relative rounded-lg overflow-hidden transition-all ${
                i === idx
                  ? "ring-2 ring-ember-500 ring-offset-1 ring-offset-[var(--bg)]"
                  : "opacity-60 hover:opacity-90"
              }`}
              style={{ width: 52, height: 36 }}
              aria-label={`Go to item ${i + 1}`}
            >
              {item.is_video ? (
                <div className="w-full h-full bg-black grid place-items-center">
                  {item.thumbnail_url
                    ? <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    : <Play size={14} className="text-white" />
                  }
                  <div className="absolute bottom-0.5 right-0.5">
                    <Video size={8} className="text-white" />
                  </div>
                </div>
              ) : (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 360 Section ───────────────────────────────────────────────────────────────
function Section360({ items }: { items: PropertyMediaT[] }) {
  if (!items?.length) return null;
  const item = items[0];
  return (
    <div>
      <h2 className="font-display text-2xl tracking-tightest mb-4 flex items-center gap-2">
        <Compass size={20} className="text-ember-500" /> 360° experience
      </h2>
      <div className="surface rounded-2xl overflow-hidden">
        {item.is_video ? (
          <div className="relative aspect-[2/1] bg-black">
            <video
              src={item.url}
              className="w-full h-full object-cover"
              controls
              playsInline
              muted
            />
            <div className="absolute inset-0 pointer-events-none flex items-start justify-start p-3">
              <span className="bg-ember-500 text-white text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Compass size={10} /> 360° Equirectangular — best in VR or mobile
              </span>
            </div>
          </div>
        ) : (
          <div className="relative aspect-[2/1] bg-black">
            <img src={item.url} alt="360° panorama" className="w-full h-full object-cover" />
            <div className="absolute inset-0 pointer-events-none flex items-start justify-start p-3">
              <span className="bg-ember-500 text-white text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Compass size={10} /> 360° Panorama
              </span>
            </div>
          </div>
        )}
        {item.caption && (
          <p className="px-5 py-3 text-mute text-sm">{item.caption}</p>
        )}
        {items.length > 1 && (
          <div className="flex gap-2 px-5 pb-4">
            {items.slice(1).map(m => (
              <div key={m.id} className="w-24 h-14 rounded-lg overflow-hidden surface">
                {m.is_video
                  ? <div className="w-full h-full bg-black grid place-items-center"><Video size={16} className="text-mute" /></div>
                  : <img src={m.url} alt="" className="w-full h-full object-cover" />
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PropertyDetailPage() {
  const router = useRouter();
  const { slug } = useParams() as { slug: string };
  const { user } = useAuth();
  const { add, remove, isInCompare, full } = useCompare();

  const [p, setP] = useState<PropertyDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    propApi.get(slug).then(d => { setP(d); setSaved(d.is_saved); }).catch(() => {});
  }, [slug]);

  if (!p) return <LoadingHouse text="Loading property…" />;

  const fps = p.floor_plans ?? [];
  const inCompare = isInCompare(p.slug);

  async function toggleSave() {
    if (!user) { router.push(`/login?next=/property/${slug}`); return; }
    if (saving) return;
    setSaving(true);
    try { const r = await propApi.toggleSave(slug); setSaved(r.saved); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  function toggleCompare() {
    if (inCompare) { remove(p!.slug); return; }
    const lite = {
      id: p!.id, slug: p!.slug, title: p!.title,
      listing_type: p!.listing_type, category: p!.category, property_type: p!.property_type,
      city: p!.city, address: p!.address, price: p!.price, area_sqm: p!.area_sqm,
      bedrooms: p!.bedrooms, bathrooms: p!.bathrooms, living_rooms: p!.living_rooms, kitchens: p!.kitchens,
      latitude: p!.latitude, longitude: p!.longitude,
      is_luxury: p!.is_luxury, is_featured: p!.is_featured, has_video: p!.gallery_items.some(m => m.is_video),
      primary_image: p!.gallery_items.find(m => m.is_primary)?.url || p!.gallery_items[0]?.url || null,
      agent_name: p!.agent_name, is_saved: saved, status: p!.status, created_at: p!.created_at,
    };
    if (!add(lite as any)) alert(`You can compare up to ${MAX_COMPARE} properties.`);
  }

  function generateBrochure(prop: PropertyDetail) {
    const sqft = sqmToSqft(prop.area_sqm).toLocaleString();
    const aana = sqmToAana(prop.area_sqm);
    const imgUrl = (prop.gallery_items ?? []).find(m => m.is_primary)?.url || (prop.gallery_items ?? [])[0]?.url || "";
    const priceText = formatNPR(prop.price);
    const facts = [
      `<div class="f"><div class="fl">Area</div><div class="fv">${aana} aana</div><div class="fs">${sqft} sq ft</div></div>`,
      prop.bedrooms > 0 ? `<div class="f"><div class="fl">Bedrooms</div><div class="fv">${prop.bedrooms}</div></div>` : "",
      prop.bathrooms > 0 ? `<div class="f"><div class="fl">Bathrooms</div><div class="fv">${prop.bathrooms}</div></div>` : "",
      (prop as any).parking > 0 ? `<div class="f"><div class="fl">Parking</div><div class="fv">${(prop as any).parking} car</div></div>` : "",
      prop.floors > 0 ? `<div class="f"><div class="fl">Floors</div><div class="fv">${prop.floors}</div></div>` : "",
      prop.built_year ? `<div class="f"><div class="fl">Built</div><div class="fv">${prop.built_year}</div></div>` : "",
    ].filter(Boolean).join("\n");
    const amenities = (prop.nearby_amenities ?? []).slice(0,6).map(a => `<div class="am">${a.name} — ${a.distance_m}m</div>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${prop.title} — Sara Sansar</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;color:#1a1a1a;max-width:800px;margin:0 auto;padding:40px}.hd{text-align:center;border-bottom:3px solid #e85d2a;padding-bottom:20px;margin-bottom:24px}.br{font-size:28px;font-weight:700;color:#e85d2a}.bn{font-size:14px;color:#888;margin-top:4px}h1{font-size:24px;margin:16px 0 8px}.pr{font-size:28px;font-weight:700;color:#e85d2a;margin:8px 0}.mt{font-size:13px;color:#666;margin-bottom:16px}.iw{width:100%;max-height:360px;overflow:hidden;border-radius:12px;margin:20px 0}.iw img{width:100%;object-fit:cover}.fs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}.f{background:#f8f5f2;border-radius:8px;padding:12px;text-align:center}.fl{font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#888}.fv{font-size:20px;font-weight:600;margin-top:4px}.fs{font-size:10px;color:#888}.sec{margin:24px 0}.sec h2{font-size:18px;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:12px}.ds{font-size:14px;line-height:1.7;color:#444}.ft{text-align:center;margin-top:40px;padding-top:16px;border-top:2px solid #e85d2a;font-size:12px;color:#888}.ams{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:13px}.am{background:#f8f5f2;padding:8px 12px;border-radius:6px}@media print{body{padding:20px}}</style></head><body>
<div class="hd"><div class="br">Sara·Sansar</div><div class="bn">सारासंसार · Real Estate Nepal</div></div>
${imgUrl ? `<div class="iw"><img src="${imgUrl}" /></div>` : ""}
<h1>${prop.title}</h1>
<div class="mt">${prop.address}, ${prop.city} · ${prop.property_type.replace("_"," ")} · For ${prop.listing_type}</div>
<div class="pr">${priceText}</div>
<div class="fs-grid">${facts}</div>
<div class="sec"><h2>About this property</h2><p class="ds">${prop.description}</p></div>
${amenities ? `<div class="sec"><h2>Nearby</h2><div class="ams">${amenities}</div></div>` : ""}
<div class="sec"><h2>Contact</h2><p class="ds">Agent: ${prop.agent_name}<br/>Email: ${prop.agent_email}${prop.agent_phone ? "<br/>Phone: " + prop.agent_phone : ""}</p></div>
<div class="ft">Sara Sansar · sarasansar.np · Generated ${new Date().toLocaleDateString()}</div>
<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div className="max-w-6xl mx-auto container-fluid py-6 sm:py-10 rise">
      <Link href="/browse" className="inline-flex items-center gap-2 text-mute hover:text-ember-500 text-sm mb-6">
        <ArrowLeft size={16} /> Back to browse
      </Link>

      {/* Gallery with autoscroll */}
      <MediaGallery items={p.gallery_items ?? []} />

      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6 sm:space-y-10">

          {/* Title block */}
          <div>
            <div className="flex flex-wrap items-center gap-2 text-mute text-xs mb-3">
              <MapPin size={13} /><span>{p.address}, {p.city}</span><span>·</span>
              <span className="capitalize">{p.property_type.replace("_", " ")}</span>
              <span className="bg-ember-100 dark:bg-ember-900/40 text-ember-700 dark:text-ember-300 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-medium">
                For {p.listing_type}
              </span>
              {p.is_luxury && (
                <span className="bg-ember-700 text-white px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-medium">Luxury</span>
              )}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tightest leading-tight">{p.title}</h1>
            <div className="mt-4 flex items-baseline gap-2 flex-wrap">
              <span className="font-display text-3xl sm:text-4xl text-ember-600 dark:text-ember-400">{formatNPR(p.price)}</span>
              {p.listing_type === "rent" && <span className="text-mute">/ month</span>}
              {p.price_negotiable && <span className="text-mute text-xs uppercase tracking-widest">· negotiable</span>}
            </div>
            <div className="mt-5 flex gap-2 flex-wrap">
              <button onClick={toggleSave} disabled={saving}
                className={`btn-ghost ${saved ? "border-ember-500 text-ember-500" : ""}`}>
                <Heart size={14} className={saved ? "fill-ember-500" : ""} />
                {saved ? "Saved" : "Save"}
              </button>
              <button onClick={toggleCompare} disabled={!inCompare && full}
                className={`btn-ghost ${inCompare ? "border-ember-500 text-ember-500" : ""}`}>
                {inCompare ? "✓ In compare" : "Add to compare"}
              </button>
              <button onClick={() => generateBrochure(p)} className="btn-ghost">
                <Download size={14} /> Download Brochure
              </button>
            </div>
          </div>

          {/* Quick facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Fact icon={<Maximize2 size={16} />} label="Area" value={`${sqmToAana(p.area_sqm)} aana`} sub={`${sqmToSqft(p.area_sqm).toLocaleString()} sq ft`} />
            {p.bedrooms > 0 && <Fact icon={<BedDouble size={16} />} label="Bedrooms" value={p.bedrooms} />}
            {p.bathrooms > 0 && <Fact icon={<Bath size={16} />} label="Bathrooms" value={p.bathrooms} />}
            {(p as any).parking > 0 && <Fact icon={<Car size={16} />} label="Parking" value={`${(p as any).parking} car${(p as any).parking > 1 ? "s" : ""}`} />}
            {p.floors > 0 && <Fact icon={<Layers size={16} />} label="Floors" value={p.floors} />}
            {p.built_year && <Fact icon={<Calendar size={16} />} label="Built" value={p.built_year} />}
          </div>

          {/* Description */}
          <div>
            <h2 className="font-display text-2xl tracking-tightest mb-3">About this property</h2>
            <p className="text-mute leading-relaxed text-sm sm:text-base whitespace-pre-wrap">{p.description}</p>
          </div>

          {/* ── Property Details ────────────────────────────────────── */}
          <div>
            <h2 className="font-display text-2xl tracking-tightest mb-4">Property details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <DetailRow label="Building type" value={p.property_type?.replace("_"," ") || "—"} />
              <DetailRow label="Property condition" value={(p as any).furnishing_status?.replace("_"," ") || "—"} />
              <DetailRow label="Road access" value={(p as any).road_access_ft ? `${(p as any).road_access_ft} ft` : "—"} />
              <DetailRow label="Road type" value={(p as any).road_type?.replace("_"," ") || "—"} />
              <DetailRow label="Built in" value={p.built_year ? `${p.built_year} A.D.` : "—"} />
              {(p as any).built_year_bs && <DetailRow label="Built (B.S.)" value={`${(p as any).built_year_bs} B.S.`} />}
              <DetailRow label="Facing direction" value={(p as any).facing_direction?.replace("_"," ") || "—"} />
              <DetailRow label="Total land area" value={`${sqmToAana(p.area_sqm)} aana (${sqmToSqft(p.area_sqm).toLocaleString()} sq ft)`} />
              {(p as any).built_area_sqft && <DetailRow label="Built area" value={`${parseFloat((p as any).built_area_sqft).toLocaleString()} sq ft`} />}
              <DetailRow label="Water source" value={(p as any).water_source || "—"} />
              <DetailRow label="Sewage" value={(p as any).sewage_system || "—"} />
              <DetailRow label="Bank loan eligible" value={(p as any).bank_loan_eligible ? "✅ Yes" : "❌ No"} />
            </div>
          </div>

          {/* ── Amenities ────────────────────────────────────────────── */}
          {((p as any).amenities ?? []).length > 0 && (
            <div>
              <h2 className="font-display text-2xl tracking-tightest mb-4">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {((p as any).amenities ?? []).map((a: string) => {
                  const info = AMENITY_LABEL[a] || { icon: "✓", label: a.replace("_"," ") };
                  return (
                    <div key={a} className="surface rounded-xl p-3 flex items-center gap-3">
                      <span className="text-xl">{info.icon}</span>
                      <span className="text-sm font-medium capitalize">{info.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 360 section */}
          <Section360 items={p.media_360 ?? []} />

          {/* Floor plans */}
          {(fps?.length ?? 0) > 0 && (
            <div>
              <h2 className="font-display text-2xl tracking-tightest mb-4 flex items-center gap-2">
                <Layout size={20} className="text-ember-500" /> Floor plans
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {fps.map(fp => (
                  <a key={fp.id} href={fp.url} target="_blank" rel="noopener noreferrer"
                    className="surface rounded-xl overflow-hidden hover:border-ember-500 transition-colors block">
                    <img src={fp.url} alt={fp.caption || "Floor plan"}
                      className="w-full aspect-[4/3] object-cover bg-white" />
                    {fp.caption && <div className="px-3 py-2 text-xs text-mute">{fp.caption}</div>}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Nearby */}
          {(p.nearby_amenities?.length ?? 0) > 0 && (
            <div>
              <h2 className="font-display text-2xl tracking-tightest mb-4">Nearby</h2>
              <div className="grid grid-cols-2 gap-2">
                {(p.nearby_amenities ?? []).slice(0, 8).map((a, i) => (
                  <div key={i} className="surface rounded-xl p-3 flex items-center gap-3">
                    <span className="text-xl">{AMENITY_ICONS[a.type] || "📍"}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.name}</div>
                      <div className="text-xs text-mute">{a.distance_m}m</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map with nearby markers */}
          <div>
            <h2 className="font-display text-2xl tracking-tightest mb-4">Location & nearby</h2>
            <PropertyMap properties={[{
              ...p, primary_image: p.gallery_items[0]?.url || null,
              has_video: false, is_saved: saved,
            } as never]} height={400} />
            {/* Nearby categories */}
            {(p.nearby_amenities ?? []).length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["school", "hospital", "mall", "bank"].map(type => {
                  const items = (p.nearby_amenities ?? []).filter(a => a.type === type);
                  if (!items.length) return null;
                  return (
                    <div key={type} className="surface rounded-xl p-3">
                      <div className="text-xs text-mute uppercase tracking-widest mb-1">{AMENITY_ICONS[type] || "📍"} {type}s</div>
                      {items.map((a, i) => (
                        <div key={i} className="text-sm">{a.name} <span className="text-mute text-xs">({a.distance_m}m)</span></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Similar properties */}
          <SimilarProperties category={p.category} city={p.city} currentSlug={p.slug} />

        </div>

        {/* Sidebar — agent + EMI */}
        <aside className="lg:sticky lg:top-24 self-start space-y-4">
          <div className="surface rounded-2xl p-5 sm:p-6 space-y-4">
            <div>
              <p className="text-mute text-[10px] uppercase tracking-widest mb-2">Listed by</p>
              <p className="font-display text-xl">{p.agent_name}</p>
            </div>
            <div className="space-y-2 text-sm">
              {p.agent_phone && (
                <a href={`tel:${p.agent_phone}`} className="flex items-center gap-2 hover:text-ember-500">
                  <Phone size={14} /> {p.agent_phone}
                </a>
              )}
              <a href={`mailto:${p.agent_email}`} className="flex items-center gap-2 hover:text-ember-500 break-all">
                <Mail size={14} /> {p.agent_email}
              </a>
            </div>
            <button className="btn-primary w-full">Request a viewing</button>
            <button className="btn-ghost w-full">Send message</button>
          </div>

          {/* Interactive EMI Calculator */}
          <EmiCalculator price={p.price} />
          <EmiTimelineWrapper price={p.price} />
        </aside>
      </div>
    </div>
  );
}

function Fact({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="surface rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-2 text-mute text-xs mb-1">{icon}{label}</div>
      <div className="font-display text-xl sm:text-2xl">{value}</div>
      {sub && <div className="text-mute text-[10px] mt-0.5">{sub}</div>}
    </div>
  );
}

// ── EMI Timeline Wrapper ───────────────────────────────────────────────────────
function EmiTimelineWrapper({ price }: { price: number }) {
  const defaultLoan = Math.round((price / 100) * 0.8 / 100_000) / 10;
  const principal = defaultLoan * 100_000 * 100;
  const r = 9.5 / 100 / 12;
  const n = 20 * 12;
  const emi = r === 0 ? principal / n : principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return <EmiTimeline emi={emi} years={20} rate={9.5} />;
}

// ── Detail Row ─────────────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-mute mb-1">{label}</div>
      <div className="text-sm font-medium capitalize">{value}</div>
    </div>
  );
}

// ── Similar Properties ────────────────────────────────────────────────────────
function SimilarProperties({ category, city, currentSlug }: { category: string; city: string; currentSlug: string }) {
  const [items, setItems] = React.useState<any[]>([]);
  React.useEffect(() => {
    propApi.publicList({ category, city, page_size: "5" })
      .then((r: any) => {
        const list = Array.isArray(r) ? r : r.results || [];
        setItems(list.filter((p: any) => p.slug !== currentSlug).slice(0, 4));
      })
      .catch(() => {});
  }, [category, city, currentSlug]);

  if (!items.length) return null;
  return (
    <div>
      <h2 className="font-display text-2xl tracking-tightest mb-4">Similar properties</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((p: any) => (
          <a key={p.id} href={`/property/${p.slug}`} className="surface rounded-xl overflow-hidden hover:shadow-md transition-shadow block">
            {p.primary_image && <img src={p.primary_image} alt="" className="w-full aspect-[16/9] object-cover" />}
            <div className="p-3">
              <div className="font-medium text-sm line-clamp-1">{p.title}</div>
              <div className="text-ember-600 font-display text-lg mt-1">{formatNPR(p.price)}</div>
              <div className="text-xs text-mute">{p.city} · {p.property_type?.replace("_"," ")}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── EMI Payment Timeline ──────────────────────────────────────────────────────
function EmiTimeline({ emi, years, rate }: { emi: number; years: number; rate: number }) {
  const n = years * 12;
  const r = rate / 100 / 12;
  const principal = r === 0 ? emi * n : emi * (1 - Math.pow(1 + r, -n)) / r;
  const totalPaid = emi * n;
  const totalInterest = totalPaid - principal;

  // Generate yearly breakdown
  const yearlyData: { year: number; principal: number; interest: number }[] = [];
  let balance = principal;
  for (let y = 1; y <= Math.min(years, 30); y++) {
    let yPrincipal = 0, yInterest = 0;
    for (let m = 0; m < 12; m++) {
      const iPayment = balance * r;
      const pPayment = emi - iPayment;
      yInterest += iPayment;
      yPrincipal += pPayment;
      balance = Math.max(0, balance - pPayment);
    }
    yearlyData.push({ year: y, principal: yPrincipal, interest: yInterest });
  }

  const maxVal = Math.max(...yearlyData.map(d => d.principal + d.interest));
  const barW = Math.floor(100 / Math.min(yearlyData.length, 15));

  return (
    <div className="surface rounded-2xl p-5 sm:p-6 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 size={18} className="text-emerald-500" />
        <h3 className="font-display text-lg font-semibold">Payment timeline</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="surface rounded-lg p-2"><div className="text-mute">Principal</div><div className="font-bold text-emerald-600">{formatNPR(Math.round(principal))}</div></div>
        <div className="surface rounded-lg p-2"><div className="text-mute">Interest</div><div className="font-bold text-amber-600">{formatNPR(Math.round(totalInterest))}</div></div>
        <div className="surface rounded-lg p-2"><div className="text-mute">Total</div><div className="font-bold">{formatNPR(Math.round(totalPaid))}</div></div>
      </div>
      {/* Bar chart */}
      <div className="flex items-end gap-px h-28 mt-2">
        {yearlyData.slice(0, 15).map((d, i) => {
          const pH = (d.principal / maxVal) * 100;
          const iH = (d.interest / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end" title={`Yr ${d.year}: P=${Math.round(d.principal/100)} I=${Math.round(d.interest/100)}`}>
              <div className="bg-emerald-400 rounded-t-sm" style={{ height: `${pH}%` }} />
              <div className="bg-amber-400" style={{ height: `${iH}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-mute">
        <span>Yr 1</span><span>Yr {Math.min(years, 15)}</span>
      </div>
      <div className="flex gap-3 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400" /> Principal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400" /> Interest</span>
      </div>
    </div>
  );
}

// ── Interactive EMI Calculator ────────────────────────────────────────────────
function EmiCalculator({ price }: { price: number }) {
  const defaultLoan = Math.round((price / 100) * 0.8 / 100_000) / 10;
  const [loanLakh, setLoanLakh] = React.useState(defaultLoan);
  const [rate, setRate]         = React.useState(9.5);
  const [years, setYears]       = React.useState(20);

  const principal = loanLakh * 100_000 * 100;
  const r = rate / 100 / 12;
  const n = years * 12;
  const emi = r === 0 ? principal / n : principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);

  return (
    <div className="surface rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator size={18} className="text-ember-500" />
        <h3 className="font-display text-lg font-semibold">EMI calculator</h3>
      </div>
      <div>
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-mute mb-1.5">
          <span>Loan amount</span><span className="font-mono">{loanLakh.toFixed(1)} Lakh</span>
        </div>
        <input type="range" min={1} max={Math.max(Math.ceil(defaultLoan * 3), 100)} step={0.5}
          value={loanLakh} onChange={e => setLoanLakh(parseFloat(e.target.value))}
          className="w-full accent-ember-500" />
      </div>
      <div>
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-mute mb-1.5">
          <span>Interest rate</span><span className="font-mono">{rate.toFixed(1)}% p.a.</span>
        </div>
        <input type="range" min={5} max={20} step={0.1}
          value={rate} onChange={e => setRate(parseFloat(e.target.value))}
          className="w-full accent-ember-500" />
      </div>
      <div>
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-mute mb-1.5">
          <span>Tenure</span><span className="font-mono">{years} years</span>
        </div>
        <input type="range" min={1} max={30} step={1}
          value={years} onChange={e => setYears(parseInt(e.target.value))}
          className="w-full accent-ember-500" />
      </div>
      <div className="bg-[var(--brand-soft)] rounded-xl px-4 py-3">
        <div className="text-mute text-[10px] uppercase tracking-widest mb-1">Monthly EMI</div>
        <div className="font-display text-2xl text-ember-600 dark:text-ember-400">{formatNPR(Math.round(emi))}</div>
        <div className="text-mute text-[10px] mt-1">Total payable: {formatNPR(Math.round(emi * n))}</div>
      </div>
      <p className="text-mute text-[10px]">Illustrative only. Verify rates with your bank.</p>
    </div>
  );
}
