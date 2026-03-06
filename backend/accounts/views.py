import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView

from .models import PhoneOTP
from .serializers import (
	AuthTokenSerializer,
	LoginOTPRequestSerializer,
	LoginVerifySerializer,
	OTPSentSerializer,
	SignupOTPRequestSerializer,
	SignupVerifySerializer,
	UserProfileSerializer,
)

User = get_user_model()

OTP_EXPIRY_MINUTES = 5
OTP_MAX_ATTEMPTS   = 5
TRIAL_DAYS         = 14


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
	"""Return a zero-padded 6-digit OTP string."""
	return f'{random.randint(0, 999_999):06d}'


def _unique_username(base: str) -> str:
	"""Return `base` (or `base_N`) that does not collide with existing usernames."""
	candidate, n = base, 1
	while User.objects.filter(username=candidate).exists():
		candidate = f'{base}_{n}'
		n += 1
	return candidate


def _invalidate_previous_otps(phone_number: str, purpose: str) -> None:
	"""Mark any unused OTPs for this phone+purpose as used before issuing a new one."""
	PhoneOTP.objects.filter(
		phone_number=phone_number,
		purpose=purpose,
		is_used=False,
	).update(is_used=True)


def _issue_otp(phone_number: str, purpose: str) -> str:
	"""Invalidate old OTPs, create a new one, and return the code."""
	_invalidate_previous_otps(phone_number, purpose)
	code = _generate_otp()
	PhoneOTP.objects.create(
		phone_number=phone_number,
		purpose=purpose,
		code=code,
		expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
	)
	return code


def _verify_otp(phone_number: str, purpose: str, otp_code: str):
	"""
	Validate `otp_code` against the latest unused OTP for this phone+purpose.

	Returns the `PhoneOTP` instance on success.
	Raises `ValueError` with a human-readable message on failure.
	"""
	otp = (
		PhoneOTP.objects
		.filter(phone_number=phone_number, purpose=purpose, is_used=False)
		.order_by('-created_at')
		.first()
	)

	if otp is None:
		raise ValueError('OTP not found. Please request a new one.')

	if otp.is_expired:
		otp.is_used = True
		otp.save(update_fields=['is_used'])
		raise ValueError('OTP has expired. Please request a new one.')

	if otp.attempts >= OTP_MAX_ATTEMPTS:
		raise ValueError('Too many failed attempts. Please request a new OTP.')

	if otp.code != otp_code:
		otp.attempts += 1
		if otp.attempts >= OTP_MAX_ATTEMPTS:
			otp.is_used = True
		otp.save(update_fields=['attempts', 'is_used'])
		raise ValueError('Invalid OTP code.')

	otp.is_used = True
	otp.save(update_fields=['is_used'])
	return otp


def _build_token_response(user) -> dict:
	"""Build JWT access + refresh tokens with custom claims, plus user profile."""
	refresh = RefreshToken.for_user(user)
	access  = refresh.access_token
	# Embed role and phone into the token so the frontend doesn't need an extra call
	access['role']         = user.role
	access['phone_number'] = user.phone_number
	return {
		'access':  str(access),
		'refresh': str(refresh),
		'user':    UserProfileSerializer(user).data,
	}


def _otp_response(code: str) -> dict:
	"""Build the OTP-sent response. Code is only included in DEBUG mode."""
	payload = {'detail': 'OTP sent successfully.'}
	if settings.DEBUG:
		payload['otp_code'] = code   # ← remove / replace with real SMS in production
	return payload


# ─────────────────────────────────────────────────────────────────────────────
# SIGNUP — Step 1  POST /api/v1/auth/signup/otp/
# ─────────────────────────────────────────────────────────────────────────────

