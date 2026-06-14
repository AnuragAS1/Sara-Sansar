const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(^|;\s*)csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[2]) : "";
}

let csrfBootDone = false;
export async function ensureCsrf() {
  if (csrfBootDone || typeof window === "undefined") return;
  csrfBootDone = true;
  try { await fetch(`${API}/users/csrf/`, { credentials: "include" }); } catch {}
}

type FetchOptions = RequestInit & { isForm?: boolean };

async function rawFetch(path: string, opts: FetchOptions = {}): Promise<Response> {
  const { isForm = false, headers, method = "GET", ...rest } = opts;
  const h: Record<string, string> = { ...(headers as Record<string, string>) };
  if (!isForm) h["Content-Type"] = "application/json";
  if (["POST","PUT","PATCH","DELETE"].includes(method.toUpperCase())) {
    const csrf = getCsrfToken();
    if (csrf) h["X-CSRFToken"] = csrf;
  }
  return fetch(`${API}${path}`, { ...rest, method, headers: h, credentials: "include" });
}

export async function api<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
  let res: Response;
  try { res = await rawFetch(path, opts); }
  catch { throw new Error("Network error — is the backend running on :8000?"); }

  if (res.status === 401) {
    const ok = await refreshTokens();
    if (ok) {
      try { res = await rawFetch(path, opts); }
      catch { throw new Error("Network error on retry."); }
    }
  }

  if (!res.ok) {
    let msg = res.statusText || `Request failed (${res.status})`;
    try {
      const d = await res.json();
      if (typeof d === "string") msg = d;
      else if (d.detail) msg = Array.isArray(d.detail) ? d.detail[0]?.msg ?? String(d.detail[0]) : d.detail;
      else if (d.non_field_errors?.length) msg = Array.isArray(d.non_field_errors) ? d.non_field_errors[0] : d.non_field_errors;
      else {
        const k = Object.keys(d)[0];
        if (k) { const v = d[k]; msg = `${k}: ${Array.isArray(v) ? v[0] : v}`; }
      }
    } catch { /* keep statusText */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function refreshTokens(): Promise<boolean> {
  try {
    const r = await fetch(`${API}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrfToken() },
      credentials: "include",
    });
    return r.ok;
  } catch { return false; }
}

// ── XHR-based upload for progress tracking (used for large videos) ──────────
export function uploadWithProgress(
  path: string,
  data: FormData,
  onProgress: (pct: number) => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}${path}`);
    xhr.withCredentials = true;
    const csrf = getCsrfToken();
    if (csrf) xhr.setRequestHeader("X-CSRFToken", csrf);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { resolve(null); }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try { const d = JSON.parse(xhr.responseText); msg = d.detail || msg; } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(data);
  });
}

// ── Types ────────────────────────────────────────────────────────────────────
export type User = {
  id: number; email: string; full_name: string; phone: string;
  is_agent: boolean; agent_profile: AgentProfile | null;
};
export type AgentProfile = {
  agency_name: string; license_number: string; bio: string; photo: string | null;
  contact_phone: string; whatsapp_number: string; viber_number: string;
  pricing_tier: "basic" | "standard" | "premium";
  rating_avg: string; rating_count: number;
};
export type AgentPublic = {
  id: number; full_name: string; email: string; agency_name: string;
  bio: string; photo: string | null; contact_phone: string;
  whatsapp_number: string; pricing_tier: string;
  rating_avg: string; rating_count: number; listing_count: number;
};

export type MediaType =
  | "gallery" | "floorplan"
  | "video_tour" | "video_360" | "video_live"
  | "panorama";

export type PropertyMediaT = {
  id: number;
  url: string;
  thumbnail_url: string | null;
  caption: string;
  media_type: MediaType;
  mime_type: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  order: number;
  is_primary: boolean;
  processing_status: "pending" | "ready" | "failed";
  is_video: boolean;
  is_image: boolean;
};

export type Property = {
  id: number; slug: string; title: string;
  listing_type: "sale" | "rent" | "lease";
  category: "residential" | "commercial" | "land" | "luxury";
  property_type: string; city: string; address: string;
  price: number; area_sqm: string;
  bedrooms: number; bathrooms: number; garden: boolean; living_rooms: number; kitchens: number;
  latitude: string; longitude: string;
  is_luxury: boolean; is_featured: boolean; has_video: boolean;
  primary_image: string | null; agent_name: string;
  is_saved: boolean; status: string; created_at: string;
};

export type NearbyAmenity = { type: string; name: string; distance_m: number };

export type PropertyDetail = {
  id: number; slug: string; title: string; description: string;
  listing_type: Property["listing_type"]; category: Property["category"];
  property_type: string; status: string;
  city: string; address: string; latitude: string; longitude: string;
  price: number; price_negotiable: boolean;
  area_sqm: string; bedrooms: number; bathrooms: number;
  living_rooms: number; kitchens: number; floors: number; built_year: number | null;
  is_luxury: boolean; is_featured: boolean;
  brochure_pdf: string | null;
  is_saved: boolean; views_count: number; created_at: string;
  agent_name: string; agent_email: string; agent_phone: string;
  // Media groups returned by the API
  gallery_items: PropertyMediaT[];   // gallery photos + tour/live videos
  media_360: PropertyMediaT[];       // 360° videos + panoramas
  floor_plans: PropertyMediaT[];
  nearby_amenities: NearbyAmenity[];
};

// ── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  signupEmail: (email: string, password: string, full_name: string) =>
    api<User>("/auth/registration/", {
      method: "POST", body: JSON.stringify({ email, password1: password, password2: password, full_name }),
    }),
  loginEmail: (email: string, password: string) =>
    api<User>("/auth/login/", { method: "POST", body: JSON.stringify({ email, password }) }),
  loginFacebook: (access_token: string) =>
    api<User>("/auth/facebook/", { method: "POST", body: JSON.stringify({ access_token }) }),
  me: () => api<User>("/users/me/"),
  logout: () => api<void>("/auth/logout/", { method: "POST" }).catch(() => undefined),
};

