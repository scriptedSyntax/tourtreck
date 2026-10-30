from django.urls import path

from .api_views import CurrentUserView, InitialPasswordSetupView, LoginView, LogoutView, PasswordCheckView, PasswordResetConfirmView, PasswordResetRequestView, RefreshView, RegisterView


urlpatterns = [
    path("register/", RegisterView.as_view(), name="api-register"),
    path("password-check/", PasswordCheckView.as_view(), name="api-password-check"),
    path("set-password/", InitialPasswordSetupView.as_view(), name="api-set-password"),
    path("forgot-password/", PasswordResetRequestView.as_view(), name="api-forgot-password"),
    path("reset-password/", PasswordResetConfirmView.as_view(), name="api-reset-password"),
    path("login/", LoginView.as_view(), name="api-login"),
    path("refresh/", RefreshView.as_view(), name="api-refresh"),
    path("logout/", LogoutView.as_view(), name="api-logout"),
    path("me/", CurrentUserView.as_view(), name="api-current-user"),
]
