# Ghar Sansar — Postgres + PostGIS Production Setup

Complete step-by-step guide to move from the SQLite demo to a production-grade
Postgres + PostGIS database. Tested on Ubuntu 22.04 LTS (the recommended VPS OS).

---

## 1. Install Postgres 16 + PostGIS on the server

```bash
# Add the official Postgres apt repo (get the latest, not the Ubuntu-bundled version)
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail \
  https://www.postgresql.org/media/keys/ACCC4CF8.asc
sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'

sudo apt update
sudo apt install -y postgresql-16 postgresql-16-postgis-3 postgis
```

Confirm PostGIS is installed:

```bash
psql --version        # should say 16.x
psql -U postgres -c "SELECT PostGIS_Version();"
```

---

## 2. Create the database, user, and enable extensions

```bash
sudo -u postgres psql << 'SQL'
-- Create a dedicated DB user (use a strong password — store it in your .env)
CREATE USER gharsansar WITH PASSWORD 'CHANGE_THIS_STRONG_PASSWORD';

-- Create the database owned by that user
CREATE DATABASE gharsansar_db OWNER gharsansar ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';

-- Connect to the new database and enable extensions
\c gharsansar_db

-- PostGIS: geography / geometry types, spatial indexes
CREATE EXTENSION IF NOT EXISTS postgis;

-- pg_trgm: fast LIKE / ILIKE and trigram full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent: normalise Nepali-romanised strings (Lalitpur vs lalitpur vs Lalīpur)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Grant the user full privileges on the new DB
GRANT ALL PRIVILEGES ON DATABASE gharsansar_db TO gharsansar;
GRANT ALL ON SCHEMA public TO gharsansar;

SQL
```

---

## 3. Install Python GIS dependencies

```bash
# On the server (inside your virtualenv)
sudo apt install -y libgdal-dev gdal-bin python3-gdal

pip install psycopg2-binary          # Postgres adapter
pip install django.contrib.gis       # ships with Django — just needs GDAL on the system
```

Update `requirements.txt`:

```
# replace or add:
psycopg2-binary>=2.9
# django.contrib.gis is part of Django — no separate package needed
```

---

## 4. Update Django settings for Postgres + PostGIS

Edit `backend/.env` (never commit this file):

```env
DEBUG=False
SECRET_KEY=replace-with-50-random-chars
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com

DB_NAME=gharsansar_db
DB_USER=gharsansar
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DB_HOST=localhost
DB_PORT=5432
```

Update `backend/ghar_sansar/settings.py` — replace the `DATABASES` block:

```python
import os

# Switch to PostGIS-enabled backend
DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME":     os.getenv("DB_NAME",     "gharsansar_db"),
        "USER":     os.getenv("DB_USER",     "gharsansar"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST":     os.getenv("DB_HOST",     "localhost"),
        "PORT":     os.getenv("DB_PORT",     "5432"),
        "CONN_MAX_AGE": 60,           # keep connections alive for 60 s (reduces overhead)
        "OPTIONS": {
            "connect_timeout": 10,
            "sslmode": "require",     # enforce TLS — remove only if DB is on the same server
        },
    }
}
```

Also add `django.contrib.gis` to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    ...
    "django.contrib.gis",       # ← add this
    ...
]
```

---

## 5. Add PostGIS PointField to the Property model (optional but recommended)

The current model stores `latitude` and `longitude` as plain `DecimalField`.
For production, add a `PointField` so spatial queries (radius search, map
bounding-box) run in the DB rather than Python.

In `backend/apps/properties/models.py`:

```python
from django.contrib.gis.db import models as gis_models

class Property(models.Model):
    ...
    latitude  = models.DecimalField(max_digits=9, decimal_places=6)   # keep for fallback
    longitude = models.DecimalField(max_digits=9, decimal_places=6)   # keep for fallback
    location  = gis_models.PointField(srid=4326, null=True, blank=True)  # ← new
    ...
```

Add a `save()` hook to auto-populate `location` from lat/lng:

```python
from django.contrib.gis.geos import Point

def save(self, *args, **kwargs):
    if self.latitude and self.longitude:
        self.location = Point(float(self.longitude), float(self.latitude), srid=4326)
    # slug logic ...
    super().save(*args, **kwargs)
