# Ghar Sansar — Database Architecture

Full schema, media architecture, video storage strategy, and scaling roadmap.

---

## 1. Core schema

### `users_user`
| Column | Type | Notes |
|---|---|---|
| `id` | bigserial PK | |
| `email` | citext UNIQUE | indexed; case-insensitive collation |
| `full_name` | varchar(120) | |
| `phone` | varchar(20) | |
| `is_agent` | boolean | partial index WHERE is_agent=true |
| `is_active` | boolean | |
| `password` | varchar(128) | Argon2id |
| `created_at` | timestamptz | |

### `users_agentprofile`
| Column | Type | Notes |
|---|---|---|
| `user_id` | FK users_user UNIQUE ON DELETE CASCADE | |
| `agency_name` | varchar(120) | |
| `license_number` | varchar(60) nullable | |
| `bio` | text | |
| `photo` | varchar (CDN URL) | |
| `contact_phone`, `whatsapp_number`, `viber_number` | varchar(20) | |
| `pricing_tier` | enum(basic, standard, premium) | |
| `rating_avg` | numeric(3,2) | denormalized from reviews |
| `rating_count` | integer | |

### `properties_property`
Hot table — all browse/search queries hit this. Indexed for every common filter.

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial PK | |
| `slug` | varchar(220) UNIQUE | URL key |
| `title` | varchar(200) | FTS indexed |
| `description` | text | FTS indexed |
| `agent_id` | FK users_user ON DELETE PROTECT | protects against orphan listings |
| `listing_type` | enum(sale, rent, lease) | |
| `category` | enum(residential, commercial, land, luxury) | |
| `property_type` | enum(flat, house, bungalow, penthouse, villa, hotel, resort, shop, office, plot) | |
| `status` | enum(draft, active, sold, rented, inactive) | indexed |
| `city` | varchar(80) | indexed with status |
| `address` | varchar(255) | |
| `latitude` | numeric(9,6) | keep for demo compatibility |
| `longitude` | numeric(9,6) | keep for demo compatibility |
| `location` | geography(Point,4326) | production PostGIS field (GIST indexed) |
| `price` | bigint | NPR paisa (1 Rs = 100 paisa) |
| `price_negotiable` | boolean | |
| `area_sqm` | numeric(12,2) | |
| `bedrooms`, `bathrooms`, `kitchens`, `living_rooms`, `floors` | smallint | |
| `built_year` | smallint nullable | |
| `is_luxury` | boolean | partial index WHERE is_luxury=true |
| `is_featured` | boolean | |
| `brochure_pdf` | varchar (CDN URL) nullable | |
| `nearby_amenities` | jsonb | GIN indexed |
| `views_count` | integer | hot-row — use Redis buffer in production |
| `search_vector` | tsvector GENERATED | GIN indexed; auto-populated from title+desc+city |
| `created_at`, `updated_at` | timestamptz | |

### `properties_propertymedia` ← replaces the old `PropertyImage`

The unified media table for all property content: photos, floor plans, video tours, 360° videos, live clips.

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial PK | |
| `property_id` | FK properties_property ON DELETE CASCADE | |
| `file` | varchar (S3/CDN path) | routing: properties/{type}/{property_id}/filename |
| `thumbnail` | varchar nullable | auto-generated for videos; uploaded separately if needed |
| `caption` | varchar(160) | |
| `media_type` | enum(gallery, floorplan, video_tour, video_360, video_live, panorama) | indexed |
| `mime_type` | varchar(80) | e.g. "video/mp4", "image/jpeg" — set on upload |
| `file_size_bytes` | bigint | used for quota enforcement and display |
| `duration_seconds` | integer nullable | for videos; filled by backend after upload |
| `width` | smallint nullable | pixels |
| `height` | smallint nullable | pixels |
| `order` | smallint | sort order within type |
| `is_primary` | boolean | cover image for listing card (partial index) |
| `processing_status` | enum(pending, ready, failed) | video transcoding state |
| `created_at` | timestamptz | |

**Why a unified table instead of separate image/video tables?**
- A property can have a mix: 3 gallery photos + 1 tour video + 1 floor plan. Keeping them in one table lets you ORDER BY `order` across types in a single query, and simplifies the upload API.
- The `media_type` + `processing_status` columns give you enough discrimination for all queries.
- At scale, you'd shard this table by `property_id` range or move large-file metadata to object storage alongside the files themselves.

**Indexes on this table:**
```sql
CREATE INDEX pm_prop_type    ON properties_propertymedia (property_id, media_type);
CREATE INDEX pm_prop_primary ON properties_propertymedia (property_id) WHERE is_primary = true;
CREATE INDEX pm_processing   ON properties_propertymedia (processing_status) WHERE processing_status = 'pending';
```

