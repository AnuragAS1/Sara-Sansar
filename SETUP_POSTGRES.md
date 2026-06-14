# Postgres + PostGIS Setup — Ghar Sansar

Step-by-step guide to move from SQLite (demo) to a production Postgres database with PostGIS spatial support. Tested on Ubuntu 22.04 / 24.04.

---

## 1. Install Postgres 16 + PostGIS

```bash
# Add the official Postgres apt repo (gives newer versions than Ubuntu's default)
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail \
  https://www.postgresql.org/media/keys/ACCC4CF8.asc

sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'

sudo apt update
sudo apt install -y postgresql-16 postgresql-16-postgis-3 \
                    postgresql-16-postgis-3-scripts \
                    libpq-dev                        # required by psycopg2
```

---

## 2. Create the database, user, and PostGIS extension

```bash
sudo -u postgres psql << 'SQL'
-- Create a dedicated application user (never use the postgres superuser for app traffic)
CREATE USER gharsansar WITH PASSWORD 'CHANGE_THIS_STRONG_PASSWORD';

-- Create the database owned by the app user
CREATE DATABASE gharsansar_db OWNER gharsansar ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8';

-- Connect to the new DB and enable PostGIS
\c gharsansar_db

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Grant the app user full access
GRANT ALL PRIVILEGES ON DATABASE gharsansar_db TO gharsansar;
GRANT ALL ON SCHEMA public TO gharsansar;

-- Confirm
SELECT PostGIS_Full_Version();
SQL
```

Expected output includes something like:
```
POSTGIS="3.4.x" GEOS="3.12.x" ...
```

---

## 3. Install Python dependencies for Postgres + GeoDjango

```bash
cd ghar-sansar-demo/backend

# Add to requirements.txt (or install directly):
pip install psycopg2-binary         # Postgres adapter
pip install django-environ          # clean env var management (optional but recommended)

# GDAL is required by GeoDjango / PostGIS
sudo apt install -y binutils libproj-dev gdal-bin libgdal-dev python3-gdal
```

---

## 4. Update Django settings for Postgres

Edit `backend/.env` (create from `.env.example`):

```env
DEBUG=False
SECRET_KEY=your-long-random-secret-key-here-minimum-50-chars
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Postgres
DB_ENGINE=django.contrib.gis.db.backends.postgis
DB_NAME=gharsansar_db
DB_USER=gharsansar
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DB_HOST=localhost
DB_PORT=5432

# CORS / CSRF — exact origins, no trailing slashes
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com
```

Update `backend/ghar_sansar/settings.py` — replace the DATABASES block:

```python
import os

# Reads from environment; falls back to SQLite for local dev if no env set
DB_ENGINE = os.getenv("DB_ENGINE", "django.db.backends.sqlite3")

if DB_ENGINE == "django.contrib.gis.db.backends.postgis":
    DATABASES = {
        "default": {
            "ENGINE": "django.contrib.gis.db.backends.postgis",
            "NAME": os.getenv("DB_NAME", "gharsansar_db"),
            "USER": os.getenv("DB_USER", "gharsansar"),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": 60,          # persistent connections
            "OPTIONS": {
                "connect_timeout": 10,
                "sslmode": "require",    # enforce TLS to Postgres
            },
        }
    }
else:
    # Development fallback
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
```

Also add `django.contrib.gis` to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    ...
    "django.contrib.gis",       # ← add this
    "rest_framework",
    ...
]
```

---

## 5. Add the PostGIS PointField to the Property model (optional — recommended)

In `backend/apps/properties/models.py`, the current model stores `latitude` / `longitude` as decimals. For spatial queries (map bounding box, proximity search), add a PostGIS `PointField`. The decimal fields are kept for compatibility during migration.

```python
# At the top of models.py — change the import:
from django.contrib.gis.db import models   # replaces `from django.db import models`

# Inside class Property — add after longitude field:
location = models.PointField(
    srid=4326,              # WGS-84 coordinate system (standard GPS)
    null=True, blank=True,  # nullable while backfilling existing rows
    spatial_index=True,     # creates GIST index automatically
)
```

Then add a `save()` override to keep `location` in sync with lat/lng:

```python
from django.contrib.gis.geos import Point

def save(self, *args, **kwargs):
    if not self.slug:
        super().save(*args, **kwargs)
        self.slug = f"{slugify(self.title)[:200]}-{self.pk}"
        super().save(update_fields=["slug"])
        return
    # Sync spatial point from decimal coordinates
    if self.latitude and self.longitude:
        self.location = Point(float(self.longitude), float(self.latitude), srid=4326)
    return super().save(*args, **kwargs)
```

---

## 6. Run migrations

```bash
cd backend

