from django.urls import path

from .views import (
    IdentityDocumentUploadView,
    LoginRequestOTPView,
    LoginVerifyView,
    ProfileView,
    ProviderProfileView,
    SignupRequestOTPView,
    SignupVerifyView,
    TokenRefreshView,
)

# All routes are prefixed with /api/v1/ from core/urls.py
urlpatterns = [
    # Signup
    path('auth/signup/otp/',    SignupRequestOTPView.as_view(), name='signup-otp-request'),
    path('auth/signup/verify/', SignupVerifyView.as_view(),     name='signup-otp-verify'),

    # Login
    path('auth/login/otp/',    LoginRequestOTPView.as_view(), name='login-otp-request'),
    path('auth/login/verify/', LoginVerifyView.as_view(),     name='login-otp-verify'),

    # Token management
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Authenticated user
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),

    # Provider-only: GET/POST/PATCH profile
    path('provider/profile/', ProviderProfileView.as_view(), name='provider-profile'),
    # Provider-only: GET list / POST upload identity doc (triggers verification task)
    path('identity-docs/',    IdentityDocumentUploadView.as_view(), name='identity-docs'),
]