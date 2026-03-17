from django.urls import path

from .views import (
    FaceVerificationView,
    IdentityDocumentUploadView,
    LoginRequestOTPView,
    LoginVerifyView,
    ProfileView,
    ProviderProfileView,
    SignupRequestOTPView,
    SignupVerifyView,
    TokenRefreshView,
    ProviderOnboardingStep1View,
    ProviderOnboardingStep2View,
    ProviderOnboardingStep3OTPRequestView,
    ProviderOnboardingStep3OTPVerifyView,
    ProviderOnboardingStep4View,
    ProviderOnboardingStep5View,
    ServiceCategoryListView,
    SubServiceListView,
    ClientOnboardingStep1View,
    ClientOnboardingStep2View,
    ClientOnboardingStep3OTPRequestView,
    ClientOnboardingStep3OTPVerifyView,
    ClientOnboardingStep4ProfileView,
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
    # Provider-only: POST face verification for an identity doc
    path('identity-docs/<int:id>/verify-face/', FaceVerificationView.as_view(), name='face-verification'),

    # ── Provider Onboarding (5-step flow) ──────────────────────────────────────
    path('provider/onboarding/step1/', ProviderOnboardingStep1View.as_view(), name='onboarding-step1'),
    path('provider/onboarding/step2/', ProviderOnboardingStep2View.as_view(), name='onboarding-step2'),
    path('provider/onboarding/step3/otp-request/', ProviderOnboardingStep3OTPRequestView.as_view(), name='onboarding-step3-otp-request'),
    path('provider/onboarding/step3/otp-verify/', ProviderOnboardingStep3OTPVerifyView.as_view(), name='onboarding-step3-otp-verify'),
    path('provider/onboarding/step4/', ProviderOnboardingStep4View.as_view(), name='onboarding-step4'),
    path('provider/onboarding/step5/', ProviderOnboardingStep5View.as_view(), name='onboarding-step5'),

    # ── Client Onboarding (Phone OTP + Optional Document Upload) ───────────────
    path('client/onboarding/step1/', ClientOnboardingStep1View.as_view(), name='client-onboarding-step1'),
    path('client/onboarding/step2/', ClientOnboardingStep2View.as_view(), name='client-onboarding-step2'),
    path('client/onboarding/step3/otp-request/', ClientOnboardingStep3OTPRequestView.as_view(), name='client-onboarding-step3-otp-request'),
    path('client/onboarding/step3/otp-verify/', ClientOnboardingStep3OTPVerifyView.as_view(), name='client-onboarding-step3-otp-verify'),
    path('client/onboarding/step4/', ClientOnboardingStep4ProfileView.as_view(), name='client-onboarding-step4'),

    # ── Services (Category & SubService) ───────────────────────────────────────
    path('services/categories/', ServiceCategoryListView.as_view(), name='service-categories'),
    path('services/categories/<int:category_id>/subservices/', SubServiceListView.as_view(), name='category-subservices'),
]