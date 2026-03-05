import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import PhoneOTP
from .serializers import (
	AuthResponseSerializer,
	OTPRequestResponseSerializer,
	OTPRequestSerializer,
	OTPVerifySerializer,
	UserProfileSerializer,
)


User = get_user_model()


def _generate_otp_code() -> str:
	return f'{random.randint(0, 999999):06d}'


def _build_unique_username(base: str) -> str:
	candidate = base
	suffix = 1
	while User.objects.filter(username=candidate).exists():
		candidate = f'{base}_{suffix}'
		suffix += 1
	return candidate


class RequestOTPView(APIView):
	permission_classes = [permissions.AllowAny]

	@extend_schema(
		tags=['Auth'],
		request=OTPRequestSerializer,
		responses={200: OTPRequestResponseSerializer, 400: OpenApiResponse(description='Validation error')},
		description='Request an OTP code for phone-based register/login.',
	)
	def post(self, request):
		serializer = OTPRequestSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		phone_number = serializer.validated_data['phone_number']
		purpose = serializer.validated_data['purpose']

		PhoneOTP.objects.filter(
			phone_number=phone_number,
			purpose=purpose,
			is_used=False,
		).update(is_used=True)

		code = _generate_otp_code()
		PhoneOTP.objects.create(
			phone_number=phone_number,
			purpose=purpose,
			code=code,
			expires_at=timezone.now() + timedelta(minutes=5),
		)

		payload = {'detail': 'OTP sent successfully.'}
		if settings.DEBUG:
			payload['otp_code'] = code
		return Response(payload, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
	permission_classes = [permissions.AllowAny]

	@extend_schema(
		tags=['Auth'],
		request=OTPVerifySerializer,
		responses={200: AuthResponseSerializer, 400: OpenApiResponse(description='Invalid/expired OTP')},
		description='Verify phone OTP and issue JWT tokens. For register purpose, creates the user.',
	)
	def post(self, request):
		serializer = OTPVerifySerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		data = serializer.validated_data

		phone_number = data['phone_number']
		purpose = data['purpose']
		otp_code = data['otp_code']

		otp = PhoneOTP.objects.filter(
			phone_number=phone_number,
			purpose=purpose,
			is_used=False,
		).order_by('-created_at').first()

		if not otp:
			return Response({'detail': 'OTP not found. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

		if otp.is_expired:
			otp.is_used = True
			otp.save(update_fields=['is_used'])
			return Response({'detail': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

		if otp.code != otp_code:
			otp.attempts += 1
			if otp.attempts >= 5:
				otp.is_used = True
			otp.save(update_fields=['attempts', 'is_used'])
			return Response({'detail': 'Invalid OTP code.'}, status=status.HTTP_400_BAD_REQUEST)

		otp.is_used = True
		otp.save(update_fields=['is_used'])

		if purpose == PhoneOTP.PURPOSE_REGISTER:
			if User.objects.filter(phone_number=phone_number).exists():
				return Response({'detail': 'This phone number is already registered.'}, status=status.HTTP_400_BAD_REQUEST)

			role = data.get('role', User.ROLE_CLIENT)
			username_base = data.get('username') or phone_number
			username = _build_unique_username(username_base)

			user = User(
				username=username,
				phone_number=phone_number,
				role=role,
				first_name=data.get('first_name', ''),
				last_name=data.get('last_name', ''),
				is_on_trial=True,
				trial_ends_at=timezone.now() + timedelta(days=14),
			)
			user.set_unusable_password()
			user.save()
		else:
			user = User.objects.filter(phone_number=phone_number).first()
			if not user:
				return Response({'detail': 'No account found for this phone number.'}, status=status.HTTP_400_BAD_REQUEST)

		refresh = RefreshToken.for_user(user)
		access = refresh.access_token
		access['role'] = user.role
		access['phone_number'] = user.phone_number

		payload = {
			'access': str(access),
			'refresh': str(refresh),
			'user': UserProfileSerializer(user).data,
		}
		return Response(payload, status=status.HTTP_200_OK)


class RefreshView(TokenRefreshView):
	permission_classes = [permissions.AllowAny]

	@extend_schema(tags=['Auth'], description='Refresh access token using refresh token.')
	def post(self, request, *args, **kwargs):
		return super().post(request, *args, **kwargs)


class ProfileView(APIView):
	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(tags=['Auth'], responses={200: UserProfileSerializer})
	def get(self, request):
		return Response(UserProfileSerializer(request.user).data, status=status.HTTP_200_OK)

	@extend_schema(
		tags=['Auth'],
		request=UserProfileSerializer,
		responses={200: UserProfileSerializer},
		description='Update current user profile fields.',
	)
	def patch(self, request):
		serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(serializer.data, status=status.HTTP_200_OK)

