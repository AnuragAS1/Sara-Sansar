"""Property catalog — SQLite for demo, swap ENGINE to PostGIS for production."""
from django.conf import settings
from django.db import models
from django.utils.text import slugify


# ─── Upload path routing ──────────────────────────────────────────────────────
def media_upload_path(instance, filename):
    """Route uploads to type-specific sub-folders so CDN/S3 rules can apply per type."""
    folder = {
        "gallery":    "properties/gallery",
        "floorplan":  "properties/floorplans",
        "video_tour": "properties/videos/tours",
        "video_360":  "properties/videos/360",
        "video_live": "properties/videos/live",
        "panorama":   "properties/panoramas",
    }.get(getattr(instance, "media_type", ""), "properties/misc")
    prop_id = getattr(instance, "listing_id", "unknown")
    return f"{folder}/{prop_id}/{filename}"


def thumbnail_upload_path(instance, filename):
    return f"thumbnails/{getattr(instance, 'listing_id', 'unknown')}/{filename}"


# ─── Property ─────────────────────────────────────────────────────────────────
class Property(models.Model):
    class ListingType(models.TextChoices):
        SALE  = "sale",  "For Sale"
        RENT  = "rent",  "For Rent"
        LEASE = "lease", "For Lease"

    class Category(models.TextChoices):
        RESIDENTIAL = "residential", "Residential"
        COMMERCIAL  = "commercial",  "Commercial"
        LAND        = "land",        "Land"
        LUXURY      = "luxury",      "Luxury / Hospitality"

    class PropertyType(models.TextChoices):
        FLAT      = "flat",      "Flat / Apartment"
        HOUSE     = "house",     "House"
        BUNGALOW  = "bungalow",  "Bungalow"
        PENTHOUSE = "penthouse", "Penthouse"
        VILLA     = "villa",     "Villa"
        HOTEL     = "hotel",     "Hotel"
        RESORT    = "resort",    "Resort"
        SHOP      = "shop",      "Shop"
        OFFICE    = "office",    "Office"
        PLOT      = "plot",      "Plot"

    class FacingDirection(models.TextChoices):
        NORTH = "north", "North"
        SOUTH = "south", "South"
        EAST  = "east",  "East"
        WEST  = "west",  "West"
        NE    = "north_east", "North-East"
        NW    = "north_west", "North-West"
        SE    = "south_east", "South-East"
        SW    = "south_west", "South-West"

    class RoadType(models.TextChoices):
        MAIN    = "main_road",    "Main Road"
        SIDE    = "side_road",    "Side Road"
        HIGHWAY = "highway",      "Highway"
        PRIVATE = "private_street","Private Street"
        ALLEY   = "alley",        "Alley / Galli"

    class FurnishingStatus(models.TextChoices):
        FURNISHED     = "furnished",      "Furnished"
        UNFURNISHED   = "unfurnished",    "Unfurnished"
        SEMI          = "semi_furnished", "Semi-furnished"

    class Status(models.TextChoices):
        DRAFT    = "draft",    "Draft"
        ACTIVE   = "active",   "Active"
        SOLD     = "sold",     "Sold"
        RENTED   = "rented",   "Rented"
        INACTIVE = "inactive", "Inactive"

    slug         = models.SlugField(max_length=220, unique=True, blank=True)
    title        = models.CharField(max_length=200)
    description  = models.TextField()

    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name="listed_properties", limit_choices_to={"is_agent": True},
    )

    listing_type  = models.CharField(max_length=10,  choices=ListingType.choices)
    category      = models.CharField(max_length=20,  choices=Category.choices)
    property_type = models.CharField(max_length=20,  choices=PropertyType.choices)
    status        = models.CharField(max_length=20,  choices=Status.choices, default=Status.DRAFT)

    city      = models.CharField(max_length=80)
    address   = models.CharField(max_length=255)
    latitude  = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    # Production: add PointField(srid=4326) here after migrating to PostGIS

    price            = models.BigIntegerField(help_text="In NPR paisa")
    price_negotiable = models.BooleanField(default=False)

    area_sqm    = models.DecimalField(max_digits=12, decimal_places=2)
    bedrooms    = models.PositiveSmallIntegerField(default=0)
    bathrooms   = models.PositiveSmallIntegerField(default=0)
    living_rooms = models.PositiveSmallIntegerField(default=0)
    kitchens    = models.PositiveSmallIntegerField(default=0)
    parking     = models.PositiveSmallIntegerField(default=0)
    garden      = models.BooleanField(default=False)
    floors      = models.PositiveSmallIntegerField(default=0)
    built_year  = models.PositiveSmallIntegerField(null=True, blank=True)
    built_year_bs = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Bikram Sambat year")
    built_area_sqft = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Building/house area in sq ft")
    facing_direction = models.CharField(max_length=20, choices=FacingDirection.choices, blank=True)
    road_access_ft   = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Road access width in feet")
    road_type        = models.CharField(max_length=20, choices=RoadType.choices, blank=True)
    furnishing_status = models.CharField(max_length=20, choices=FurnishingStatus.choices, blank=True)

    # Property detail fields
    water_source    = models.CharField(max_length=40, blank=True, help_text="e.g. Municipal, Boring, Well")
    sewage_system   = models.CharField(max_length=40, blank=True, help_text="e.g. Septic tank, Municipal sewer")
    bank_loan_eligible = models.BooleanField(default=True)

    # Amenities — stored as JSON list of strings
    amenities       = models.JSONField(default=list, blank=True, help_text='e.g. ["water_supply","electricity","internet"]')

    is_luxury   = models.BooleanField(default=False, db_index=True)
    is_featured = models.BooleanField(default=False)

    brochure_pdf      = models.FileField(upload_to="brochures/", blank=True, null=True)
    nearby_amenities  = models.JSONField(default=list, blank=True)

    views_count = models.PositiveIntegerField(default=0)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "listing_type", "category"]),
            models.Index(fields=["city", "status"]),
            models.Index(fields=["price"]),
            models.Index(fields=["is_luxury", "status"]),
        ]
        verbose_name_plural = "properties"

    def save(self, *args, **kwargs):
        if not self.slug:
            super().save(*args, **kwargs)
            self.slug = f"{slugify(self.title)[:200]}-{self.pk}"
            super().save(update_fields=["slug"])
            return
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.title


