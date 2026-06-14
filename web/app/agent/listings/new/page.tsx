"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertCircle, ImagePlus, X, Layout, Video, Compass,
  Clapperboard, Upload, CheckCircle, AlertTriangle,
} from "lucide-react";
import { properties, formatFileSize, uploadWithProgress } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { LoadingHouse } from "@/components/loading";
import dynamic from "next/dynamic";
const LocationPicker = dynamic(() => import("@/components/location-picker").then(m => m.LocationPicker), { ssr: false });

const MAX_IMAGE_MB = 25;
const MAX_VIDEO_MB = 500;
const VIDEO_MIME = new Set(["video/mp4","video/quicktime","video/webm","video/x-msvideo","video/x-m4v"]);
const IMAGE_MIME = new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif"]);

interface MediaFile {
  file: File;
  preview: string;
  mediaType: string;
  progress: number;         // 0-100, -1 = error
  done: boolean;
  error: string | null;
}

export default function NewListingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [listing_type, setListingType]  = useState("sale");
  const [category, setCategory]         = useState("residential");
  const [property_type, setPropertyType] = useState("flat");
  const [is_luxury, setIsLuxury]        = useState(false);
  const [city, setCity]                 = useState("Kathmandu");
  const [address, setAddress]           = useState("");
  const [lat, setLat]                   = useState("27.7172");
  const [lng, setLng]                   = useState("85.3240");
  const [priceLakh, setPriceLakh]       = useState("");
  const [areaAana, setAreaAana]         = useState("");
  const [bedrooms, setBedrooms]         = useState(0);
  const [bathrooms, setBathrooms]       = useState(0);
  const [kitchens, setKitchens]         = useState(0);
  const [parking, setParking]           = useState(0);
  const [garden, setGarden]             = useState(false);
  const [floors, setFloors]             = useState(0);
  const [builtAreaSqft, setBuiltAreaSqft] = useState("");
  const [builtYear, setBuiltYear]       = useState("");
  const [builtYearBs, setBuiltYearBs]   = useState("");
  const [facingDirection, setFacingDirection] = useState("");
  const [roadAccessFt, setRoadAccessFt] = useState("");
  const [roadType, setRoadType]         = useState("");
  const [furnishingStatus, setFurnishingStatus] = useState("");
  const [nearbyTags, setNearbyTags]     = useState<string[]>([]);
  const [status, setStatus]             = useState("active");

  // Separate media queues by type
  const [galleryFiles, setGalleryFiles]       = useState<MediaFile[]>([]);
  const [floorPlanFiles, setFloorPlanFiles]   = useState<MediaFile[]>([]);
  const [videoTourFiles, setVideoTourFiles]   = useState<MediaFile[]>([]);
  const [video360Files, setVideo360Files]     = useState<MediaFile[]>([]);
  const [videoLiveFiles, setVideoLiveFiles]   = useState<MediaFile[]>([]);

  const [error, setError]   = useState<string | null>(null);
  const [busy, setBusy]     = useState(false);
  const [stage, setStage]   = useState<"form" | "uploading" | "done">("form");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login?next=/agent/listings/new"); return; }
    if (!user.is_agent) router.replace("/agent/register");
  }, [user, loading, router]);

  function adToBs(ad: number): number { return ad + 57; }
  function bsToAd(bs: number): number { return bs - 57; }
  function onYearAD(v: string) {
    setBuiltYear(v);
    const n = parseInt(v);
    if (!isNaN(n) && n > 1900) setBuiltYearBs(String(adToBs(n)));
  }
  function onYearBS(v: string) {
    setBuiltYearBs(v);
    const n = parseInt(v);
    if (!isNaN(n) && n > 1950) setBuiltYear(String(bsToAd(n)));
  }

  if (loading || !user || !user.is_agent) return <LoadingHouse text="Checking access…" />;

  // ── File helpers ────────────────────────────────────────────────────────────
  function makeMediaFiles(files: FileList | null | undefined, mediaType: string, allowedMime: Set<string>, maxMB: number): MediaFile[] {
    if (!files || files.length === 0) return [];
    return Array.from(files).map(file => {
      const mime = file.type || "application/octet-stream";
      let error: string | null = null;
      if (!allowedMime.has(mime)) error = `Unsupported type (${mime})`;
      if (file.size > maxMB * 1024 * 1024) error = `Too large — max ${maxMB} MB`;
      return {
        file,
        preview: URL.createObjectURL(file),
        mediaType,
        progress: error ? -1 : 0,
        done: false,
        error,
      };
    });
  }

  function addFiles(
    setter: React.Dispatch<React.SetStateAction<MediaFile[]>>,
    files: FileList, mediaType: string,
    allowedMime: Set<string>, maxMB: number,
  ) {
    setter(prev => [...prev, ...makeMediaFiles(files, mediaType, allowedMime, maxMB)]);
  }

  function removeFile(setter: React.Dispatch<React.SetStateAction<MediaFile[]>>, idx: number) {
    setter(prev => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const price = parseFloat(priceLakh);
    const area  = parseFloat(areaAana);
    if (isNaN(price) || price <= 0) { setError("Enter a valid price in Lakh."); return; }
    if (isNaN(area)  || area  <= 0) { setError("Enter a valid area in Aana.");  return; }

    setBusy(true); setStage("uploading");

    try {
      const prop = await properties.create({
        title, description, listing_type, category, property_type,
        is_luxury, city, address,
        latitude: parseFloat(lat), longitude: parseFloat(lng),
        price: Math.round(price * 100_000 * 100),
        area_sqm: parseFloat((area * 31.7951).toFixed(2)),
        bedrooms, bathrooms, kitchens, floors, parking, garden,
        built_area_sqft: builtAreaSqft ? parseFloat(builtAreaSqft) : null,
        built_year: builtYear ? parseInt(builtYear) : null,
        built_year_bs: builtYearBs ? parseInt(builtYearBs) : null,
        facing_direction: facingDirection || "",
        road_access_ft: roadAccessFt ? parseInt(roadAccessFt) : null,
        road_type: roadType || "",
        furnishing_status: furnishingStatus || "",
        status, price_negotiable: false, living_rooms: 0,
        nearby_amenities: nearbyTags.map(t => ({ type: t, name: t.replace("_"," "), distance_m: 0 })),
      });

      const allMedia = [
        ...galleryFiles.map((m, i) => ({ ...m, isPrimary: i === 0, mediaType: "gallery" })),
        ...floorPlanFiles.map(m => ({ ...m, isPrimary: false, mediaType: "floorplan" })),
        ...videoTourFiles.map(m => ({ ...m, isPrimary: false, mediaType: "video_tour" })),
        ...video360Files.map(m => ({ ...m, isPrimary: false, mediaType: "video_360" })),
        ...videoLiveFiles.map(m => ({ ...m, isPrimary: false, mediaType: "video_live" })),
      ].filter(m => !m.error);

      for (let i = 0; i < allMedia.length; i++) {
        const item = allMedia[i];
        const fd = new FormData();
        fd.append("file", item.file);
        fd.append("media_type", item.mediaType);
        fd.append("order", String(i));
        if ("isPrimary" in item) fd.append("is_primary", String(item.isPrimary));

        await uploadWithProgress(`/properties/${prop.slug}/upload_media/`, fd, (pct) => {
          // update progress per queue
          const updateQueue = (setter: React.Dispatch<React.SetStateAction<MediaFile[]>>, mediaType: string) => {
            setter(prev => prev.map(m => m.file === item.file ? { ...m, progress: pct } : m));
          };
          if (item.mediaType === "gallery")     setGalleryFiles(p => p.map(m => m.file === item.file ? { ...m, progress: pct } : m));
          if (item.mediaType === "floorplan")   setFloorPlanFiles(p => p.map(m => m.file === item.file ? { ...m, progress: pct } : m));
          if (item.mediaType === "video_tour")  setVideoTourFiles(p => p.map(m => m.file === item.file ? { ...m, progress: pct } : m));
          if (item.mediaType === "video_360")   setVideo360Files(p => p.map(m => m.file === item.file ? { ...m, progress: pct } : m));
          if (item.mediaType === "video_live")  setVideoLiveFiles(p => p.map(m => m.file === item.file ? { ...m, progress: pct } : m));
        });

        // Mark done
        const markDone = (setter: React.Dispatch<React.SetStateAction<MediaFile[]>>) =>
          setter(p => p.map(m => m.file === item.file ? { ...m, done: true, progress: 100 } : m));
        if (item.mediaType === "gallery")    markDone(setGalleryFiles);
        if (item.mediaType === "floorplan")  markDone(setFloorPlanFiles);
        if (item.mediaType === "video_tour") markDone(setVideoTourFiles);
        if (item.mediaType === "video_360")  markDone(setVideo360Files);
        if (item.mediaType === "video_live") markDone(setVideoLiveFiles);
      }

      setStage("done");
      setTimeout(() => router.push("/agent/dashboard"), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create listing.");
      setStage("form");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "done") {
    return (
      <div className="max-w-lg mx-auto container-fluid py-20 text-center rise">
        <CheckCircle size={40} className="text-ember-500 mx-auto mb-4" />
        <h1 className="font-display text-3xl tracking-tightest mb-2">Published!</h1>
        <p className="text-mute">Redirecting to your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto container-fluid py-10 sm:py-16 rise">
      <p className="text-mute uppercase tracking-[0.3em] text-[10px] mb-3">New listing</p>
      <h1 className="font-display text-3xl sm:text-5xl tracking-tightest mb-8 font-semibold">Add a property.</h1>

      <form onSubmit={submit} className="space-y-8">
        {/* Core details */}
        <section className="surface rounded-2xl p-6 sm:p-8 space-y-5">
          <SectionHeader icon={null} label="Property details" />

          {error && (
            <div role="alert" className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--brand-soft)] border border-ember-300 text-ember-800 dark:text-ember-200 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required className="field" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} className="field" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Sel label="Listing" value={listing_type} setValue={setListingType}
              options={[["sale","For Sale"],["rent","For Rent"],["lease","For Lease"]]} />
            <Sel label="Category" value={category} setValue={setCategory}
              options={[["residential","Residential"],["commercial","Commercial"],["land","Land"],["luxury","Luxury"]]} />
            <Sel label="Type" value={property_type} setValue={setPropertyType}
              options={[["flat","Flat"],["house","House"],["bungalow","Bungalow"],["penthouse","Penthouse"],
                       ["villa","Villa"],["hotel","Hotel"],["resort","Resort"],["shop","Shop"],["office","Office"],["plot","Plot"]]} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={is_luxury} onChange={e => setIsLuxury(e.target.checked)} className="w-4 h-4 accent-ember-500" />
            <span className="text-sm">Flag as <strong>Luxury</strong></span>
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <Sel label="City" value={city} setValue={setCity}
              options={[["Kathmandu","Kathmandu"],["Lalitpur","Lalitpur"],["Bhaktapur","Bhaktapur"],["Pokhara","Pokhara"],["Biratnagar","Biratnagar"]]} />
            <div>
              <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Address *</label>
              <input value={address} onChange={e => setAddress(e.target.value)} required className="field" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Price (Lakh NPR) *</label>
              <input type="number" step="0.01" value={priceLakh} onChange={e => setPriceLakh(e.target.value)} required className="field" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Area (Aana) *</label>
              <input type="number" step="0.1" value={areaAana} onChange={e => setAreaAana(e.target.value)} required className="field" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Num label="Bedrooms"  value={bedrooms}  setValue={setBedrooms}  />
            <Num label="Bathrooms" value={bathrooms} setValue={setBathrooms} />
            <Num label="Kitchens"  value={kitchens}  setValue={setKitchens}  />
            <div>
              <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Parking</label>
              <select value={parking} onChange={e => setParking(parseInt(e.target.value))} className="field">
                <option value={0}>None</option>
                <option value={1}>1 Car</option>
                <option value={2}>2 Cars</option>
                <option value={3}>3+ Cars</option>
              </select>
            </div>
            <Num label="Floors"    value={floors}    setValue={setFloors}    />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={garden} onChange={e => setGarden(e.target.checked)} className="w-4 h-4 accent-ember-500" />
            <span className="text-sm">Has garden</span>
          </label>

          {/* Built area & year */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Built area (sq ft)</label>
              <input type="number" step="0.01" value={builtAreaSqft} onChange={e => setBuiltAreaSqft(e.target.value)} className="field" placeholder="e.g. 2500" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Year built (A.D.)</label>
              <input type="number" value={builtYear} onChange={e => onYearAD(e.target.value)} className="field" placeholder="e.g. 2020" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Year built (B.S.)</label>
              <input type="number" value={builtYearBs} onChange={e => onYearBS(e.target.value)} className="field" placeholder="e.g. 2077" />
            </div>
          </div>

          {/* Direction, road, furnishing */}
          <div className="grid sm:grid-cols-4 gap-3">
            <Sel label="Facing" value={facingDirection} setValue={setFacingDirection}
              options={[["","—"],["north","North"],["south","South"],["east","East"],["west","West"],
                       ["north_east","NE"],["north_west","NW"],["south_east","SE"],["south_west","SW"]]} />
            <div>
              <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Road access (ft)</label>
              <input type="number" value={roadAccessFt} onChange={e => setRoadAccessFt(e.target.value)} className="field" placeholder="e.g. 20" />
            </div>
            <Sel label="Road type" value={roadType} setValue={setRoadType}
              options={[["","—"],["main_road","Main Road"],["side_road","Side Road"],["highway","Highway"],["private_street","Private Street"],["alley","Alley / Galli"]]} />
            <Sel label="Condition" value={furnishingStatus} setValue={setFurnishingStatus}
              options={[["","—"],["furnished","Furnished"],["unfurnished","Unfurnished"],["semi_furnished","Semi-furnished"]]} />
          </div>

          {/* Nearby amenities */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-mute block mb-2">Nearby amenities</label>
            <div className="flex flex-wrap gap-1.5">
              {["school","hospital","mall","airport","bus_stop","temple","park","bank"].map(tag => (
                <button key={tag} type="button" onClick={() => setNearbyTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                    nearbyTags.includes(tag) ? "bg-emerald-500 text-white border-emerald-500" : "border-[var(--line)] text-mute hover:border-emerald-500"
                  }`}>
                  {tag.replace("_"," ")}
                </button>
              ))}
            </div>
          </div>
          {/* Map location picker */}
          <div>
            <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-2">PROPERTY LOCATION</label>
            <LocationPicker
              lat={parseFloat(lat) || 27.7172} lng={parseFloat(lng) || 85.324}
              onSelect={(la, ln) => { setLat(String(la)); setLng(String(ln)); }}
            />
          </div>
        </section>

        {/* Gallery photos */}
        <MediaSection
          label="Gallery photos"
          hint="First photo becomes the listing cover. Max 25 MB each."
          icon={<ImagePlus size={20} />}
          cta="Add photos"
          files={galleryFiles}
          onAdd={f => addFiles(setGalleryFiles, f, "gallery", IMAGE_MIME, MAX_IMAGE_MB)}
          onRemove={i => removeFile(setGalleryFiles, i)}
          accept="image/*"
          isVideo={false}
        />

        {/* Floor plans */}
        <MediaSection
          label="Floor plans"
          hint="Upload blueprint images (PNG, JPG, PDF converted to image)."
          icon={<Layout size={20} />}
          cta="Add floor plans"
          files={floorPlanFiles}
          onAdd={f => addFiles(setFloorPlanFiles, f, "floorplan", IMAGE_MIME, MAX_IMAGE_MB)}
          onRemove={i => removeFile(setFloorPlanFiles, i)}
          accept="image/*"
          isVideo={false}
        />

        {/* Video tour */}
        <MediaSection
          label="Property tour video"
          hint="Walkthrough video of the property. MP4 recommended. Max 500 MB."
          icon={<Video size={20} />}
          cta="Add tour video"
          files={videoTourFiles}
          onAdd={f => addFiles(setVideoTourFiles, f, "video_tour", VIDEO_MIME, MAX_VIDEO_MB)}
          onRemove={i => removeFile(setVideoTourFiles, i)}
          accept="video/*"
          isVideo={true}
        />

        {/* 360° video */}
        <MediaSection
          label="360° equirectangular video"
          hint="Film with a 360° camera (GoPro Max, Insta360, etc.) and upload the equirectangular MP4. Best viewed on mobile or VR."
          icon={<Compass size={20} />}
          cta="Add 360° video"
          files={video360Files}
          onAdd={f => addFiles(setVideo360Files, f, "video_360", VIDEO_MIME, MAX_VIDEO_MB)}
          onRemove={i => removeFile(setVideo360Files, i)}
          accept="video/*"
          isVideo={true}
          accent
        />

        {/* Live view clips */}
        <MediaSection
          label="Live view clips"
          hint="Short clips (rooms, views, surroundings). Buyers love real footage. Max 500 MB each."
          icon={<Clapperboard size={20} />}
          cta="Add clip"
          files={videoLiveFiles}
          onAdd={f => addFiles(setVideoLiveFiles, f, "video_live", VIDEO_MIME, MAX_VIDEO_MB)}
          onRemove={i => removeFile(setVideoLiveFiles, i)}
          accept="video/*"
          isVideo={true}
        />

        {/* Status + submit */}
        <div className="surface rounded-2xl p-6 sm:p-8 space-y-5">
          <Sel label="Publish status" value={status} setValue={setStatus}
            options={[["active","Active — visible immediately"],["draft","Draft — save without publishing"]]} />
          <button type="submit" disabled={busy} className="btn-primary w-full text-base py-3">
            {busy ? (
              <span className="flex items-center gap-2 justify-center">
                <Upload size={16} className="animate-bounce" />
                Uploading media…
              </span>
            ) : "Publish listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── MediaSection ──────────────────────────────────────────────────────────────
function MediaSection({ label, hint, icon, cta, files, onAdd, onRemove, accept, isVideo, accent }: {
  label: string; hint: string; icon: React.ReactNode; cta: string;
  files: MediaFile[]; onAdd: (f: FileList) => void; onRemove: (i: number) => void;
  accept: string; isVideo: boolean; accent?: boolean;
}) {
  return (
    <section className={`rounded-2xl p-6 sm:p-8 space-y-4 ${accent ? "border-2 border-ember-500/30 bg-ember-50/30 dark:bg-ember-900/10" : "surface"}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${accent ? "bg-ember-100 dark:bg-ember-900/40 text-ember-600" : "bg-[var(--brand-soft)] text-ember-600"}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-sm">{label}</h3>
          <p className="text-mute text-xs mt-0.5">{hint}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {files.map((item, i) => (
          <MediaTile key={i} item={item} isVideo={isVideo} onRemove={() => onRemove(i)} />
        ))}

        {/* Add button */}
        <label className={`aspect-video rounded-xl border-2 border-dashed grid place-items-center cursor-pointer transition-colors text-mute hover:text-ember-500 ${accent ? "border-ember-300 hover:border-ember-500" : "border-[var(--line)] hover:border-ember-500"}`}>
          <div className="flex flex-col items-center gap-1.5 p-2 text-center">
            {icon}
            <span className="text-[10px] uppercase tracking-widest leading-tight">{cta}</span>
          </div>
          <input type="file" accept={accept} multiple className="hidden"
            onChange={e => e.target.files && onAdd(e.target.files)} />
        </label>
      </div>
    </section>
  );
}

// ── MediaTile ─────────────────────────────────────────────────────────────────
function MediaTile({ item, isVideo, onRemove }: { item: MediaFile; isVideo: boolean; onRemove: () => void }) {
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden surface">
      {isVideo ? (
        <video src={item.preview} className="w-full h-full object-cover" muted playsInline />
      ) : (
        <img src={item.preview} alt="" className="w-full h-full object-cover" />
      )}

      {/* Progress overlay */}
      {!item.done && item.error === null && item.progress > 0 && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 p-2">
          <div className="w-full bg-white/20 rounded-full h-1.5">
            <div className="bg-ember-400 h-1.5 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
          </div>
          <span className="text-white text-[10px]">{item.progress}%</span>
        </div>
      )}

      {/* Done badge */}
      {item.done && (
        <div className="absolute bottom-1 left-1">
          <CheckCircle size={14} className="text-ember-400" />
        </div>
      )}

      {/* Error badge */}
      {item.error && (
        <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center p-2">
          <div className="text-center">
            <AlertTriangle size={16} className="text-red-300 mx-auto mb-1" />
            <p className="text-red-200 text-[10px] leading-tight">{item.error}</p>
          </div>
        </div>
      )}

      {/* Video badge */}
      {isVideo && !item.error && (
        <div className="absolute top-1 left-1">
          <Video size={10} className="text-white opacity-80" />
        </div>
      )}

      {/* File size */}
      <div className="absolute bottom-1 right-6 text-[9px] text-white/70">
        {formatFileSize(item.file.size)}
      </div>

      {/* Remove */}
      <button type="button" onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white grid place-items-center hover:bg-red-600 transition-colors"
        aria-label="Remove">
        <X size={10} />
      </button>
    </div>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode | null; label: string }) {
  return (
    <h2 className="font-display text-xl tracking-tightest flex items-center gap-2">
      {icon}{label}
    </h2>
  );
}

function Sel({ label, value, setValue, options }: {
  label: string; value: string; setValue: (v: string) => void; options: [string, string][];
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">{label}</label>
      <select value={value} onChange={e => setValue(e.target.value)} className="field">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function Num({ label, value, setValue }: { label: string; value: number; setValue: (v: number) => void }) {
  const [display, setDisplay] = useState(value === 0 ? "" : String(value));
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">{label}</label>
      <input type="text" inputMode="numeric" value={display}
        onFocus={e => { if (display === "0") setDisplay(""); }}
        onChange={e => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          setDisplay(raw);
          setValue(parseInt(raw) || 0);
        }}
        onBlur={() => { if (!display) setDisplay(""); }}
        className="field" />
    </div>
  );
}