```

---

## 6. Run migrations

```bash
cd backend
python manage.py makemigrations users properties
python manage.py migrate
```

Expected output includes:
```
Applying properties.0001_initial... OK
Applying users.0001_initial... OK
```

If you see `django.core.exceptions.ImproperlyConfigured: Could not find the GDAL library`,
run `sudo apt install -y libgdal-dev gdal-bin` and check that `gdal-config --version` works.

---

## 7. Create the production indexes

After the first migration, add these indexes for performance.
Create a new empty migration:

```bash
python manage.py makemigrations properties --empty --name=add_production_indexes
```

Edit the generated file and add to `operations`:

```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [("properties", "0001_initial")]

    operations = [
        # Composite index covers browse's most common filter combo
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS prop_status_type_cat "
            "ON properties_property (status, listing_type, category);",
            reverse_sql="DROP INDEX IF EXISTS prop_status_type_cat;"
        ),
        # City + status for geo filtering
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS prop_city_status "
            "ON properties_property (city, status);",
            reverse_sql="DROP INDEX IF EXISTS prop_city_status;"
        ),
        # Partial index for luxury page — only indexes rows where is_luxury=true
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS prop_luxury "
            "ON properties_property (status) WHERE is_luxury = true;",
            reverse_sql="DROP INDEX IF EXISTS prop_luxury;"
        ),
        # PostGIS spatial index for map view
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS prop_location_gist "
            "ON properties_property USING GIST (location);",
            reverse_sql="DROP INDEX IF EXISTS prop_location_gist;"
        ),
        # JSONB GIN index for amenity containment queries
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS prop_amenities_gin "
            "ON properties_property USING GIN (nearby_amenities);",
            reverse_sql="DROP INDEX IF EXISTS prop_amenities_gin;"
        ),
        # Full-text search vector — add search_vector column + GIN index
        migrations.RunSQL(
            """
            ALTER TABLE properties_property
              ADD COLUMN IF NOT EXISTS search_vector tsvector
              GENERATED ALWAYS AS (
                to_tsvector('english',
                  coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(city, '')
                )
              ) STORED;
            CREATE INDEX IF NOT EXISTS prop_fts
              ON properties_property USING GIN (search_vector);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS prop_fts;
            ALTER TABLE properties_property DROP COLUMN IF EXISTS search_vector;
            """
        ),
    ]
```

Then run:

```bash
python manage.py migrate properties
```

---

## 8. Seed demo data (optional — skip for a clean production DB)

```bash
python manage.py seed_demo
```

---

## 9. Collect static files + configure Gunicorn

```bash
python manage.py collectstatic --noinput

# Install Gunicorn
pip install gunicorn

# Test it works
gunicorn ghar_sansar.wsgi:application --bind 0.0.0.0:8000 --workers 3
```

Create a systemd service `/etc/systemd/system/gharsansar.service`:

```ini
[Unit]
Description=Ghar Sansar Django API
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/ghar-sansar/backend
EnvironmentFile=/var/www/ghar-sansar/backend/.env
ExecStart=/var/www/ghar-sansar/.venv/bin/gunicorn \
    ghar_sansar.wsgi:application \
    --bind unix:/run/gharsansar.sock \
    --workers 4 \
    --timeout 120 \
    --access-logfile /var/log/gharsansar/access.log \
    --error-logfile  /var/log/gharsansar/error.log
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gharsansar
sudo systemctl status gharsansar
```

---

## 10. Nginx reverse proxy

Install: `sudo apt install -y nginx`

Create `/etc/nginx/sites-available/gharsansar`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Django API
    location /api/ {
        proxy_pass         http://unix:/run/gharsansar.sock;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        client_max_body_size 20M;    # allow image uploads
    }

    # Django admin + static
    location /admin/ {
        proxy_pass http://unix:/run/gharsansar.sock;
        proxy_set_header Host $host;
    }
    location /static/ { alias /var/www/ghar-sansar/backend/staticfiles/; }
    location /media/  { alias /var/www/ghar-sansar/backend/media/; }

    # Next.js frontend (served by its own process on :3000)
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gharsansar /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS cert with Let's Encrypt (free)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 11. Verify the full stack

```bash
# Backend health
curl https://yourdomain.com/api/users/csrf/
# → {"detail": "CSRF cookie set."}

# Properties list
curl https://yourdomain.com/api/properties/
# → {"count": N, "results": [...]}

# PostGIS active
sudo -u postgres psql gharsansar_db -c "SELECT PostGIS_Version();"
# → 3.x.x ...
```

---

## Quick reference — common admin tasks

```bash
# Connect to the DB directly
sudo -u postgres psql gharsansar_db

# Check index usage
psql gharsansar_db -c "SELECT relname, idx_scan, idx_tup_read FROM pg_stat_user_indexes ORDER BY idx_scan DESC LIMIT 20;"

# Vacuum + analyze after bulk imports
psql gharsansar_db -c "VACUUM ANALYZE properties_property;"

# Backup (run nightly via cron)
pg_dump gharsansar_db | gzip > /backups/gharsansar_$(date +%F).sql.gz

# Restore
gunzip -c /backups/gharsansar_2026-05-22.sql.gz | psql gharsansar_db

# Django shell
cd /var/www/ghar-sansar/backend
python manage.py shell
```

---

## Environment variables checklist before going live

| Variable | Where | Notes |
|---|---|---|
| `SECRET_KEY` | backend/.env | 50+ random chars, never reuse dev key |
| `DEBUG` | backend/.env | Must be `False` |
| `ALLOWED_HOSTS` | backend/.env | Your domain only |
| `DB_PASSWORD` | backend/.env | Strong, unique |
| `CORS_ALLOWED_ORIGINS` | backend/.env | Your frontend domain with https:// |
| `CSRF_TRUSTED_ORIGINS` | backend/.env | Same as CORS |
| `NEXT_PUBLIC_API_URL` | web/.env.local | `https://yourdomain.com/api` |
| `FACEBOOK_APP_ID` | backend/.env | From Meta developer console |
| `FACEBOOK_APP_SECRET` | backend/.env | From Meta developer console |
