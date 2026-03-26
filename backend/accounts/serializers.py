from django.contrib.auth import get_user_model
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import (
    IdentityDocument, PhoneOTP, ProviderProfile, ClientProfile, FaceBiometricVerification,
    ProviderOnboardingSession, ServiceCategory, SubService, ProviderService, ClientOnboardingSession
)


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


class ClientMinimalUserSerializer(serializers.ModelSerializer):
    """Minimal user response for clients (auth only)."""

    class Meta:
        model = User
        fields = [
            'id',
            'phone_number',
            'role',
        ]
        read_only_fields = ['id', 'role']


class ProviderFullUserSerializer(serializers.ModelSerializer):
    """Full user response for service providers (includes trial info)."""

    class Meta:
        model = User
        fields = [
            'id',
            'phone_number',
            'role',
            'verification_status',
            'is_on_trial',
            'trial_ends_at',
        ]
        read_only_fields = [
            'id',
            'role',
            'verification_status',
            'is_on_trial',
            'trial_ends_at',
        ]


class ClientProfileSerializer(serializers.ModelSerializer):
    """Read/update client profile data - only essential fields."""
    user_id = serializers.CharField(source='user.id', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            'user_id',
            'phone_number',
            'full_name',
            'wallet_balance',
        ]
        read_only_fields = [
            'user_id',
            'phone_number',
            'wallet_balance',
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

    MINIMAL request body (client signup):
    {
        "phone_number": "+251911234567",
        "role": "client"
    }

    Both clients and service providers use the same endpoint;
    the 'role' field distinguishes which account type to create.
    All fields except phone_number are OPTIONAL.
    """

    SIGNUP_ROLE_CHOICES = [
        (User.ROLE_CLIENT,   'Client'),
        (User.ROLE_PROVIDER, 'Service Provider'),
    ]

    phone_number = serializers.CharField(
        max_length=30,
        help_text='Phone number in international format, e.g. +251911234567 (required)',
    )
    role = serializers.ChoiceField(
        choices=SIGNUP_ROLE_CHOICES,
        default=User.ROLE_CLIENT,
        required=False,
        help_text='Account type: "client" (default) or "provider" (optional)',
    )
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name  = serializers.CharField(max_length=150, required=False, allow_blank=True)
    username   = serializers.CharField(
        max_length=150, required=False, allow_blank=True,
        help_text='Optional. Defaults to phone number if omitted.',
    )

    def validate_phone_number(self, value: str) -> str:
        """Normalize and validate phone number — MUST be +251 format (Ethiopia)."""
        import re
        value = value.strip()
        
        # Normalize phone to +251 format if it's not already
        if value.startswith('0'):
            # 0911222333 → +251911222333
            value = '+251' + value[1:]
        elif value.startswith('251'):
            # 251911222333 → +251911222333
            value = '+' + value
        
        # Validate format
        if not re.match(r'^\+251\d{9}$', value):
            raise serializers.ValidationError(
                'Phone must be in Ethiopian format: +251XXXXXXXXX (9 digits after +251)'
            )
        
        # Check if already registered
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('This phone number is already registered.')
        
        return value


# ─────────────────────────────────────────────────────────────────────────────
# SIGNUP — Step 2: verify OTP → create account + return tokens
# ─────────────────────────────────────────────────────────────────────────────

class SignupVerifySerializer(serializers.Serializer):
    """
    Verify the OTP received during signup and create the user account.

    MINIMAL request body (client signup verify):
    {
        "phone_number": "+251911234567",
        "otp_code": "123456",
        "role": "client"
    }

    Returns JWT access + refresh tokens on success (201).
    NOTE: role, first_name, last_name, username are all OPTIONAL.
    """

    phone_number = serializers.CharField(
        max_length=30,
        help_text='Same phone number used in signup/otp request (required)',
    )
    otp_code = serializers.CharField(
        max_length=6, min_length=6,
        help_text='6-digit OTP sent to the phone number (required)',
    )
    # Optional: client UI may resend these, otherwise values stored on the OTP record are used
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False, help_text='Optional')
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, help_text='Optional')
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, help_text='Optional')
    username = serializers.CharField(max_length=150, required=False, allow_blank=True, help_text='Optional')

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
        from .views import _normalize_phone_number
        value = _normalize_phone_number(value)
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
        from .views import _normalize_phone_number
        return _normalize_phone_number(value)


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER PROFILE
# ─────────────────────────────────────────────────────────────────────────────

class ProviderProfileSerializer(serializers.ModelSerializer):
    """
    Create or update a provider's public profile.
    
    **Online/Offline Mode:**
    - When `is_online=True`, the provider's location (current_latitude, current_longitude) is active.
    - When `is_online=False`, location tracking is disabled.
    - Mobile app sends location updates when going online or periodically while online.
    
    **Commission:** Auto-calculated from price_min/price_max — always read-only.
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
            'is_online',
            'current_latitude',
            'current_longitude',
            'last_location_update',
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
        read_only_fields = ['id', 'avg_rating', 'total_reviews', 'total_jobs', 'commission_amount', 'last_location_update', 'created_at', 'updated_at']

    def get_commission_amount(self, obj):
        return str(obj.commission_amount) if obj.commission_amount is not None else None

    def validate(self, data):
        price_min = data.get('price_min', getattr(self.instance, 'price_min', None))
        price_max = data.get('price_max', getattr(self.instance, 'price_max', None))
        if price_min is not None and price_max is not None and price_min > price_max:
            raise serializers.ValidationError({'price_max': 'price_max must be ≥ price_min.'})
        
        # Validate location updates: can only send lat/long if is_online=True
        is_online = data.get('is_online', getattr(self.instance, 'is_online', False))
        has_lat = data.get('current_latitude') is not None or (self.instance and self.instance.current_latitude is not None)
        has_lon = data.get('current_longitude') is not None or (self.instance and self.instance.current_longitude is not None)
        
        if (has_lat or has_lon) and not is_online:
            raise serializers.ValidationError(
                {'current_latitude': 'Cannot update location unless is_online=True.'}
            )
        
        return data

    def update(self, instance, validated_data):
        """
        Auto-update `last_location_update` timestamp when location fields are modified.
        """
        from django.utils import timezone
        
        # Check if location is being updated
        if 'current_latitude' in validated_data or 'current_longitude' in validated_data:
            validated_data['last_location_update'] = timezone.now()
        
        return super().update(instance, validated_data)


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

    def validate_doc_type(self, value):
        """Validate that only supported document types are accepted."""
        if value not in IdentityDocument.SUPPORTED_TYPES:
            raise serializers.ValidationError(
                f'Unsupported document type: {value}. '
                f'Allowed types: {", ".join(IdentityDocument.SUPPORTED_TYPES)}. '
                f'Note: Passport documents are no longer supported.'
            )
        return value

    def validate_document_url(self, value):
        return self._validate_file(value, self.ALLOWED_DOC_TYPES, self.MAX_DOC_SIZE_MB, 'document_url')

    def validate_biometric_selfie(self, value):
        if value:
            return self._validate_file(value, self.ALLOWED_IMAGE_TYPES, self.MAX_SELFIE_SIZE_MB, 'biometric_selfie')
        return value

# ─────────────────────────────────────────────────────────────────────────────
# FACE BIOMETRIC VERIFICATION (provider-only)
# ─────────────────────────────────────────────────────────────────────────────

class FaceBiometricVerificationSerializer(serializers.ModelSerializer):
    """
    Submit a face verification (liveness selfie) for an identity document.
    Results include liveness_score + face_match_score from the verification engine.
    """

    @extend_schema_field(OpenApiTypes.BINARY)
    def get_selfie_image(self, obj):  # pragma: no cover
        return None

    selfie_image = serializers.FileField(
        help_text='Liveness selfie photo for face verification (JPEG/PNG, max 5 MB).'
    )

    class Meta:
        model = FaceBiometricVerification
        fields = [
            'id',
            'identity_document',
            'selfie_image',
            'liveness_score',
            'face_match_score',
            'status',
            'auto_verified',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'identity_document',
            'liveness_score',
            'face_match_score',
            'status',
            'auto_verified',
            'created_at',
        ]

    ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
    MAX_SELFIE_SIZE_MB = 5

    def validate_selfie_image(self, value):
        if value.content_type not in self.ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                f'Unsupported file type "{value.content_type}". Allowed: {", ".join(sorted(self.ALLOWED_IMAGE_TYPES))}'
            )
        if value.size > self.MAX_SELFIE_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(
                f'File too large. Maximum size is {self.MAX_SELFIE_SIZE_MB} MB.'
            )
        return value


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER ONBOARDING FLOW  (5-step signup)
# ─────────────────────────────────────────────────────────────────────────────