### `properties_savedlisting`
| Column | Type | Notes |
|---|---|---|
| `user_id` | FK ON DELETE CASCADE | |
| `property_id` | FK ON DELETE CASCADE | |
| `created_at` | timestamptz | |
UNIQUE `(user_id, property_id)` | prevents double-save | index also serves the user's watchlist query |

---

## 2. Media / video architecture

### File types and size limits

| media_type | Accepted MIME types | Max size | Storage path |
|---|---|---|---|
| gallery | image/jpeg, png, webp, heic | 25 MB | properties/gallery/{prop_id}/ |
| floorplan | image/jpeg, png, webp | 25 MB | properties/floorplans/{prop_id}/ |
| video_tour | video/mp4, quicktime, webm | 500 MB | properties/videos/tours/{prop_id}/ |
| video_360 | video/mp4, quicktime, webm | 500 MB | properties/videos/360/{prop_id}/ |
| video_live | video/mp4, quicktime, webm | 500 MB | properties/videos/live/{prop_id}/ |
| panorama | image/jpeg, png, webp | 50 MB | properties/panoramas/{prop_id}/ |

### Demo (current) storage flow

```
Browser → multipart POST → Django (upload_media) → local media/ directory → served by Nginx
```

Suitable up to ~50 agents and a few hundred uploads. Fine for launch.

### Production storage flow

```
Browser → presigned URL request → Django → S3 presigned URL → Browser uploads directly to S3
       ↳ completion webhook → Django registers PropertyMedia record
                            → Celery worker: transcode video → write HLS chunks to S3
                                           → update processing_status = 'ready'
                                           → optionally extract thumbnail frame
```

**Why S3 presigned uploads?**
Large videos (200–500 MB) should never pass through Django — it ties up a Gunicorn worker for minutes and is an easy DoS vector. S3 presigned URLs let the browser upload directly to S3, and Django only handles metadata.

### Video transcoding (production)

```
Original upload (any codec/resolution) → FFmpeg via Celery
  → 1080p H.264 MP4 (primary delivery)
  → 720p H.264 MP4  (mobile fallback)
  → HLS playlist (.m3u8 + .ts chunks) for adaptive bitrate streaming

Output stored at: s3://bucket/properties/videos/{type}/{prop_id}/{filename}/
  ├── original.mp4
  ├── 1080p.mp4
  ├── 720p.mp4
  └── hls/
      ├── playlist.m3u8
      └── seg_000.ts, seg_001.ts, ...
```

HLS streaming means buyers on slow Nepali mobile networks get the 360p stream while buyers on fibre get 1080p — the same .m3u8 URL serves both.

**FFmpeg command for production:**
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 23 -preset fast -c:a aac -b:a 128k \
  -vf scale=1920:1080 -movflags +faststart output_1080p.mp4

# HLS
ffmpeg -i input.mp4 \
  -c:v libx264 -crf 23 -preset fast -c:a aac \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -hls_segment_filename "hls/seg_%03d.ts" \
  hls/playlist.m3u8
```

**Celery task structure (production blueprint):**

```python
@shared_task(bind=True, max_retries=3)
def transcode_video(self, media_id: int):
    media = PropertyMedia.objects.get(pk=media_id)
    media.processing_status = "pending"
    media.save(update_fields=["processing_status"])
    try:
        # download from S3, run ffmpeg, upload HLS to S3
        ...
        media.processing_status = "ready"
        media.save(update_fields=["processing_status"])
    except Exception as exc:
        media.processing_status = "failed"
        media.save(update_fields=["processing_status"])
        raise self.retry(exc=exc, countdown=60)
```

### CDN delivery

```
CloudFront (or Bunny CDN) → S3 bucket
  Cache headers: max-age=31536000 for videos (immutable, versioned by filename)
                 max-age=3600 for property metadata images (may update)
```

Images are served at /1200w, /800w, /400w breakpoints using CloudFront image transformation or a separate imgproxy instance. The browser requests the right size via `srcset`.

---

## 3. Query patterns for media

### Get all gallery items for property detail
```sql
SELECT pm.*, pm.file AS url
FROM properties_propertymedia pm
WHERE pm.property_id = $1
  AND pm.media_type IN ('gallery', 'video_tour', 'video_live')
  AND pm.processing_status = 'ready'
