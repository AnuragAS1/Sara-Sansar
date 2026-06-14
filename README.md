# Ghar Sansar (घरसंसार) — Real Estate, Nepal

Demo platform for property search and listing in Nepal. Django + Next.js with a sage-green minimalist UI.

---

## What's new in this build

**Features**
- **Compare** up to 5 properties — sticky bottom tray, side-by-side comparison table at `/compare`
- **Manual filter inputs** — Price (Lakh) and Area (Aana) with number inputs, applied on blur or Enter
- **Three view modes** in `/browse` — Grid / List / Map (full map view + listing column)
- **Luxury page** at `/luxury` — penthouses, villas, hotels, resorts grouped by type
- **Floor plans** as a dedicated upload + display section (separate from gallery)
- **Auth-gated heart button** — redirects to `/login?next=...` when unauthenticated
- **Responsive layout** — fluid type (`clamp`), mobile-first nav with hamburger, works in tablets and zoomed browsers

**Bug fixes**
- Agent register flow uses `refreshUser()` return value; only navigates after `is_agent=true` confirmed
- Custom `EmailLoginSerializer` bypasses dj-rest-auth's broken username-field lookup on email-only auth
- Inline errors (no popups) for login/signup, with consistent error normalization in `api.ts`
- Renamed `agents` → `agentsApi` exports to avoid route-name collision

**Security hardening**
- Login throttle: **5/min** per IP, **60/min** anon, **240/min** authenticated user
- Strengthened password validators (8 chars min, no common passwords, numeric-only rejected)
- `X_FRAME_OPTIONS=DENY`, content-type nosniff, XSS filter
- Error messages don't differentiate "user not found" from "wrong password" (prevents email enumeration)
- Documented in `DATABASE.md`: planned row-level security, audit logging, PII tagging

**Theme**
- Sage / forest green palette throughout (CSS vars + Tailwind). Eye-pleasing, minimal, symmetric.

---

## Stack

- **Backend**: Django 5 + DRF + dj-rest-auth + JWT + SQLite (Postgres+PostGIS for production — see `DATABASE.md`)
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + Leaflet (free OSM, no API key)

---

## Running locally

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Important: delete old SQLite if upgrading — new fields (is_luxury, kitchens)
rm -f db.sqlite3        # or: del db.sqlite3

python manage.py makemigrations users properties
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Backend runs on `http://localhost:8000`.

### Frontend

```bash
cd web
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

---

## Demo accounts (password `demo1234`)

- `pratima@sansar-realty.np` — Premium agent, residential Kathmandu valley
- `bikram@himal-homes.np` — Standard agent, commercial
- `anjali@valley-land.np` — Standard agent, land specialist
- `rajiv@luxe-nepal.np` — Premium agent, luxury & hospitality

Or sign up at `/signup` as a buyer and register as an agent at `/agent/register`.

---

## Project structure

```
ghar-sansar-demo/
├── backend/
│   ├── ghar_sansar/         # Django project (settings, urls, wsgi)
│   ├── apps/
│   │   ├── users/           # User + AgentProfile
│   │   └── properties/      # Property + PropertyImage + SavedListing
│   ├── core/                # Nepal-unit helpers
│   └── manage.py
├── web/
│   ├── app/                 # Next.js App Router pages
│   │   ├── browse/          # Filter + 3-view browsing
│   │   ├── compare/         # Side-by-side comparison
│   │   ├── luxury/          # Luxury & hotels landing
│   │   ├── property/[slug]/ # Detail with gallery + floor plans
│   │   ├── agent/           # Register, dashboard, new-listing
│   │   ├── agents/          # Public agent directory
│   │   ├── login/, signup/, watchlist/
│   ├── components/          # nav, cards, map, compare-tray, theme-toggle
│   ├── contexts/            # auth-context, compare-context
│   └── lib/api.ts           # API client + types
├── DATABASE.md              # Schema, indexes, scaling notes
└── README.md
```

---

## Notes for production

- See `DATABASE.md` for the migration path from SQLite to Postgres+PostGIS, including index design, read-replica strategy, partitioning, and security at the data layer.
- JWT lives in localStorage in this demo; in production you should switch to httpOnly cookies (dj-rest-auth supports `JWT_AUTH_HTTPONLY=True`) to mitigate XSS token theft.
- All write endpoints are throttled. The login throttle is intentionally tight (5/min/IP).
- Object storage (S3 / Backblaze) replaces local `media/` for uploaded images at scale; the DB only stores paths.