class ServiceCategorySerializer(serializers.ModelSerializer):
    """List available service categories for provider to choose from."""
    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'slug', 'description', 'icon_url']
        read_only_fields = ['id']


class SubServiceSerializer(serializers.ModelSerializer):
    """Get sub-services under a category."""
    class Meta:
        model = SubService
        fields = ['id', 'name', 'slug', 'description']
        read_only_fields = ['id']


class OnboardingStep1Serializer(serializers.Serializer):
    """Step 1: Upload front/back document images and OCR extract."""
    document_type = serializers.ChoiceField(
        choices=['national_id', 'drivers_license', 'kebele_id']
    )
    front_image = serializers.FileField(
        max_length=10485760,
        required=True,
        use_url=False,
    )
    back_image = serializers.FileField(
        max_length=10485760,
        required=True,
        use_url=False,
    )

    def validate_front_image(self, value):
        ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
        MAX_SIZE_MB = 10

        if value.content_type not in ALLOWED_TYPES:
            raise serializers.ValidationError('Front image type not supported. Use JPEG, PNG, or WEBP.')
        if value.size > MAX_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(f'Front image exceeds {MAX_SIZE_MB}MB limit.')
        return value

    def validate_back_image(self, value):
        ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
        MAX_SIZE_MB = 10

        if value.content_type not in ALLOWED_TYPES:
            raise serializers.ValidationError('Back image type not supported. Use JPEG, PNG, or WEBP.')
        if value.size > MAX_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(f'Back image exceeds {MAX_SIZE_MB}MB limit.')
        return value


