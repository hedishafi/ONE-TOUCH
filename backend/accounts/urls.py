from django.urls import path

from .views import (
    LoginRequestOTPView,
    LoginVerifyView,
    LogoutView,
    ServiceCategoryListView,
    SubServiceListView,
    UserProfileView,
    RoleSwitchView,
    SignupRequestOTPView,
    SignupVerifyView,
    TokenRefreshView,
    ProviderProfileSetupView,
    ProviderManualVerificationUploadView,
    ProviderOnboardingStatusView,
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
    path('auth/profile/',       UserProfileView.as_view(),   name='auth-profile'),
    path('auth/role/switch/',   RoleSwitchView.as_view(),    name='role-switch'),

    # ── Provider Identity Verification (manual admin review) ──────────────────
    path('provider/profile/', ProviderProfileSetupView.as_view(), name='provider-profile-setup'),
    path('provider/manual-verification/upload/', ProviderManualVerificationUploadView.as_view(), name='provider-manual-verification-upload'),
    path('provider/onboarding/status/', ProviderOnboardingStatusView.as_view(), name='provider-onboarding-status'),
    path('provider/service-categories/', ServiceCategoryListView.as_view(), name='provider-service-categories'),
    path('provider/service-categories/<int:category_id>/sub-services/', SubServiceListView.as_view(), name='provider-sub-services'),
]