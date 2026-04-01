from django.urls import path

from .views import (
    LoginRequestOTPView,
    LoginVerifyView,
    LogoutView,
    SignupRequestOTPView,
    SignupVerifyView,
    TokenRefreshView,
    ProviderManualVerificationUploadView,
)

# All routes are prefixed with /api/v1/ from core/urls.py
urlpatterns = [
    # ── Client Authentication (kept intact) ───────────────────────────────────
    # Signup + resend OTP
    path('auth/signup/otp/',    SignupRequestOTPView.as_view(), name='signup-otp-request'),
    path('auth/signup/resend-otp/', SignupRequestOTPView.as_view(), name='signup-otp-resend'),
    path('auth/signup/verify/', SignupVerifyView.as_view(),     name='signup-otp-verify'),

    # Login
    path('auth/login/otp/',    LoginRequestOTPView.as_view(), name='login-otp-request'),
    path('auth/login/verify/', LoginVerifyView.as_view(),     name='login-otp-verify'),

    # Token management + logout
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/logout/',        LogoutView.as_view(),        name='logout'),

    # ── Provider Identity Verification (manual admin review) ──────────────────
    path('provider/manual-verification/upload/', ProviderManualVerificationUploadView.as_view(), name='provider-manual-verification-upload'),
]