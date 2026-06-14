"""URL configuration for Sara Sansar."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from apps.users.views import FacebookLogin, LoginView, RegisterView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", LoginView.as_view(), name="rest_login"),
    path("api/auth/registration/", RegisterView.as_view(), name="rest_register"),
    path("api/auth/facebook/", FacebookLogin.as_view(), name="fb_login"),
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/properties/", include("apps.properties.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
