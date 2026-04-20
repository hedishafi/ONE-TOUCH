from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    ClientProfile,
    DeletedProviderRecord,
    ProviderManualVerification,
    ProviderProfile,
    ServiceCategory,
    SubService,
)


User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'phone_number',
            'first_name',
            'last_name',
            'role',
            'provider_uid',
            'verification_status',
            'is_on_trial',
            'trial_ends_at',
            'date_joined',
        ]
        read_only_fields = [
            'id',
            'role',
            'provider_uid',
            'verification_status',
            'is_on_trial',
            'trial_ends_at',
            'date_joined',
        ]


class ClientAuthProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'phone_number',
            'first_name',
            'last_name',
            'role',
            'date_joined',
        ]
        read_only_fields = fields


class ProviderAuthProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'phone_number',
            'first_name',
            'last_name',
            'role',
            'provider_uid',
            'verification_status',
            'is_on_trial',
            'trial_ends_at',
            'date_joined',
        ]
        read_only_fields = fields


class ClientMinimalUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'phone_number', 'role']
        read_only_fields = ['id', 'role']


class ProviderFullUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'phone_number',
            'role',
            'provider_uid',
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
    user_id = serializers.CharField(source='user.id', read_only=True)
    phone_number = serializers.CharField(source='user.phone_number', read_only=True)

    class Meta:
        model = ClientProfile
        fields = ['user_id', 'phone_number', 'full_name', 'wallet_balance']
        read_only_fields = ['user_id', 'phone_number', 'wallet_balance']


class OTPSentSerializer(serializers.Serializer):
    detail = serializers.CharField()
    otp_code = serializers.CharField(required=False)


class AuthTokenSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserProfileSerializer()


class SignupOTPRequestSerializer(serializers.Serializer):
    SIGNUP_ROLE_CHOICES = [
        (User.ROLE_CLIENT, 'Client'),
        (User.ROLE_PROVIDER, 'Service Provider'),
    ]

    phone_number = serializers.CharField(max_length=30)
    role = serializers.ChoiceField(choices=SIGNUP_ROLE_CHOICES, default=User.ROLE_CLIENT, required=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_phone_number(self, value: str) -> str:
        import re

        value = value.strip()
        if value.startswith('0'):
            value = '+251' + value[1:]
        elif value.startswith('251'):
            value = '+' + value

        if not re.match(r'^\+251\d{9}$', value):
            raise serializers.ValidationError('Phone must be in Ethiopian format: +251XXXXXXXXX (9 digits after +251)')

        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('This phone number is already registered. Please log in instead.')

        if DeletedProviderRecord.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('This provider account was removed. Please contact admin support.')

        return value


class SignupVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=30)
    otp_code = serializers.CharField(max_length=6, min_length=6)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_phone_number(self, value: str) -> str:
        from .views import _normalize_phone_number
        return _normalize_phone_number(value)


class LoginOTPRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=30)

    def validate_phone_number(self, value: str) -> str:
        from .views import _normalize_phone_number

        value = _normalize_phone_number(value)
        if DeletedProviderRecord.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('This provider account was removed by admin. Please contact admin support.')
        if not User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('No account found for this phone number.')
        return value


class LoginVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=30)
    otp_code = serializers.CharField(max_length=6, min_length=6)

    def validate_phone_number(self, value: str) -> str:
        from .views import _normalize_phone_number

        return _normalize_phone_number(value)


class ProviderProfileSetupSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    service_category = serializers.CharField(max_length=100)
    sub_services = serializers.ListField(child=serializers.CharField(max_length=100), allow_empty=False)
    price_min = serializers.IntegerField(min_value=0)
    price_max = serializers.IntegerField(min_value=0)
    bio = serializers.CharField(required=False, allow_blank=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    def validate_full_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError('full_name is required.')
        return value

    def validate_service_category(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError('service_category is required.')
        return value

    def validate_sub_services(self, value):
        cleaned = [item.strip() for item in value if str(item).strip()]
        if not cleaned:
            raise serializers.ValidationError('At least one sub service is required.')
        return cleaned

    def validate(self, attrs):
        if attrs['price_min'] > attrs['price_max']:
            raise serializers.ValidationError({'price_max': 'price_max must be greater than or equal to price_min.'})

        category_name = attrs['service_category']
        category = ServiceCategory.objects.filter(name__iexact=category_name, is_active=True).first()
        if not category:
            raise serializers.ValidationError({'service_category': 'Invalid service category. Please choose from available categories.'})

        resolved_sub_services = []
        invalid_sub_services = []
        for sub_service_name in attrs['sub_services']:
            sub_service = SubService.objects.filter(
                category=category,
                name__iexact=sub_service_name,
                is_active=True,
            ).first()
            if not sub_service:
                invalid_sub_services.append(sub_service_name)
                continue
            resolved_sub_services.append(sub_service)

        if invalid_sub_services:
            raise serializers.ValidationError(
                {'sub_services': f'Invalid sub services for selected category: {", ".join(invalid_sub_services)}'}
            )

        attrs['service_category_obj'] = category
        attrs['sub_service_objects'] = resolved_sub_services
        attrs['service_category'] = category.name
        attrs['sub_services'] = [item.name for item in resolved_sub_services]
        return attrs


class ProviderManualVerificationUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProviderManualVerification
        fields = ['id', 'id_front_image', 'id_back_image', 'selfie_image', 'status', 'submitted_at']
        read_only_fields = ['id', 'status', 'submitted_at']

    ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
    MAX_IMAGE_SIZE_MB = 10

    def _validate_image(self, value, field_name: str):
        if value.content_type not in self.ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                {field_name: f'Unsupported file type "{value.content_type}". Allowed: {", ".join(sorted(self.ALLOWED_IMAGE_TYPES))}'}
            )
        if value.size > self.MAX_IMAGE_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(
                {field_name: f'File too large. Maximum size is {self.MAX_IMAGE_SIZE_MB} MB.'}
            )
        return value

    def validate_id_front_image(self, value):
        return self._validate_image(value, 'id_front_image')

    def validate_id_back_image(self, value):
        return self._validate_image(value, 'id_back_image')

    def validate_selfie_image(self, value):
        return self._validate_image(value, 'selfie_image')


class ProviderManualVerificationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProviderManualVerification
        fields = ['id', 'status', 'rejection_reason', 'reviewed_at', 'submitted_at', 'updated_at']
        read_only_fields = fields
