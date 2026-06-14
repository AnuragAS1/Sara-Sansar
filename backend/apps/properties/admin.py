from django.contrib import admin
from .models import Property, PropertyMedia


class PropertyMediaInline(admin.TabularInline):
    model = PropertyMedia
    extra = 0
    readonly_fields = ("mime_type", "file_size_bytes", "duration_seconds", "processing_status", "created_at")
    fields = ("file", "thumbnail", "media_type", "caption", "order", "is_primary",
              "mime_type", "file_size_bytes", "processing_status")


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ("title", "city", "listing_type", "category", "price", "status",
                    "is_luxury", "agent", "created_at")
    list_filter  = ("listing_type", "category", "property_type", "status", "city", "is_luxury")
    search_fields = ("title", "city", "address", "agent__email")
    readonly_fields = ("slug", "views_count", "created_at", "updated_at")
    inlines = [PropertyMediaInline]


@admin.register(PropertyMedia)
class PropertyMediaAdmin(admin.ModelAdmin):
    list_display  = ("listing", "media_type", "mime_type", "file_size_bytes",
                     "is_primary", "processing_status", "created_at")
    list_filter   = ("media_type", "processing_status")
    readonly_fields = ("mime_type", "file_size_bytes", "duration_seconds", "created_at")
    raw_id_fields = ("listing",)
