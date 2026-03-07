from django.contrib.auth import get_user_model
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import IdentityDocument, PhoneOTP, ProviderProfile


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


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER PROFILE
# ─────────────────────────────────────────────────────────────────────────────

class ProviderProfileSerializer(serializers.ModelSerializer):
    """
    Create or update a provider's public profile.
    `commission_amount` is computed from price_min/price_max — always read-only.
    """

    commission_amount = serializers.SerializerMethodField(
        help_text='Platform commission in ETB — 2% of (price_min + price_max) / 2. Read-only.'
    )

    class Meta:
        model  = ProviderProfile
        fields = [
            'id',
            'bio',
            'address',
            'latitude',
            'longitude',
            'is_available',
            'years_of_experience',
            'price_min',
            'price_max',
            'commission_amount',
            'avg_rating',
            'total_reviews',
            'total_jobs',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'avg_rating', 'total_reviews', 'total_jobs', 'commission_amount', 'created_at', 'updated_at']

    def get_commission_amount(self, obj):
        return str(obj.commission_amount) if obj.commission_amount is not None else None

    def validate(self, data):
        price_min = data.get('price_min', getattr(self.instance, 'price_min', None))
        price_max = data.get('price_max', getattr(self.instance, 'price_max', None))
        if price_min is not None and price_max is not None and price_min > price_max:
            raise serializers.ValidationError({'price_max': 'price_max must be ≥ price_min.'})
        return data


# ─────────────────────────────────────────────────────────────────────────────
# IDENTITY DOCUMENT
# ─────────────────────────────────────────────────────────────────────────────

class IdentityDocumentSerializer(serializers.ModelSerializer):
    """
    Upload an identity document (and optional biometric selfie).
    Triggers the automated OCR + liveness verification Celery task on save.
    Accepts multipart/form-data.
    """

    # extend_schema_field(OpenApiTypes.BINARY) tells drf-spectacular to render
    # these as file-picker inputs instead of plain URI text boxes in Swagger UI.
    @extend_schema_field(OpenApiTypes.BINARY)
    def get_document_url(self, obj):  # pragma: no cover
        return None

    @extend_schema_field(OpenApiTypes.BINARY)
    def get_biometric_selfie(self, obj):  # pragma: no cover
        return None

    document_url     = serializers.FileField(help_text='Government-issued ID document (JPEG, PNG or PDF, max 10 MB).')
    biometric_selfie = serializers.FileField(
        required=False,
        allow_null=True,
        help_text='Liveness selfie photo submitted by the provider during onboarding (JPEG/PNG, max 5 MB).',
    )

    class Meta:
        model  = IdentityDocument
        fields = [
            'id',
            'doc_type',
            'document_url',
            'biometric_selfie',
            'status',
            'auto_verified',
            'ocr_confidence',
            'ocr_extracted',
            'rejection_note',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'status',
            'auto_verified',
            'ocr_confidence',
            'ocr_extracted',
            'rejection_note',
            'created_at',
        ]

    # ── file validation ───────────────────────────────────────────────────────
    ALLOWED_IMAGE_TYPES  = {'image/jpeg', 'image/png', 'image/webp'}
    ALLOWED_DOC_TYPES    = {'image/jpeg', 'image/png', 'image/webp', 'application/pdf'}
    MAX_DOC_SIZE_MB      = 10
    MAX_SELFIE_SIZE_MB   = 5

    def _validate_file(self, file, allowed_types, max_mb, field_name):
        if file.content_type not in allowed_types:
            raise serializers.ValidationError({
                field_name: f'Unsupported file type "{file.content_type}". Allowed: {", ".join(sorted(allowed_types))}'
            })
        if file.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError({
                field_name: f'File too large. Maximum size is {max_mb} MB.'
            })
        return file

    def validate_document_url(self, value):
        return self._validate_file(value, self.ALLOWED_DOC_TYPES, self.MAX_DOC_SIZE_MB, 'document_url')

    def validate_biometric_selfie(self, value):
        if value:
            return self._validate_file(value, self.ALLOWED_IMAGE_TYPES, self.MAX_SELFIE_SIZE_MB, 'biometric_selfie')
        return value
