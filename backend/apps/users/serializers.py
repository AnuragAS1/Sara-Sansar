"""DRF serializers for users + agent profiles."""
import re
from django.utils.html import strip_tags
from django.contrib.auth import authenticate
from dj_rest_auth.registration.serializers import RegisterSerializer as BaseRegisterSerializer
from rest_framework import serializers
from .models import AgentProfile, AgentMembership, User


class EmailLoginSerializer(serializers.Serializer):
    """
    Email + password login. Custom to avoid dj-rest-auth's default that
    references the non-existent username field on our custom User.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        email = attrs.get("email", "").strip().lower()
        password = attrs.get("password", "")
        if not email or not password:
            raise serializers.ValidationError({"detail": "Email and password are required."})
        user = authenticate(request=self.context.get("request"), username=email, password=password)
        if not user:
            raise serializers.ValidationError({"detail": "Invalid email or password."})
        if not user.is_active:
            raise serializers.ValidationError({"detail": "This account is inactive."})
        attrs["user"] = user
        return attrs


class RegisterSerializer(BaseRegisterSerializer):
    username = None
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=120)

    def validate_email(self, email):
        email = super().validate_email(email)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_full_name(self, value):
        value = strip_tags(value).strip()
        if len(value) > 120:
            raise serializers.ValidationError("Name too long.")
        if re.search(r"""[<>"';]""", value):
            raise serializers.ValidationError("Invalid characters in name.")
        return value

    def custom_signup(self, request, user):
        user.full_name = self.validated_data.get("full_name", "")
        user.save(update_fields=["full_name"])


class AgentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentProfile
        fields = [
            "agency_name", "license_number", "bio", "photo",
            "contact_phone", "whatsapp_number", "viber_number",
            "pricing_tier", "rating_avg", "rating_count",
        ]
        read_only_fields = ["rating_avg", "rating_count"]


class UserSerializer(serializers.ModelSerializer):
    agent_profile = AgentProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "phone", "is_agent", "agent_profile", "created_at"]
        read_only_fields = ["id", "email", "is_agent", "created_at"]


class AgentRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentProfile
        fields = [
            "agency_name", "license_number", "bio",
            "contact_phone", "whatsapp_number", "viber_number",
            "pricing_tier",
        ]

    def create(self, validated_data):
        user = self.context["request"].user
        profile, _ = AgentProfile.objects.update_or_create(user=user, defaults=validated_data)
        if not user.is_agent:
            user.is_agent = True
            user.save(update_fields=["is_agent"])
        # Auto-create 30-day trial membership
        from django.utils import timezone
        from datetime import timedelta
        AgentMembership.objects.get_or_create(
            agent=profile,
            defaults={
                "plan": AgentMembership.PLAN_TRIAL,
                "trial_end": timezone.now() + timedelta(days=30),
                "max_listings": 3,
            }
        )
        return profile


class AgentPublicSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name")
    email = serializers.CharField(source="user.email")
    listing_count = serializers.SerializerMethodField()

    class Meta:
        model = AgentProfile
        fields = [
            "id", "full_name", "email", "agency_name", "bio", "photo",
            "contact_phone", "whatsapp_number", "pricing_tier",
            "rating_avg", "rating_count", "listing_count",
        ]

    def get_listing_count(self, obj):
        return obj.user.listed_properties.filter(status="active").count()
