from django.urls import path

from .views import (
    LoginRequestOTPView,
    LoginVerifyView,
    ProfileView,
    SignupRequestOTPView,
    SignupVerifyView,
    TokenRefreshView,
)

# All routes are prefixed with /api/v1/ from core/urls.py
urlpatterns = [
    # ── Signup (new users: client or provider) ────────────────────────────────
    # Step 1: send phone number + role → receive OTP via SMS
    path('auth/signup/otp/',    SignupRequestOTPView.as_view(), name='signup-otp-request'),
    # Step 2: send phone number + OTP → account created + JWT tokens returned
    path('auth/signup/verify/', SignupVerifyView.as_view(),     name='signup-otp-verify'),

    # ── Login (existing users: client or provider) ────────────────────────────
    # Step 1: send phone number → receive OTP via SMS
    path('auth/login/otp/',    LoginRequestOTPView.as_view(), name='login-otp-request'),
    # Step 2: send phone number + OTP → JWT tokens returned
    path('auth/login/verify/', LoginVerifyView.as_view(),     name='login-otp-verify'),

    # ── Token management ──────────────────────────────────────────────────────
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # ── Authenticated user ────────────────────────────────────────────────────
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),
]