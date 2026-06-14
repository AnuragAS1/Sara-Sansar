"""Property CRUD + unified media upload + save/compare."""
import mimetypes
import os

from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Property, PropertyMedia, SavedListing
from .serializers import (
    PropertyCreateSerializer, PropertyDetailSerializer,
    PropertyMediaSerializer, PropertyListSerializer,
)

# ─── Allowed types & size limits ──────────────────────────────────────────────
ALLOWED_IMAGE_MIME = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/heic", "image/heif",
}
ALLOWED_VIDEO_MIME = {
    "video/mp4", "video/quicktime", "video/webm",
    "video/x-msvideo", "video/x-m4v",
}
ALLOWED_MIME = ALLOWED_IMAGE_MIME | ALLOWED_VIDEO_MIME

MAX_IMAGE_BYTES = 25 * 1024 * 1024    # 25 MB
MAX_VIDEO_BYTES = 500 * 1024 * 1024   # 500 MB

IMAGE_MEDIA_TYPES = {"gallery", "floorplan", "panorama"}
VIDEO_MEDIA_TYPES = {"video_tour", "video_360", "video_live"}

VALID_MEDIA_TYPES = IMAGE_MEDIA_TYPES | VIDEO_MEDIA_TYPES


def _detect_mime(uploaded_file) -> str:
    """Return mime type: prefer Content-Type header, fall back to extension sniff."""
    ct = getattr(uploaded_file, "content_type", "") or ""
    if ct and ct in ALLOWED_MIME:
        return ct
    ext = os.path.splitext(uploaded_file.name)[1].lower()
    guessed, _ = mimetypes.guess_type(f"x{ext}")
    return guessed or ct or "application/octet-stream"


# ─── Permissions ──────────────────────────────────────────────────────────────
class IsAgentOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_agent

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.agent_id == request.user.id


