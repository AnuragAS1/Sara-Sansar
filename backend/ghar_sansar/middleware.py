"""Strips stale JWT cookies so DRF sees anonymous requests instead of 401."""
from django.utils.deprecation import MiddlewareMixin

class ClearStaleJWTCookieMiddleware(MiddlewareMixin):
    def process_request(self, request):
        access = request.COOKIES.get("gs_access")
        if not access:
            return None
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            token = AccessToken(access)
            from django.contrib.auth import get_user_model
            User = get_user_model()
            if not User.objects.filter(pk=token.get("user_id"), is_active=True).exists():
                raise Exception("User gone")
        except Exception:
            request.COOKIES = {k: v for k, v in request.COOKIES.items()
                               if k not in ("gs_access", "gs_refresh")}
        return None
