from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import PhoneOTP


User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# SHARED — used in both signup and login responses
# ─────────────────────────────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    """Read/update the current authenticated user's profile."""

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'phone_number',
            'first_name',
            'last_name',
            'role',
            'verification_status',
            'is_on_trial',
            'trial_ends_at',
            'date_joined',
        ]
        read_only_fields = [
            'id',
            'role',
            'verification_status',
            'is_on_trial',
            'trial_ends_at',
            'date_joined',
        ]


class OTPSentSerializer(serializers.Serializer):
    """Response returned after a successful OTP request."""

    detail = serializers.CharField()
    # Only present in DEBUG mode — never exposed in production
    otp_code = serializers.CharField(required=False)


class AuthTokenSerializer(serializers.Serializer):
    """JWT token pair + user profile returned after successful OTP verification."""

    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserProfileSerializer()


# ─────────────────────────────────────────────────────────────────────────────
# SIGNUP — Step 1: request OTP
# ─────────────────────────────────────────────────────────────────────────────

class SignupOTPRequestSerializer(serializers.Serializer):
    """
    Request an OTP to begin phone-based signup.

    Both clients and service providers use the same endpoint;
    the 'role' field distinguishes which account type to create.
    """

    SIGNUP_ROLE_CHOICES = [
        (User.ROLE_CLIENT,   'Client'),
        (User.ROLE_PROVIDER, 'Service Provider'),
    ]

    phone_number = serializers.CharField(
        max_length=30,
        help_text='Phone number in international format, e.g. +251911234567',
    )
    role = serializers.ChoiceField(
        choices=SIGNUP_ROLE_CHOICES,
        default=User.ROLE_CLIENT,
        help_text='Account type: "client" or "provider"',
    )
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name  = serializers.CharField(max_length=150, required=False, allow_blank=True)
    username   = serializers.CharField(
        max_length=150, required=False, allow_blank=True,
        help_text='Optional. Defaults to phone number if omitted.',
    )

    def validate_phone_number(self, value: str) -> str:
        return value.strip()

    def validate_phone_number(self, value: str) -> str:
        value = value.strip()
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('This phone number is already registered.')
        return value


# ─────────────────────────────────────────────────────────────────────────────
# SIGNUP — Step 2: verify OTP → create account + return tokens
# ─────────────────────────────────────────────────────────────────────────────

class SignupVerifySerializer(serializers.Serializer):
    """
    Verify the OTP received during signup, create the user account,
    and return JWT access + refresh tokens.
    """

    phone_number = serializers.CharField(max_length=30)
    otp_code     = serializers.CharField(
        max_length=6, min_length=6,
        help_text='6-digit OTP sent to the phone number.',
    )
    # Optional: client UI may resend these, otherwise values stored on the OTP record are used
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_phone_number(self, value: str) -> str:
        return value.strip()


# ─────────────────────────────────────────────────────────────────────────────
# LOGIN — Step 1: request OTP
# ─────────────────────────────────────────────────────────────────────────────

class LoginOTPRequestSerializer(serializers.Serializer):
    """
    Request a login OTP for an existing account.
    Works for both clients and service providers — no role field needed.
    """

    phone_number = serializers.CharField(
        max_length=30,
        help_text='The registered phone number.',
    )

    def validate_phone_number(self, value: str) -> str:
        value = value.strip()
        if not User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('No account found for this phone number.')
        return value


# ─────────────────────────────────────────────────────────────────────────────
# LOGIN — Step 2: verify OTP → return tokens
# ─────────────────────────────────────────────────────────────────────────────

class LoginVerifySerializer(serializers.Serializer):
    """
    Verify the OTP received during login and return JWT access + refresh tokens.
    """

    phone_number = serializers.CharField(max_length=30)
    otp_code     = serializers.CharField(
        max_length=6, min_length=6,
        help_text='6-digit OTP sent to the phone number.',
    )

    def validate_phone_number(self, value: str) -> str:
        return value.strip()

