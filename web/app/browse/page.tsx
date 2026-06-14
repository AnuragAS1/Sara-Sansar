"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { LayoutGrid, List, Map as MapIcon, SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { LoadingHouse } from "@/components/loading";
import { properties as propApi, Property, lakhToPaisa } from "@/lib/api";

const PropertyMap = dynamic(() => import("@/components/property-map").then(m => m.PropertyMap), { ssr: false });

const CITIES = ["", "Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Biratnagar"];

const PROPERTY_TYPES: [string, string][] = [
  ["", "Any"], ["flat", "Flat / Apartment"], ["house", "House"], ["bungalow", "Bungalow"],
  ["penthouse", "Penthouse"], ["villa", "Villa"], ["hotel", "Hotel"],
  ["resort", "Resort"], ["shop", "Shop"], ["office", "Office"], ["plot", "Plot"],
];

const FACING: [string, string][] = [
  ["", "Any"], ["north", "North"], ["south", "South"], ["east", "East"],
  ["west", "West"], ["north_east", "North-East"], ["north_west", "North-West"],
  ["south_east", "South-East"], ["south_west", "South-West"],
];

const ROAD_TYPES: [string, string][] = [
  ["", "Any"], ["main_road", "Main Road"], ["side_road", "Side Road"],
  ["highway", "Highway"], ["private_street", "Private Street"], ["alley", "Alley / Galli"],
];

const FURNISHING: [string, string][] = [
  ["", "Any"], ["furnished", "Furnished"], ["unfurnished", "Unfurnished"],
  ["semi_furnished", "Semi-furnished"],
];

const NEARBY_TAGS = ["school", "hospital", "mall", "airport", "bus_stop", "temple", "park", "bank"];

const AREA_UNITS: Record<string, { label: string; toSqm: number }> = {
  aana:   { label: "Aana",     toSqm: 31.7951 },
  sqft:   { label: "Sq. feet", toSqm: 0.0929 },
  ropani: { label: "Ropani",   toSqm: 508.72 },
  katha:  { label: "Katha",    toSqm: 338.63 },
  dhur:   { label: "Dhur",     toSqm: 16.93 },
  bigha:  { label: "Bigha",    toSqm: 6772.63 },
};

// BS ↔ AD year only (approximate for years)
function adToBs(ad: number) { return ad + 57; }
function bsToAd(bs: number) { return bs - 57; }

type View = "grid" | "list" | "map";
type Draft = {
  listing_type: string; category: string; property_type: string;
  city: string; sort: string;
  pMinLakh: string; pMaxLakh: string;
  aMin: string; aMax: string; areaUnit: string;
  bedrooms: string; bathrooms: string; parking: string; garden: string;
  minBuiltArea: string; maxBuiltArea: string;
  minYear: string; maxYear: string;
  facing_direction: string;
  road_access_min: string; road_type: string;
  furnishing_status: string;
  nearby: string[];
};

const blankDraft: Draft = {
  listing_type: "", category: "", property_type: "",
  city: "", sort: "-created_at",
  pMinLakh: "", pMaxLakh: "",
  aMin: "", aMax: "", areaUnit: "aana",
  bedrooms: "", bathrooms: "", parking: "", garden: "",
  minBuiltArea: "", maxBuiltArea: "",
  minYear: "", maxYear: "",
  facing_direction: "",
  road_access_min: "", road_type: "",
  furnishing_status: "",
  nearby: [],
};

/* ── FIX #5: count EVERY field individually ────────────────────────────────── */
function countActive(d: Draft): number {
  let n = 0;
  if (d.listing_type) n++;
  if (d.category) n++;
  if (d.property_type) n++;
  if (d.city) n++;
  if (d.pMinLakh) n++;
  if (d.pMaxLakh) n++;
  if (d.aMin) n++;
  if (d.aMax) n++;
  if (d.bedrooms) n++;
  if (d.bathrooms) n++;
  if (d.parking) n++;
  if (d.garden) n++;
  if (d.minBuiltArea) n++;
  if (d.maxBuiltArea) n++;
  if (d.minYear) n++;
  if (d.maxYear) n++;
  if (d.facing_direction) n++;
  if (d.road_access_min) n++;
  if (d.road_type) n++;
  if (d.furnishing_status) n++;
  if (d.nearby.length) n++;
  return n;
}

