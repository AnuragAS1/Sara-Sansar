from rest_framework import serializers
from .models import Property, PropertyMedia, SavedListing


class PropertyMediaSerializer(serializers.ModelSerializer):
    url           = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = PropertyMedia
        fields = [
            "id", "url", "thumbnail_url", "caption",
            "media_type", "mime_type",
            "file_size_bytes", "duration_seconds", "width", "height",
            "order", "is_primary", "processing_status",
            "is_video", "is_image",
        ]
        read_only_fields = ["id", "is_video", "is_image"]

    def get_url(self, obj):
        request = self.context.get("request")
        if obj.file:
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None

    def get_thumbnail_url(self, obj):
        request = self.context.get("request")
        if obj.thumbnail:
            return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url
        return None


class PropertyListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()
    has_video     = serializers.SerializerMethodField()
    agent_name    = serializers.CharField(source="agent.full_name", read_only=True)
    is_saved      = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "id", "slug", "title", "listing_type", "category", "property_type",
            "city", "address", "price", "area_sqm",
            "bedrooms", "bathrooms", "living_rooms", "kitchens", "parking",
            "garden", "built_area_sqft", "built_year", "built_year_bs",
            "facing_direction", "road_access_ft", "road_type", "furnishing_status",
            "water_source", "sewage_system", "bank_loan_eligible", "amenities",
            "latitude", "longitude", "is_luxury", "is_featured",
            "primary_image", "has_video", "agent_name",
            "is_saved", "status", "created_at",
        ]

    def get_primary_image(self, obj):
        request = self.context.get("request")
        item = (
            obj.media.filter(media_type="gallery", is_primary=True).first()
            or obj.media.filter(media_type="gallery").first()
        )
        if item and item.file:
            return request.build_absolute_uri(item.file.url) if request else item.file.url
        return None

    def get_has_video(self, obj):
        return obj.media.filter(media_type__in=["video_tour", "video_360", "video_live"]).exists()

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return SavedListing.objects.filter(user=request.user, listing=obj).exists()
        return False


class PropertyDetailSerializer(serializers.ModelSerializer):
    # Gallery items = photos + tour/live videos together (ordered)
    gallery_items = serializers.SerializerMethodField()
    # 360° content (video_360 + panorama) — shown in dedicated immersive section
    media_360     = serializers.SerializerMethodField()
    # Floor plans
    floor_plans   = serializers.SerializerMethodField()

    agent_name  = serializers.CharField(source="agent.full_name", read_only=True)
    agent_email = serializers.CharField(source="agent.email", read_only=True)
    agent_phone = serializers.SerializerMethodField()
    is_saved    = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = "__all__"
        read_only_fields = ["id", "slug", "agent", "views_count", "created_at", "updated_at"]

    def get_gallery_items(self, obj):
        qs = obj.media.filter(
            media_type__in=["gallery", "video_tour", "video_live"],
            processing_status="ready",
        )
        return PropertyMediaSerializer(qs, many=True, context=self.context).data

    def get_media_360(self, obj):
        qs = obj.media.filter(media_type__in=["video_360", "panorama"])
        return PropertyMediaSerializer(qs, many=True, context=self.context).data

    def get_floor_plans(self, obj):
        qs = obj.media.filter(media_type="floorplan")
        return PropertyMediaSerializer(qs, many=True, context=self.context).data

    def get_agent_phone(self, obj):
        profile = getattr(obj.agent, "agent_profile", None)
        return profile.contact_phone if profile else ""

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return SavedListing.objects.filter(user=request.user, listing=obj).exists()
        return False


class PropertyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        exclude = ["agent", "views_count", "is_featured"]
        read_only_fields = ["slug"]

    def create(self, validated_data):
        validated_data["agent"] = self.context["request"].user
        return super().create(validated_data)
