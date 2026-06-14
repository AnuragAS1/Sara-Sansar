from django.urls import path
from .views import (AgentListView, AgentProfileMeView, AgentRegistrationView, MeView, csrf_view,
    PasswordResetRequestView, PasswordResetConfirmView)

urlpatterns = [
    path("me/", MeView.as_view(), name="user-me"),
    path("agent/register/", AgentRegistrationView.as_view(), name="agent-register"),
    path("agent/me/", AgentProfileMeView.as_view(), name="agent-me"),
    path("agents/", AgentListView.as_view(), name="agent-list"),
    path("csrf/", csrf_view, name="csrf"),
    path("password/reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]