function BrowseContent() {
  const router = useRouter();
  const params = useSearchParams();

  function fromUrl(): Draft {
    const unit = "aana";
    const toSqm = AREA_UNITS[unit].toSqm;
    return {
      listing_type: params.get("listing_type") || "",
      category: params.get("category") || "",
      property_type: params.get("property_type") || "",
      city: params.get("city") || "",
      sort: params.get("sort") || "-created_at",
      pMinLakh: params.get("min_price") ? String(Math.round(parseInt(params.get("min_price")!) / 100_000 / 100)) : "",
      pMaxLakh: params.get("max_price") ? String(Math.round(parseInt(params.get("max_price")!) / 100_000 / 100)) : "",
      aMin: params.get("min_area") ? String((parseFloat(params.get("min_area")!) / toSqm).toFixed(1)) : "",
      aMax: params.get("max_area") ? String((parseFloat(params.get("max_area")!) / toSqm).toFixed(1)) : "",
      areaUnit: unit,
      bedrooms: params.get("bedrooms") || "",
      bathrooms: params.get("bathrooms") || "",
      parking: params.get("parking") || "",
      garden: params.get("garden") || "",
      minBuiltArea: params.get("min_built_area") || "",
      maxBuiltArea: params.get("max_built_area") || "",
      minYear: params.get("min_year") || "",
      maxYear: params.get("max_year") || "",
      facing_direction: params.get("facing_direction") || "",
      road_access_min: params.get("road_access_min") || "",
      road_type: params.get("road_type") || "",
      furnishing_status: params.get("furnishing_status") || "",
      nearby: params.get("nearby") ? params.get("nearby")!.split(",") : [],
    };
  }

  const [draft, setDraft] = useState<Draft>(fromUrl);
  const [view, setView] = useState<View>("grid");
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterCount = countActive(draft);

  const fetchListings = useCallback(() => {
    setLoading(true);
    const p: Record<string, string | undefined> = {};
    ["listing_type","category","property_type","city","sort",
     "min_price","max_price","min_area","max_area",
     "bedrooms","bathrooms","parking","garden",
     "min_built_area","max_built_area","min_year","max_year",
     "facing_direction","road_access_min","road_type","furnishing_status","nearby"
    ].forEach(k => { const v = params.get(k); if (v) p[k] = v; });
    if (params.get("agent")) p.agent = params.get("agent")!;
    propApi.publicList(p)
      .then(r => setItems(Array.isArray(r) ? r : (r as any).results || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setDraft(fromUrl()); }, [params]);

  function applyFilters() {
    const next = new URLSearchParams();
    const d = draft;
    if (d.listing_type) next.set("listing_type", d.listing_type);
    if (d.category) next.set("category", d.category);
    if (d.property_type) next.set("property_type", d.property_type);
    if (d.city) next.set("city", d.city);
    if (d.sort && d.sort !== "-created_at") next.set("sort", d.sort);
    if (d.pMinLakh) next.set("min_price", String(lakhToPaisa(parseFloat(d.pMinLakh))));
    if (d.pMaxLakh) next.set("max_price", String(lakhToPaisa(parseFloat(d.pMaxLakh))));
    const toSqm = AREA_UNITS[d.areaUnit].toSqm;
    if (d.aMin) next.set("min_area", String(parseFloat(d.aMin) * toSqm));
    if (d.aMax) next.set("max_area", String(parseFloat(d.aMax) * toSqm));
    if (d.bedrooms) next.set("bedrooms", d.bedrooms);
    if (d.bathrooms) next.set("bathrooms", d.bathrooms);
    if (d.parking) next.set("parking", d.parking);
    if (d.garden) next.set("garden", d.garden);
    if (d.minBuiltArea) next.set("min_built_area", d.minBuiltArea);
    if (d.maxBuiltArea) next.set("max_built_area", d.maxBuiltArea);
    if (d.minYear) next.set("min_year", d.minYear);
    if (d.maxYear) next.set("max_year", d.maxYear);
    if (d.facing_direction) next.set("facing_direction", d.facing_direction);
    if (d.road_access_min) next.set("road_access_min", d.road_access_min);
    if (d.road_type) next.set("road_type", d.road_type);
    if (d.furnishing_status) next.set("furnishing_status", d.furnishing_status);
    if (d.nearby.length) next.set("nearby", d.nearby.join(","));
    if (params.get("agent")) next.set("agent", params.get("agent")!);
    router.replace(`/browse?${next.toString()}`);
    setFiltersOpen(false);
  }

  function resetFilters() { setDraft({ ...blankDraft }); router.replace("/browse"); }

  const set = (k: keyof Draft) => (v: string) => setDraft(prev => ({ ...prev, [k]: v }));
  const toggleNearby = (tag: string) =>
    setDraft(prev => ({ ...prev, nearby: prev.nearby.includes(tag) ? prev.nearby.filter(t => t !== tag) : [...prev.nearby, tag] }));

  // BS year handlers for filter
  function onMinYearAD(v: string) {
    set("minYear")(v);
  }
  function onMaxYearAD(v: string) {
    set("maxYear")(v);
  }

  const heading = (() => {
    if (draft.category === "luxury") return "Premium & hospitality";
    if (draft.category === "land") return "Land in Nepal";
    if (draft.category === "commercial") return "Commercial spaces";
    if (draft.listing_type === "rent") return "Homes to rent";
    if (draft.listing_type === "sale") return "Homes to buy";
    return "All listings";
  })();

  /* ── FIX #7: section heading component — uniform ALL CAPS BOLD ──────── */
  const H = ({ children }: { children: React.ReactNode }) => (
    <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-2">{children}</label>
  );

  return (
    <div className="max-w-7xl mx-auto container-fluid py-6 sm:py-10 rise">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-mute uppercase tracking-[0.3em] text-[10px] mb-2">Browse</p>
          <h1 className="font-display text-3xl sm:text-5xl tracking-tightest leading-tight">{heading}</h1>
          <p className="text-mute text-sm mt-1">
            {loading ? "Searching…" : `${items.length} listing${items.length !== 1 ? "s" : ""}`}
            {draft.city ? ` in ${draft.city}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(["grid", "list", "map"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`p-2 rounded-lg transition-colors ${view === v ? "bg-ember-500 text-white" : "surface"}`}
              aria-label={v} title={v}>
              {v === "grid" && <LayoutGrid size={18} />}
              {v === "list" && <List size={18} />}
              {v === "map" && <MapIcon size={18} />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter panel ──────────────────────────────────────────────────── */}
      <div className="surface rounded-2xl mb-8 overflow-hidden">
        <button onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium hover:bg-[var(--brand-soft)]/30 transition-colors">
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-emerald-600" />
            <span className="font-bold uppercase tracking-widest text-xs">Filters</span>
            {filterCount > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] rounded-full w-5 h-5 grid place-items-center font-mono font-bold">{filterCount}</span>
            )}
          </span>
          {filtersOpen ? <ChevronUp size={16} className="text-mute" /> : <ChevronDown size={16} className="text-mute" />}
        </button>

        {filtersOpen && (
          <div className="border-t border-[var(--line)] px-5 pt-5 pb-6 space-y-5">

            {/* Row 1: Type selectors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FSel label="LISTING TYPE" value={draft.listing_type} onChange={set("listing_type")}
                options={[["", "Any"], ["sale", "For Sale"], ["rent", "For Rent"], ["lease", "For Lease"]]} />
              <FSel label="CATEGORY" value={draft.category} onChange={set("category")}
                options={[["", "Any"], ["residential", "Residential"], ["commercial", "Commercial"], ["land", "Land"], ["luxury", "Premium"]]} />
              <FSel label="PROPERTY TYPE" value={draft.property_type} onChange={set("property_type")}
                options={PROPERTY_TYPES} />
              <FSel label="CITY" value={draft.city} onChange={set("city")}
                options={CITIES.map(c => [c, c || "Any city"])} />
            </div>

            {/* Row 2: Price */}
            <div>
              <H>PRICE RANGE (LAKH NPR)</H>
              <div className="grid grid-cols-2 gap-2">
                <FNum placeholder="Min" value={draft.pMinLakh} onChange={set("pMinLakh")} />
                <FNum placeholder="Max" value={draft.pMaxLakh} onChange={set("pMaxLakh")} />
              </div>
            </div>

            {/* Row 3: Rooms */}
            <div>
              <H>MINIMUM ROOMS</H>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FNum label="BED" placeholder="0" value={draft.bedrooms} onChange={set("bedrooms")} />
                <FNum label="BATHROOM" placeholder="0" value={draft.bathrooms} onChange={set("bathrooms")} />
                <FSel label="PARKING" value={draft.parking} onChange={set("parking")}
                  options={[["", "Any"], ["1", "1+ Car"], ["2", "2+ Cars"], ["3", "3+ Cars"]]} />
                <FSel label="GARDEN" value={draft.garden} onChange={set("garden")}
                  options={[["", "Any"], ["true", "Yes"]]} />
              </div>
            </div>

            {/* Row 4: Land area — FIX #1: unit selector NEXT TO heading, same size */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[11px] uppercase tracking-widest text-mute font-bold">LAND AREA</span>
                <select value={draft.areaUnit} onChange={e => set("areaUnit")(e.target.value)}
                  className="text-[11px] uppercase tracking-widest font-bold bg-transparent border border-emerald-400 text-emerald-700 dark:text-emerald-400 rounded px-2 py-0.5 cursor-pointer">
                  {Object.entries(AREA_UNITS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FNum placeholder="Min" value={draft.aMin} onChange={set("aMin")} step="0.1" />
                <FNum placeholder="Max" value={draft.aMax} onChange={set("aMax")} step="0.1" />
              </div>
            </div>

            {/* Row 5: Built area + year */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <H>BUILT AREA (SQ FT)</H>
                <div className="grid grid-cols-2 gap-2">
                  <FNum placeholder="Min" value={draft.minBuiltArea} onChange={set("minBuiltArea")} />
                  <FNum placeholder="Max" value={draft.maxBuiltArea} onChange={set("maxBuiltArea")} />
                </div>
              </div>
              <div>
                <H>YEAR BUILT (A.D.)</H>
                <div className="grid grid-cols-2 gap-2">
                  <FNum placeholder="From" value={draft.minYear} onChange={onMinYearAD} />
                  <FNum placeholder="To" value={draft.maxYear} onChange={onMaxYearAD} />
                </div>
                {(draft.minYear || draft.maxYear) && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    B.S.: {draft.minYear ? adToBs(parseInt(draft.minYear)) : "—"} – {draft.maxYear ? adToBs(parseInt(draft.maxYear)) : "—"}
                  </p>
                )}
              </div>
            </div>

            {/* Row 6: Direction, road, furnishing — FIX #4 #6 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FSel label="PROPERTY DIRECTION" value={draft.facing_direction} onChange={set("facing_direction")} options={FACING} />
              <FNum label="ROAD ACCESS (FT)" placeholder="Min ft" value={draft.road_access_min} onChange={set("road_access_min")} />
              <FSel label="ROAD TYPE" value={draft.road_type} onChange={set("road_type")} options={ROAD_TYPES} />
              <FSel label="PROPERTY CONDITION STATUS" value={draft.furnishing_status} onChange={set("furnishing_status")} options={FURNISHING} />
            </div>

            {/* Row 7: Nearby amenities */}
            <div>
              <H>NEARBY AMENITIES</H>
              <div className="flex flex-wrap gap-1.5">
                {NEARBY_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleNearby(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                      draft.nearby.includes(tag)
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "border-[var(--line)] text-mute hover:border-emerald-500 hover:text-emerald-600"
                    }`}>
                    {tag.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <FSel label="SORT BY" value={draft.sort} onChange={set("sort")}
              options={[["-created_at", "Newest first"], ["price", "Price ↑"], ["-price", "Price ↓"], ["-area_sqm", "Area ↓"]]} />

            {/* Apply / Reset */}
            <div className="flex gap-3 pt-1">
              <button onClick={applyFilters} className="btn-primary flex-1">
                Apply{filterCount > 0 ? ` (${filterCount})` : ""} filters
              </button>
              <button onClick={resetFilters}
                className={`btn-ghost flex items-center gap-1.5 px-4 ${filterCount === 0 ? "opacity-40 pointer-events-none" : ""}`}>
                <RotateCcw size={14} /> Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading && <LoadingHouse text="Finding properties…" />}
      {!loading && items.length === 0 && (
        <div className="surface rounded-2xl p-12 text-center">
          <p className="font-display text-3xl mb-3">No listings match</p>
          <p className="text-mute mb-5 text-sm">Try widening your filters or resetting them.</p>
          <button onClick={resetFilters} className="btn-ghost inline-flex items-center gap-1.5"><RotateCcw size={14} /> Reset filters</button>
        </div>
      )}
      {!loading && items.length > 0 && view === "grid" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{items.map(p => <PropertyCard key={p.id} p={p} />)}</div>
      )}
      {!loading && items.length > 0 && view === "list" && (
        <div className="space-y-3">{items.map(p => <PropertyCard key={p.id} p={p} view="list" />)}</div>
      )}
      {!loading && items.length > 0 && view === "map" && (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <PropertyMap properties={items} height={650} selectedSlug={selected} onSelect={p => setSelected(p?.slug ?? null)} />
          </div>
          <div className="lg:col-span-2 max-h-[650px] overflow-y-auto space-y-3 pr-1">
            {items.map(p => (
              <div key={p.id} className={selected === p.slug ? "ring-2 ring-ember-500 rounded-xl" : ""} onClick={() => setSelected(p.slug)}>
                <PropertyCard p={p} view="list" />
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && items.length > 0 && view !== "map" && (
        <section className="mt-10">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tightest mb-4">On the map</h2>
          <PropertyMap properties={items} height={400} selectedSlug={selected} onSelect={p => setSelected(p?.slug ?? null)} />
        </section>
      )}
    </div>
  );
}

/* ── FIX #2 #7: FSel — green border when active, bold uppercase label ────── */
function FSel({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  const active = !!value;
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`field text-sm transition-colors ${active ? "!border-emerald-500 !ring-1 !ring-emerald-500/30 text-emerald-700 dark:text-emerald-400" : ""}`}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

/* ── FIX #2 #3: FNum — green border when active, type=text for zero handling */
function FNum({ label, placeholder, value, onChange, step, min, max }: {
  label?: string; placeholder: string; value: string; onChange: (v: string) => void;
  step?: string; min?: number; max?: number;
}) {
  const active = !!value;
  return (
    <div>
      {label && <label className="text-[11px] uppercase tracking-widest text-mute font-bold block mb-1">{label}</label>}
      <input
        type="number" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
        className={`field text-sm transition-colors ${active ? "!border-emerald-500 !ring-1 !ring-emerald-500/30" : ""}`}
        step={step} min={min} max={max}
      />
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<LoadingHouse text="Loading browse…" />}>
      <BrowseContent />
    </Suspense>
  );
}