export const agentsApi = {
  register: (data: FormData) =>
    api<AgentProfile>("/users/agent/register/", { method: "POST", body: data, isForm: true }),
  me: () => api<AgentProfile>("/users/agent/me/"),
  list: () => api<AgentPublic[]>("/users/agents/"),
};

export const properties = {
  publicList: (params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    return api<{ count: number; results: Property[] }>(`/properties/?${qs}`);
  },
  get: (slug: string) => api<PropertyDetail>(`/properties/${slug}/`),
  myListings: () => api<{ results: Property[] }>("/properties/my/"),
  update: (slug: string, data: Record<string, unknown>) =>
    api<Property>(`/properties/${slug}/`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (slug: string) => api<void>(`/properties/${slug}/remove/`, { method: "DELETE" }),
  savedListings: () => api<{ results: Property[] }>("/properties/saved/"),
  toggleSave: (slug: string) =>
    api<{ saved: boolean }>(`/properties/${slug}/toggle_save/`, { method: "POST" }),
  compare: (slugs: string[]) =>
    api<PropertyDetail[]>(`/properties/compare/?slugs=${slugs.join(",")}`),
  create: (data: Record<string, unknown>) =>
    api<Property>("/properties/", { method: "POST", body: JSON.stringify(data) }),
  uploadMedia: (slug: string, data: FormData, onProgress?: (pct: number) => void) => {
    if (onProgress) return uploadWithProgress(`/properties/${slug}/upload_media/`, data, onProgress);
    return api(`/properties/${slug}/upload_media/`, { method: "POST", body: data, isForm: true });
  },
};

// ── Formatters ───────────────────────────────────────────────────────────────
export function sqmToAana(sqm: number | string): string {
  return ((typeof sqm === "string" ? parseFloat(sqm) : sqm) / 31.7951).toFixed(2);
}
export function formatNPR(paisa: number): string {
  const r = paisa / 100;
  if (r >= 10_000_000) return `Rs. ${(r / 10_000_000).toFixed(2)} Cr`;
  if (r >= 100_000) return `Rs. ${(r / 100_000).toFixed(2)} Lakh`;
  if (r >= 1_000) return `Rs. ${(r / 1_000).toFixed(1)} K`;
  return `Rs. ${r.toLocaleString()}`;
}
export function lakhToPaisa(lakh: number): number {
  return Math.round(lakh * 100_000 * 100);
}
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000).toFixed(0)} KB`;
}