# ─── Property ViewSet ─────────────────────────────────────────────────────────
class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.all().prefetch_related("media")
    permission_classes = [IsAgentOrReadOnly]
    lookup_field = "slug"
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_authenticators(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return []
        return super().get_authenticators()

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            qs = qs.filter(status=Property.Status.ACTIVE)
            p = self.request.query_params

            for field in ["listing_type", "category", "property_type", "city"]:
                if p.get(field):
                    qs = qs.filter(**{field: p[field]})

            if p.get("is_luxury") in ("true", "1"):
                qs = qs.filter(is_luxury=True)

            for f_param, q_filter in [
                ("min_price", "price__gte"), ("max_price", "price__lte"),
                ("bedrooms",  "bedrooms__gte"), ("bathrooms", "bathrooms__gte"),
                ("parking",   "parking__gte"),
                ("min_area",  "area_sqm__gte"), ("max_area",  "area_sqm__lte"),
                ("min_built_area", "built_area_sqft__gte"), ("max_built_area", "built_area_sqft__lte"),
                ("min_year", "built_year__gte"), ("max_year", "built_year__lte"),
                ("road_access_min", "road_access_ft__gte"),
            ]:
                v = p.get(f_param)
                if v:
                    try:
                        qs = qs.filter(**{q_filter: v})
                    except (ValueError, TypeError):
                        pass

            # Exact-match filters
            for f_param in ["facing_direction", "road_type", "furnishing_status"]:
                v = p.get(f_param)
                if v:
                    qs = qs.filter(**{f_param: v})

            # Boolean filters
            if p.get("garden") in ("true", "1"):
                qs = qs.filter(garden=True)
            if p.get("bank_loan") in ("true", "1"):
                qs = qs.filter(bank_loan_eligible=True)

            # Nearby amenities (JSON contains filter)
            if v := p.get("nearby"):
                for tag in v.split(","):
                    tag = tag.strip().lower()
                    if tag:
                        qs = qs.filter(nearby_amenities__contains=[{"type": tag}])

            # Filter by agent profile ID
            if v := p.get("agent"):
                try:
                    from apps.users.models import AgentProfile
                    profile = AgentProfile.objects.get(pk=int(v))
                    qs = qs.filter(agent=profile.user)
                except Exception:
                    pass

            sort = p.get("sort", "-created_at")
            allowed_sorts = ("price", "-price", "-created_at", "created_at", "area_sqm", "-area_sqm")
            if sort in allowed_sorts:
                qs = qs.order_by(sort)
        return qs


    @action(detail=True, methods=["delete"], permission_classes=[permissions.IsAuthenticated])
    def remove(self, request, slug=None):
        """Agents can delete their own listings."""
        prop = self.get_object()
        if prop.agent_id != request.user.id:
            return Response({"detail": "Not your listing."}, status=status.HTTP_403_FORBIDDEN)
        prop.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_serializer_class(self):
        if self.action == "list":
            return PropertyListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PropertyCreateSerializer
        return PropertyDetailSerializer

    # ── /api/properties/{slug}/upload_media/ ──────────────────────────────────
    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def upload_media(self, request, slug=None):
        """
        Upload a single media item (image or video) attached to a property.

        Form fields:
          file        — the file itself (required)
          media_type  — one of: gallery | floorplan | panorama |
                        video_tour | video_360 | video_live (required)
          caption     — optional string
          order       — optional integer (sort order)
          is_primary  — "true" / "false" (optional, images only)
        """
        prop = self.get_object()
        if prop.agent_id != request.user.id:
            return Response({"detail": "Not your listing."}, status=status.HTTP_403_FORBIDDEN)

        uploaded = request.FILES.get("file")
        if not uploaded:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        media_type = request.data.get("media_type", "gallery")
        if media_type not in VALID_MEDIA_TYPES:
            return Response(
                {"detail": f"Invalid media_type. Allowed: {sorted(VALID_MEDIA_TYPES)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mime = _detect_mime(uploaded)

        # Validate mime vs declared media_type
        if media_type in VIDEO_MEDIA_TYPES and mime not in ALLOWED_VIDEO_MIME:
            return Response(
                {"detail": f"Expected a video file for media_type={media_type}. Got: {mime}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if media_type in IMAGE_MEDIA_TYPES and mime not in ALLOWED_IMAGE_MIME:
            return Response(
                {"detail": f"Expected an image file for media_type={media_type}. Got: {mime}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Size limits
        file_size = uploaded.size
        max_bytes = MAX_VIDEO_BYTES if media_type in VIDEO_MEDIA_TYPES else MAX_IMAGE_BYTES
        if file_size > max_bytes:
            limit_mb = max_bytes // (1024 * 1024)
            return Response(
                {"detail": f"File too large. Limit for {media_type}: {limit_mb} MB."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        processing_status = (
            PropertyMedia.ProcessingStatus.PENDING
            if media_type in VIDEO_MEDIA_TYPES
            else PropertyMedia.ProcessingStatus.READY
        )

        media = PropertyMedia(
            listing=prop,
            media_type=media_type,
            mime_type=mime,
            file_size_bytes=file_size,
            caption=request.data.get("caption", ""),
            order=int(request.data.get("order", 0)),
            is_primary=request.data.get("is_primary", "false").lower() == "true",
            processing_status=processing_status,
        )
        media.file.save(uploaded.name, uploaded, save=True)

        # If a separate thumbnail was sent (optional, for video previews)
        thumb = request.FILES.get("thumbnail")
        if thumb:
            media.thumbnail.save(thumb.name, thumb, save=True)

        # After saving video, status becomes READY (no async worker in demo)
        if processing_status == PropertyMedia.ProcessingStatus.PENDING:
            media.processing_status = PropertyMedia.ProcessingStatus.READY
            media.save(update_fields=["processing_status"])

        return Response(
            PropertyMediaSerializer(media, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    # ── Keep upload_image as an alias for backward compatibility ──────────────
    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, slug=None):
        """Legacy alias — routes to upload_media with media_type defaulting to gallery."""
        if "file" not in request.FILES and "image" in request.FILES:
            request.data._mutable = getattr(request.data, "_mutable", True)
            request.FILES["file"] = request.FILES["image"]
        if not request.data.get("media_type"):
            request.data["media_type"] = "gallery"
        return self.upload_media(request, slug=slug)

    # ── Toggle save ────────────────────────────────────────────────────────────
    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def toggle_save(self, request, slug=None):
        prop = self.get_object()
        saved, created = SavedListing.objects.get_or_create(user=request.user, listing=prop)
        if not created:
            saved.delete()
            return Response({"saved": False})
        return Response({"saved": True}, status=status.HTTP_201_CREATED)


# ─── Other views ──────────────────────────────────────────────────────────────
class MyListingsView(generics.ListAPIView):
    serializer_class = PropertyListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Property.objects.filter(agent=self.request.user).prefetch_related("media")


class SavedListingsView(generics.ListAPIView):
    serializer_class = PropertyListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        ids = SavedListing.objects.filter(user=self.request.user).values_list("listing_id", flat=True)
        return Property.objects.filter(id__in=ids).prefetch_related("media")


class CompareView(generics.ListAPIView):
    """GET /api/properties/compare/?slugs=a,b,c — up to 5 full detail objects."""
    serializer_class = PropertyDetailSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get_queryset(self):
        slugs_param = self.request.query_params.get("slugs", "")
        slugs = [s.strip() for s in slugs_param.split(",") if s.strip()][:5]
        props = list(Property.objects.filter(slug__in=slugs).prefetch_related("media"))
        order_map = {s: i for i, s in enumerate(slugs)}
        props.sort(key=lambda p: order_map.get(p.slug, 999))
        return props

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response(self.get_serializer(qs, many=True).data)