# ─── PropertyMedia ─────────────────────────────────────────────────────────────
class PropertyMedia(models.Model):
    """
    Unified media table for a property.
    Replaces the old PropertyImage model.

    media_type  | file content                | viewer
    ------------|-----------------------------|-----------------------
    gallery     | JPEG/PNG/WebP photo         | <img>
    floorplan   | Blueprint image             | <img> (dedicated section)
    video_tour  | MP4 walkthrough video       | <video controls>
    video_360   | equirectangular MP4         | HTML5 video + 360 badge
    video_live  | Short live-view MP4 clip    | <video controls>
    panorama    | equirectangular JPEG        | Pannellum (phase 3)
    """

    class MediaType(models.TextChoices):
        GALLERY    = "gallery",    "Gallery photo"
        FLOORPLAN  = "floorplan",  "Floor plan"
        VIDEO_TOUR = "video_tour", "Property tour video"
        VIDEO_360  = "video_360",  "360° video"
        VIDEO_LIVE = "video_live", "Live view clip"
        PANORAMA   = "panorama",   "360° panorama photo"

    class ProcessingStatus(models.TextChoices):
        PENDING = "pending", "Processing"
        READY   = "ready",   "Ready"
        FAILED  = "failed",  "Processing failed"

    VIDEO_TYPES = {MediaType.VIDEO_TOUR, MediaType.VIDEO_360, MediaType.VIDEO_LIVE}
    IMAGE_TYPES = {MediaType.GALLERY, MediaType.FLOORPLAN, MediaType.PANORAMA}

    listing    = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="media",
                                   db_column="property_id")
    file       = models.FileField(upload_to=media_upload_path)
    thumbnail  = models.ImageField(upload_to=thumbnail_upload_path, blank=True, null=True,
                                   help_text="Auto-generated for videos; uploaded alongside images optionally")
    caption    = models.CharField(max_length=160, blank=True)
    media_type = models.CharField(max_length=20, choices=MediaType.choices)
    mime_type  = models.CharField(max_length=80, blank=True,
                                  help_text="e.g. image/jpeg, video/mp4 — set on upload")

    # Video-specific metadata
    file_size_bytes  = models.BigIntegerField(default=0)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    width            = models.PositiveSmallIntegerField(null=True, blank=True)
    height           = models.PositiveSmallIntegerField(null=True, blank=True)

    order      = models.PositiveSmallIntegerField(default=0)
    is_primary = models.BooleanField(default=False,
                                     help_text="Primary gallery photo used as listing thumbnail")
    processing_status = models.CharField(
        max_length=20, choices=ProcessingStatus.choices,
        default=ProcessingStatus.READY,
        help_text="Set to PENDING when video needs transcoding, READY when playable"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["listing", "media_type"]),
            models.Index(fields=["listing", "is_primary"]),
        ]

    @property
    def is_video(self):
        return self.media_type in self.VIDEO_TYPES

    @property
    def is_image(self):
        return self.media_type in self.IMAGE_TYPES

    def __str__(self):
        return f"{self.listing} — {self.get_media_type_display()} #{self.id}"


# ─── SavedListing ─────────────────────────────────────────────────────────────
class SavedListing(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_listings"
    )
    listing = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="saved_by",
                                db_column="property_id")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "listing")]
        ordering = ["-created_at"]
