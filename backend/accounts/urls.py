from django.urls import path

from .views import (
    ClientOnboardingStep1View,
    ClientOnboardingStep2View,
    ClientOnboardingStep3OTPRequestView,
    ClientOnboardingStep3OTPVerifyView,
    ClientOnboardingStep4ProfileView,
    ClientProfileView,
    FaceVerificationView,
    IdentityDocumentUploadView,
    LoginRequestOTPView,
    LoginVerifyView,
    OCRTestView,
    LogoutView,
    ProviderManualVerificationUploadView,
    ProviderOnboardingStatusView,
    ProviderOnboardingStep1View,
    ProviderOnboardingStep2View,
    ProviderOnboardingStep3OTPRequestView,
    ProviderOnboardingStep3OTPVerifyView,
    ProviderOnboardingStep4View,
    ProviderOnboardingStep5View,
    ProviderProfileSetupView,
    SignupRequestOTPView,
    SignupVerifyView,
    TokenRefreshView,
    UserProfileView,
)

# All routes are prefixed with /api/v1/ from core/urls.py
urlpatterns = [
    # Client authentication
    path('auth/signup/otp/', SignupRequestOTPView.as_view(), name='signup-otp-request'),
    path('auth/signup/resend-otp/', SignupRequestOTPView.as_view(), name='signup-otp-resend'),
    path('auth/signup/verify/', SignupVerifyView.as_view(), name='signup-otp-verify'),
    path('auth/login/otp/', LoginRequestOTPView.as_view(), name='login-otp-request'),
    path('auth/login/verify/', LoginVerifyView.as_view(), name='login-otp-verify'),

    # Token management and profile
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/profile/', UserProfileView.as_view(), name='auth-profile'),

    # Provider/client profile and verification
    path('provider/profile/', ProviderProfileSetupView.as_view(), name='provider-profile-setup'),
    path('client/profile/', ClientProfileView.as_view(), name='client-profile'),
    path('provider/manual-verification/upload/', ProviderManualVerificationUploadView.as_view(), name='provider-manual-verification-upload'),
    path('provider/onboarding/status/', ProviderOnboardingStatusView.as_view(), name='provider-onboarding-status'),
    path('identity-docs/', IdentityDocumentUploadView.as_view(), name='identity-docs'),
    path('identity-docs/<int:id>/verify-face/', FaceVerificationView.as_view(), name='face-verification'),

    # Provider onboarding flow
    path('provider/onboarding/step1/', ProviderOnboardingStep1View.as_view(), name='onboarding-step1'),
    path('provider/onboarding/step2/', ProviderOnboardingStep2View.as_view(), name='onboarding-step2'),
    path('provider/onboarding/step3/otp-request/', ProviderOnboardingStep3OTPRequestView.as_view(), name='onboarding-step3-otp-request'),
    path('provider/onboarding/step3/otp-verify/', ProviderOnboardingStep3OTPVerifyView.as_view(), name='onboarding-step3-otp-verify'),
    path('provider/onboarding/step4/', ProviderOnboardingStep4View.as_view(), name='onboarding-step4'),
    path('provider/onboarding/step5/', ProviderOnboardingStep5View.as_view(), name='onboarding-step5'),

    # Client onboarding flow
    path('client/onboarding/step1/', ClientOnboardingStep1View.as_view(), name='client-onboarding-step1'),
    path('client/onboarding/step2/', ClientOnboardingStep2View.as_view(), name='client-onboarding-step2'),
    path('client/onboarding/step3/otp-request/', ClientOnboardingStep3OTPRequestView.as_view(), name='client-onboarding-step3-otp-request'),
    path('client/onboarding/step3/otp-verify/', ClientOnboardingStep3OTPVerifyView.as_view(), name='client-onboarding-step3-otp-verify'),
    path('client/onboarding/step4/', ClientOnboardingStep4ProfileView.as_view(), name='client-onboarding-step4'),

    # Testing/development
    path('test/ocr-extract/', OCRTestView.as_view(), name='ocr-test'),
]