ORDER BY pm.order, pm.id;
```
Covered by `(property_id, media_type)` index.

### Get primary listing image for cards (used in browse list)
```sql
-- Via LATERAL join in the main browse query:
LEFT JOIN LATERAL (
  SELECT file FROM properties_propertymedia
  WHERE property_id = p.id AND media_type = 'gallery'
  ORDER BY is_primary DESC, "order" ASC LIMIT 1
) pm ON true
```
Covered by `(property_id) WHERE is_primary = true` partial index.

### Queue of videos awaiting transcoding
```sql
SELECT * FROM properties_propertymedia
WHERE processing_status = 'pending'
ORDER BY created_at ASC
LIMIT 10 FOR UPDATE SKIP LOCKED;
```
`FOR UPDATE SKIP LOCKED` lets multiple Celery workers pick up jobs concurrently without conflicts. Covered by the `processing_status = 'pending'` partial index.

---

## 4. Browse query (hot path)

```sql
SELECT
  p.id, p.slug, p.title, p.price, p.area_sqm, p.city,
  p.bedrooms, p.bathrooms, p.kitchens, p.is_luxury,
  pm.file AS primary_image,
  u.full_name AS agent_name,
  EXISTS (SELECT 1 FROM properties_savedlisting sl
          WHERE sl.property_id = p.id AND sl.user_id = $user_id) AS is_saved
FROM properties_property p
LEFT JOIN LATERAL (
  SELECT file FROM properties_propertymedia
  WHERE property_id = p.id AND media_type = 'gallery'
  ORDER BY is_primary DESC, "order" ASC LIMIT 1
) pm ON true
JOIN users_user u ON u.id = p.agent_id
WHERE p.status = 'active'
  AND p.city = $city
  AND p.category = $category
  AND p.price BETWEEN $min AND $max
ORDER BY p.created_at DESC
LIMIT 24 OFFSET $offset;
```

Execution plan uses `prop_status_type_cat` index + `prop_city_status` index, bitmap scan. At 100k rows: <10ms.

---

## 5. Full-text search (production)

Add a `search_vector` generated column and populate on insert/update via a trigger:

```sql
ALTER TABLE properties_property
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

CREATE INDEX prop_fts ON properties_property USING GIN (search_vector);
```

Query:
```sql
SELECT p.*, ts_rank(p.search_vector, query) AS rank
FROM properties_property p,
     plainto_tsquery('english', 'penthouse Kathmandu') query
WHERE p.search_vector @@ query
  AND p.status = 'active'
ORDER BY rank DESC
LIMIT 20;
```

---

## 6. Scaling media at high upload volume

| Volume | Strategy |
|---|---|
| Demo (<500 uploads) | Local `media/` directory, Nginx serves files |
| Early production (<10k uploads) | S3 + CloudFront, direct Django upload, no transcoding |
| Growth (10k–100k uploads) | S3 presigned uploads, Celery transcoding, HLS delivery |
| Scale (>100k uploads) | Shard media table by property_id range, video on separate S3 bucket with lifecycle rules (Glacier after 2 years), dedicated imgproxy for image resizing |

**Capacity planning (Nepal context):**
- Average 360° video: ~300 MB
- Average gallery photo set (5 photos after compression): ~15 MB
- Average property: 20 MB total media
- 10,000 properties: ~200 GB — fits on a single S3 bucket comfortably at <$5/month on Backblaze B2

---

## 7. Database-level integrity for media

```sql
-- No orphan media rows
ALTER TABLE properties_propertymedia
  ADD CONSTRAINT fk_property
  FOREIGN KEY (property_id) REFERENCES properties_property(id) ON DELETE CASCADE;

-- File path must be set (not empty string)
ALTER TABLE properties_propertymedia
  ADD CONSTRAINT file_not_empty CHECK (char_length(file) > 0);

-- Processing status values
ALTER TABLE properties_propertymedia
  ADD CONSTRAINT valid_status CHECK (processing_status IN ('pending','ready','failed'));

-- media_type values
ALTER TABLE properties_propertymedia
  ADD CONSTRAINT valid_media_type CHECK (
    media_type IN ('gallery','floorplan','video_tour','video_360','video_live','panorama')
  );

-- File size sanity: 0 bytes = bad upload; 600 MB = over limit
ALTER TABLE properties_propertymedia
  ADD CONSTRAINT valid_file_size CHECK (file_size_bytes BETWEEN 1 AND 629145600);
```

---

## 8. Future tables (V2)

| Table | Purpose |
|---|---|
| `properties_inquiry` | Buyer–agent message threads per property |
| `properties_viewing` | Scheduled viewing requests with calendar slots |
| `properties_review` | Post-viewing buyer review of agent (drives rating_avg) |
| `properties_price_log` | Immutable price change history per property |
| `properties_audit_log` | Status changes for compliance (GDPR, dispute resolution) |
| `properties_saved_search` | Saved filter sets with email alert preferences |
| `payments_transaction` | eSewa / Khalti payment records for premium listings |
| `media_chunk_upload` | Resumable chunked upload sessions for very large videos |
