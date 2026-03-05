from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import PhoneOTP


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


class OTPRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=30)
    purpose = serializers.ChoiceField(choices=PhoneOTP.PURPOSE_CHOICES)

    def validate_phone_number(self, value):
        return value.strip()

    def validate(self, attrs):
        phone_number = attrs['phone_number']
        purpose = attrs['purpose']
        user_exists = User.objects.filter(phone_number=phone_number).exists()

        if purpose == PhoneOTP.PURPOSE_REGISTER and user_exists:
            raise serializers.ValidationError({'phone_number': 'This phone number is already registered.'})
        if purpose == PhoneOTP.PURPOSE_LOGIN and not user_exists:
            raise serializers.ValidationError({'phone_number': 'No account found for this phone number.'})
        return attrs


class OTPVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=30)
    otp_code = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(choices=PhoneOTP.PURPOSE_CHOICES)

    # Used only when purpose=register
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_phone_number(self, value):
        return value.strip()

    def validate(self, attrs):
        if attrs['purpose'] == PhoneOTP.PURPOSE_REGISTER:
            role = attrs.get('role', User.ROLE_CLIENT)
            if role == User.ROLE_ADMIN:
                raise serializers.ValidationError({'role': 'Admin role cannot be selected during signup.'})
        return attrs


class OTPRequestResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    otp_code = serializers.CharField(required=False)


class AuthResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserProfileSerializer()