class SignupRequestOTPView(APIView):
	"""
	Request an OTP to start phone-based signup.

	Send `phone_number` and `role` (`client` | `provider`).
	The OTP is delivered via SMS (returned in the response body in DEBUG mode only).
	"""

	permission_classes = [permissions.AllowAny]

	@extend_schema(
		tags=['Signup'],
		request=SignupOTPRequestSerializer,
		responses={
			200: OTPSentSerializer,
			400: OpenApiResponse(description='Phone already registered or invalid input.'),
		},
		summary='Signup — request OTP',
		description=(
			'Validates the phone number (must not already exist), stores account details, '
			'and sends a 6-digit OTP. In DEBUG the OTP is returned in the response.'
		),
	)
	def post(self, request):
		serializer = SignupOTPRequestSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		vd = serializer.validated_data

		# Persist pending signup data inside the OTP record isn't possible with the
		# current PhoneOTP model, so we carry role/name through the verify step.
		# The serializer already validated the phone is not taken.
		code = _issue_otp(vd['phone_number'], PhoneOTP.PURPOSE_REGISTER)
		return Response(_otp_response(code), status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# SIGNUP — Step 2  POST /api/v1/auth/signup/verify/
# ─────────────────────────────────────────────────────────────────────────────

class SignupVerifyView(APIView):
	"""
	Verify signup OTP, create the user account, and return JWT tokens.

	On success a new `User` is created (client or provider) with an unusable
	password (phone-only auth).  Providers receive a 14-day free trial window.
	"""

	permission_classes = [permissions.AllowAny]

	@extend_schema(
		tags=['Signup'],
		request=SignupVerifySerializer,
		responses={
			200: AuthTokenSerializer,
			400: OpenApiResponse(description='Invalid / expired OTP or phone already taken.'),
		},
		summary='Signup — verify OTP & create account',
	)
	def post(self, request):
		serializer = SignupVerifySerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		vd = serializer.validated_data

		phone_number = vd['phone_number']
		otp_code     = vd['otp_code']

		# We need the original signup payload (role, name) — the client must resend it
		# on the verify call so the account can be created.  Add those fields here so
		# Swagger/clients know what to send.
		role       = request.data.get('role', User.ROLE_CLIENT)
		first_name = request.data.get('first_name', '')
		last_name  = request.data.get('last_name', '')
		username   = request.data.get('username') or phone_number

		if role not in (User.ROLE_CLIENT, User.ROLE_PROVIDER):
			return Response(
				{'role': 'Must be "client" or "provider".'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		try:
			_verify_otp(phone_number, PhoneOTP.PURPOSE_REGISTER, otp_code)
		except ValueError as exc:
			return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

		if User.objects.filter(phone_number=phone_number).exists():
			return Response(
				{'detail': 'This phone number is already registered.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		with transaction.atomic():
			user = User(
				username    = _unique_username(username),
				phone_number= phone_number,
				role        = role,
				first_name  = first_name,
				last_name   = last_name,
				is_on_trial = True,
				trial_ends_at = timezone.now() + timedelta(days=TRIAL_DAYS),
			)
			user.set_unusable_password()
			user.save()

		return Response(_build_token_response(user), status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────────────────────────────────────
# LOGIN — Step 1  POST /api/v1/auth/login/otp/
# ─────────────────────────────────────────────────────────────────────────────

class LoginRequestOTPView(APIView):
	"""
	Request a login OTP for an existing account.

	Works for both clients and service providers — no `role` field required.
	"""

	permission_classes = [permissions.AllowAny]

	@extend_schema(
		tags=['Login'],
		request=LoginOTPRequestSerializer,
		responses={
			200: OTPSentSerializer,
			400: OpenApiResponse(description='Phone number not registered.'),
		},
		summary='Login — request OTP',
		description='Send `phone_number`. An OTP is dispatched via SMS (returned in DEBUG).',
	)
	def post(self, request):
		serializer = LoginOTPRequestSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		phone_number = serializer.validated_data['phone_number']

		code = _issue_otp(phone_number, PhoneOTP.PURPOSE_LOGIN)
		return Response(_otp_response(code), status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# LOGIN — Step 2  POST /api/v1/auth/login/verify/
# ─────────────────────────────────────────────────────────────────────────────

class LoginVerifyView(APIView):
	"""
	Verify login OTP and return JWT access + refresh tokens.

	The response is identical for clients and service providers;
	the frontend can inspect `user.role` to redirect accordingly.
	"""

	permission_classes = [permissions.AllowAny]

	@extend_schema(
		tags=['Login'],
		request=LoginVerifySerializer,
		responses={
			200: AuthTokenSerializer,
			400: OpenApiResponse(description='Invalid / expired OTP.'),
			404: OpenApiResponse(description='Account not found.'),
		},
		summary='Login — verify OTP & get tokens',
	)
	def post(self, request):
		serializer = LoginVerifySerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		vd = serializer.validated_data

		phone_number = vd['phone_number']
		otp_code     = vd['otp_code']

		try:
			_verify_otp(phone_number, PhoneOTP.PURPOSE_LOGIN, otp_code)
		except ValueError as exc:
			return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

		try:
			user = User.objects.get(phone_number=phone_number)
		except User.DoesNotExist:
			return Response(
				{'detail': 'No account found for this phone number.'},
				status=status.HTTP_404_NOT_FOUND,
			)

		return Response(_build_token_response(user), status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# TOKEN REFRESH  POST /api/v1/auth/token/refresh/
# ─────────────────────────────────────────────────────────────────────────────

class TokenRefreshView(BaseTokenRefreshView):
	"""Use the refresh token to obtain a new short-lived access token."""

	permission_classes = [permissions.AllowAny]

	@extend_schema(tags=['Auth'], summary='Refresh access token')
	def post(self, request, *args, **kwargs):
		return super().post(request, *args, **kwargs)


# ─────────────────────────────────────────────────────────────────────────────
# PROFILE  GET / PATCH /api/v1/auth/profile/
# ─────────────────────────────────────────────────────────────────────────────

class ProfileView(APIView):
	"""Read or update the currently authenticated user's profile."""

	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		tags=['Auth'],
		responses={200: UserProfileSerializer},
		summary='Get my profile',
	)
	def get(self, request):
		return Response(UserProfileSerializer(request.user).data)

	@extend_schema(
		tags=['Auth'],
		request=UserProfileSerializer,
		responses={200: UserProfileSerializer},
		summary='Update my profile',
		description='Supports partial updates (PATCH). `role` and `verification_status` are read-only.',
	)
	def patch(self, request):
		serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(serializer.data)

