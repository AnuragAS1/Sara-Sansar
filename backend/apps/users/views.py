"""Auth + profile views."""
from allauth.socialaccount.providers.facebook.views import FacebookOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from dj_rest_auth.views import LoginView as DJLoginView
from dj_rest_auth.registration.views import RegisterView as DJRegisterView
from django.middleware.csrf import get_token
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import AgentProfile, User
from .otp_reset import generate_and_send_otp, verify_otp, consume_otp
from .serializers import (
    AgentProfileSerializer,
    AgentPublicSerializer,
    AgentRegistrationSerializer,
    UserSerializer,
)


# ── Stale-cookie-proof login/register wrappers ─────────────────────────────
class LoginView(DJLoginView):
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

class RegisterView(DJRegisterView):
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def csrf_view(request):
    return Response({"detail": "CSRF cookie set."}, headers={"X-CSRFToken": get_token(request)})


class FacebookLogin(SocialLoginView):
    adapter_class = FacebookOAuth2Adapter
    client_class = OAuth2Client


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return self.request.user


class AgentRegistrationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = AgentRegistrationSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        if "photo" in request.FILES:
            profile.photo = request.FILES["photo"]
            profile.save(update_fields=["photo"])
        request.user.refresh_from_db()
        return Response(AgentProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


class AgentProfileMeView(generics.RetrieveUpdateAPIView):
    serializer_class = AgentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return AgentProfile.objects.get(user=self.request.user)


class AgentListView(generics.ListAPIView):
    serializer_class = AgentPublicSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    pagination_class = None
    queryset = AgentProfile.objects.select_related("user").filter(
        user__is_agent=True, user__is_active=True
    )


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email, is_active=True).exists():
            otp = generate_and_send_otp(email)
            import logging
            logging.getLogger("django").info(f"[DEV] OTP for {email}: {otp}")
        return Response({"detail": "If this email is registered, a reset code has been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        otp = request.data.get("otp", "").strip()
        new_password = request.data.get("new_password", "")
        if not email or not otp or not new_password:
            return Response({"detail": "Email, OTP and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({"detail": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)
        if not verify_otp(email, otp):
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email__iexact=email, is_active=True)
        except User.DoesNotExist:
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        consume_otp(email)
        return Response({"detail": "Password reset successful. You can now sign in."})