# Delete any old SQLite migration files that reference the old engine
# (keep __init__.py, delete numbered migration files)
find apps/*/migrations -name "*.py" ! -name "__init__.py" -delete

# Generate fresh migrations
python manage.py makemigrations users properties

# Apply to Postgres
python manage.py migrate

# Confirm PostGIS spatial tables were created
python manage.py shell -c "
from apps.properties.models import Property
print('Property table exists:', Property.objects.count() >= 0)
"
```

---

## 7. Seed demo data

```bash
python manage.py seed_demo
```

This populates 4 agents + 19 properties including luxury listings. Images are downloaded from Lorem Picsum; floor plan images are generated locally using Pillow. Allow 2–3 minutes.

---

## 8. Create a superuser for Django Admin

```bash
python manage.py createsuperuser
# Follow prompts: email + password
# Access at: http://yourdomain.com/admin/
```

---

## 9. Collect static files and run with Gunicorn

```bash
pip install gunicorn

python manage.py collectstatic --no-input

# Start Gunicorn (adjust workers based on CPU: 2 * nCPUs + 1)
gunicorn ghar_sansar.wsgi:application \
  --workers 4 \
  --bind unix:/run/gunicorn.sock \
  --timeout 60 \
  --access-logfile /var/log/gunicorn/access.log \
  --error-logfile /var/log/gunicorn/error.log
```

For production, use a systemd unit file to manage Gunicorn, not a terminal session.

---

## 10. Nginx configuration (reverse proxy)

```nginx
# /etc/nginx/sites-available/gharsansar

upstream gunicorn {
    server unix:/run/gunicorn.sock fail_timeout=0;
}

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
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Django static files
    location /static/ {
        alias /home/deploy/ghar-sansar-demo/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # User uploaded media (images, floor plans)
    # In production: serve from S3/CDN instead, not Nginx
    location /media/ {
        alias /home/deploy/ghar-sansar-demo/backend/media/;
        expires 30d;
    }

    # Django API
    location /api/ {
        proxy_pass http://gunicorn;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20M;   # allow image uploads up to 20 MB
    }

    # Django admin
    location /admin/ {
        proxy_pass http://gunicorn;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Restrict admin to office IP in production:
        # allow 203.0.113.0/24;
        # deny all;
    }

    # Next.js frontend (if serving from same server)
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gharsansar /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11. SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# Auto-renewal is set up by Certbot's systemd timer
```

---

## 12. Useful index queries to add after launch

Run these once after migration to add the production-critical indexes:

```sql
-- Connect as superuser to add indexes
\c gharsansar_db

-- Already created by the model's Meta.indexes, but verify:
SELECT indexname FROM pg_indexes WHERE tablename = 'properties_property';

-- Full-text search index (for future search feature)
CREATE INDEX IF NOT EXISTS idx_property_fts ON properties_property
  USING gin(to_tsvector('english', title || ' ' || description));

-- Spatial index on location (already created by PointField but double-check)
CREATE INDEX IF NOT EXISTS idx_property_location ON properties_property
  USING gist(location);

-- Partial index for luxury page (fast)
CREATE INDEX IF NOT EXISTS idx_luxury_active ON properties_property(is_luxury, status)
  WHERE is_luxury = true AND status = 'active';

-- Price range queries
CREATE INDEX IF NOT EXISTS idx_property_price ON properties_property(price)
  WHERE status = 'active';
```

---

## 13. Backups

```bash
# Install wal-g or use pg_dump for simple scheduled backups
# Daily logical backup (add to cron: 0 2 * * *)
pg_dump -U gharsansar -h localhost gharsansar_db \
  | gzip > /backups/gharsansar_$(date +%Y%m%d).sql.gz

# Keep 30 days
find /backups -name "gharsansar_*.sql.gz" -mtime +30 -delete
```

---

## Quick reference — common commands

```bash
# Start / stop Postgres
sudo systemctl start  postgresql
sudo systemctl stop   postgresql
sudo systemctl status postgresql

# Connect to the app database
psql -U gharsansar -h localhost gharsansar_db

# Django management
python manage.py migrate                 # apply new migrations
python manage.py showmigrations          # check migration state
python manage.py dbshell                 # psql via Django settings
python manage.py seed_demo               # repopulate demo data

# Check PostGIS is working
python manage.py shell -c "
import django; django.setup()
from django.contrib.gis.db.backends.postgis.base import DatabaseWrapper
print('PostGIS OK')
"
```

---

## Environment variable checklist before going live

| Variable | Description | Example |
|---|---|---|
| `SECRET_KEY` | Random 50+ char string | `openssl rand -base64 50` |
| `DEBUG` | Must be `False` | `False` |
| `ALLOWED_HOSTS` | Comma-separated domains | `yourdomain.com,www.yourdomain.com` |
| `DB_ENGINE` | PostGIS backend | `django.contrib.gis.db.backends.postgis` |
| `DB_NAME` | Database name | `gharsansar_db` |
| `DB_USER` | App DB user | `gharsansar` |
| `DB_PASSWORD` | Strong password | (generated) |
| `DB_HOST` | DB server address | `localhost` or RDS endpoint |
| `CORS_ALLOWED_ORIGINS` | Frontend origin | `https://yourdomain.com` |
| `CSRF_TRUSTED_ORIGINS` | Same as CORS | `https://yourdomain.com` |
| `FACEBOOK_APP_ID` | If using FB login | from Meta Developer Console |
| `FACEBOOK_APP_SECRET` | If using FB login | from Meta Developer Console |
