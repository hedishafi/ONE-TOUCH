from django.urls import path

from .views import ProfileView, RefreshView, RequestOTPView, VerifyOTPView


urlpatterns = [
    path('auth/otp/request/', RequestOTPView.as_view(), name='auth-otp-request'),
    path('auth/otp/verify/', VerifyOTPView.as_view(), name='auth-otp-verify'),
    path('auth/refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('auth/profile/', ProfileView.as_view(), name='auth-profile'),
]