from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import CompareView, MyListingsView, PropertyViewSet, SavedListingsView

router = DefaultRouter()
router.register(r"", PropertyViewSet, basename="property")

urlpatterns = [
    path("my/", MyListingsView.as_view(), name="my-listings"),
    path("saved/", SavedListingsView.as_view(), name="saved-listings"),
    path("compare/", CompareView.as_view(), name="compare"),
    path("", include(router.urls)),
]