class OnboardingStep2Serializer(serializers.Serializer):
    """Step 2: Review and confirm extracted OCR data."""
    session_id = serializers.CharField(max_length=64)
    confirmed_data = serializers.JSONField(
        help_text='User-confirmed OCR data: {name, phone, id_number, dob, nationality}'
    )


class OnboardingStep3OTPRequestSerializer(serializers.Serializer):
    """Step 3a: Request OTP to extracted/chosen phone."""
    session_id = serializers.CharField(max_length=64)
    phone_for_verification = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
        help_text='Leave empty to use extracted phone, or provide custom phone in +251 format'
    )
    
    def validate_phone_for_verification(self, value: str) -> str:
        """Validate and normalize phone if provided — MUST be +251 format."""
        if not value:  # Allow empty (will use extracted)
            return value
        
        import re
        value = value.strip()
        
        # Normalize phone to +251 format if it's not already
        if value.startswith('0'):
            value = '+251' + value[1:]
        elif value.startswith('251'):
            value = '+' + value
        
        # Validate format
        if not re.match(r'^\+251\d{9}$', value):
            raise serializers.ValidationError(
                'Phone must be in Ethiopian format: +251XXXXXXXXX (9 digits after +251)'
            )
        
        return value


class OnboardingStep3OTPVerifySerializer(serializers.Serializer):
    """Step 3b: Verify OTP code."""
    session_id = serializers.CharField(max_length=64)
    otp = serializers.CharField(max_length=6, min_length=6)


class OnboardingStep4Serializer(serializers.Serializer):
    """Step 4: Submit selfie for face verification."""
    session_id = serializers.CharField(max_length=64)
    selfie_image = serializers.FileField(max_length=5242880)  # 5MB
    
    def validate_selfie_image(self, value):
        ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
        MAX_SIZE_MB = 5
        
        if value.content_type not in ALLOWED_TYPES:
            raise serializers.ValidationError('File type not supported.')
        if value.size > MAX_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(f'File exceeds {MAX_SIZE_MB}MB limit.')
        return value


class OnboardingStep5Serializer(serializers.Serializer):
    """Step 5: Complete profile and services selection."""
    session_id = serializers.CharField(max_length=64)
    bio = serializers.CharField(max_length=1000, required=False)
    address = serializers.CharField(max_length=255)
    years_of_experience = serializers.IntegerField(min_value=0, max_value=70)
    price_min = serializers.DecimalField(max_digits=10, decimal_places=2)
    price_max = serializers.DecimalField(max_digits=10, decimal_places=2)
    service_category_id = serializers.IntegerField(help_text='ID of primary service category')
    service_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text='IDs of selected sub-services (multiple allowed)'
    )
    
    def validate(self, data):
        if data['price_min'] > data['price_max']:
            raise serializers.ValidationError('price_min must be ≤ price_max')
        return data


# ─────────────────────────────────────────────────────────────────────────────
# CLIENT ONBOARDING — Unified with Provider (Step 1: Document Upload)
# Reuses provider serializers: OnboardingStep1, Step2, Step3...
# Difference: No face verification (Step 4), no service selection (Step 5)
# ─────────────────────────────────────────────────────────────────────────────

class ClientOnboardingProfileUpdateSerializer(serializers.Serializer):
    """Step 4 (Optional): Update client profile with additional information."""
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)