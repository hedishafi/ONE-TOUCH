import random
import os
import tempfile
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiRequest, OpenApiResponse, extend_schema, inline_serializer
from rest_framework import permissions, serializers as rest_framework_serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView

from .models import (
	IdentityDocument, PhoneOTP, ProviderProfile, ClientProfile, FaceBiometricVerification,
	ProviderOnboardingSession, ServiceCategory, SubService, ProviderService, ClientOnboardingSession,
	ProviderManualVerification, DeletedProviderRecord,
)
from .ocr_engine import get_ocr_engine
from .permissions import IsProvider, IsClient
from .serializers import (
	AuthTokenSerializer,
	ClientProfileSerializer,
	ClientMinimalUserSerializer,
	FaceBiometricVerificationSerializer,
	IdentityDocumentSerializer,
	LoginOTPRequestSerializer,
	LoginVerifySerializer,
	OTPSentSerializer,
	ProviderFullUserSerializer,
	ProviderProfileSerializer,
	ProviderProfileSetupSerializer,
	SignupOTPRequestSerializer,
	SignupVerifySerializer,
	UserProfileSerializer,
	ClientAuthProfileSerializer,
	ProviderAuthProfileSerializer,
	ServiceCategorySerializer,
	SubServiceSerializer,
	OnboardingStep1Serializer,
	OnboardingStep2Serializer,
	OnboardingStep3OTPRequestSerializer,
	OnboardingStep3OTPVerifySerializer,
	OnboardingStep4Serializer,
	OnboardingStep5Serializer,
	ClientOnboardingProfileUpdateSerializer,
	ProviderManualVerificationUploadSerializer,
	ProviderManualVerificationStatusSerializer,
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


def _normalize_phone_number(phone_number: str) -> str:
	"""
	Normalize phone numbers to E.164 format (+251XXXXXXXXX).
	Handles:
	  - +251XXXXXXXXX → +251XXXXXXXXX (already normalized)
	  - 0XXXXXXXXX   → +251XXXXXXXXX (Ethiopian local format)
	  - 251XXXXXXXXX → +251XXXXXXXXX (no leading +)
	"""
	phone_number = phone_number.strip().replace(' ', '').replace('-', '')
	
	# If already in +251 format, return as-is
	if phone_number.startswith('+251'):
		return phone_number
	
	# If starts with 0 (local Ethiopian format), replace with +251
	if phone_number.startswith('0') and len(phone_number) == 10:
		return '+251' + phone_number[1:]
	
	# If it's 251 without +, add the +
	if phone_number.startswith('251') and len(phone_number) == 12:
		return '+' + phone_number
	
	# If it's already a 9-digit number, assume it's the part after country code
	if len(phone_number) == 9 and phone_number.isdigit():
		return '+251' + phone_number
	
	# Return as-is if format unclear (let validation catch it later)
	return phone_number


def _invalidate_previous_otps(phone_number: str, purpose: str) -> None:
	"""Mark any unused OTPs for this phone+purpose as used before issuing a new one."""
	phone_number = _normalize_phone_number(phone_number)
	PhoneOTP.objects.filter(
		phone_number=phone_number,
		purpose=purpose,
		is_used=False,
	).update(is_used=True)


def _issue_otp(phone_number: str, purpose: str, **meta) -> str:
	"""
	Invalidate old OTPs, create a new one (persist optional meta), send SMS, and return the code.
	
	If SMS fails, deletes the OTP and raises ValueError.
	"""
	from .sms_service import send_otp_sms
	
	phone_number = _normalize_phone_number(phone_number)
	_invalidate_previous_otps(phone_number, purpose)
	code = _generate_otp()
	
	# Create OTP record
	otp = PhoneOTP.objects.create(
		phone_number=phone_number,
		purpose=purpose,
		code=code,
		expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
		role=meta.get('role'),
		username=meta.get('username', '') or '',
		first_name=meta.get('first_name', '') or '',
		last_name=meta.get('last_name', '') or '',
	)
	
	# Send SMS
	sms_sent = send_otp_sms(phone_number, code)
	if not sms_sent:
		otp.delete()  # Delete OTP if SMS failed
		raise ValueError('Failed to send OTP. Please try again.')
	
	return code


def _verify_otp(phone_number: str, purpose: str, otp_code: str):
	"""
	Validate `otp_code` against the latest unused OTP for this phone+purpose.

	Returns the `PhoneOTP` instance on success.
	Raises `ValueError` with a human-readable message on failure.
	"""
	phone_number = _normalize_phone_number(phone_number)
	otp_code = otp_code.strip()
	
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
	"""
	Build JWT access + refresh tokens with custom claims, plus user profile.
	
	Clients receive minimal user data (id, phone_number, role).
	Providers receive full user data (id, phone_number, role, verification_status, is_on_trial, trial_ends_at).
	"""
	refresh = RefreshToken.for_user(user)
	access  = refresh.access_token
	# Embed role and phone into the token so the frontend doesn't need an extra call
	access['role']         = user.role
	access['phone_number'] = user.phone_number
	
	# Use minimal serializer for clients, full serializer for providers
	if user.role == User.ROLE_CLIENT:
		user_data = ClientMinimalUserSerializer(user).data
	else:
		user_data = ProviderFullUserSerializer(user).data
	
	return {
		'access':  str(access),
		'refresh': str(refresh),
		'user':    user_data,
	}


def _otp_response(code: str) -> dict:
	"""Build the OTP-sent response. Code is only included in DEBUG mode."""
	payload = {
		'detail': 'OTP sent successfully.',
		'expires_in_seconds': OTP_EXPIRY_MINUTES * 60,
	}
	if settings.DEBUG:
		payload['otp_code'] = code   # ← remove / replace with real SMS in production
	return payload


def _first_error_text(errors) -> str:
	if isinstance(errors, dict):
		for value in errors.values():
			return _first_error_text(value)
	if isinstance(errors, list) and errors:
		return _first_error_text(errors[0])
	return str(errors)


def _provider_resume_status(user):
	try:
		provider_profile = user.provider_profile
		profile_completed = provider_profile.profile_completed
	except ProviderProfile.DoesNotExist:
		profile_completed = False

	latest_verification = (
		ProviderManualVerification.objects
		.filter(provider=user)
		.order_by('-submitted_at')
		.first()
	)

	verification_status = latest_verification.status if latest_verification else 'not_submitted'

	if not profile_completed:
		return {
			'next_step': 'profile_setup',
			'next_route': '/provider/profile-setup',
			'profile_completed': False,
			'verification_status': verification_status,
		}

	if latest_verification is None or latest_verification.status == ProviderManualVerification.STATUS_REJECTED:
		return {
			'next_step': 'identity_upload',
			'next_route': '/provider/onboarding/step1',
			'profile_completed': True,
			'verification_status': verification_status,
		}

	return {
		'next_step': 'dashboard',
		'next_route': '/provider/dashboard',
		'profile_completed': True,
		'verification_status': verification_status,
	}

class OCREngineDebugView(APIView):
	"""Simple debug endpoint to report which OCR engine is active.

	This is meant for development/testing so you can confirm whether
	Google Vision or Tesseract is being used in the running container.
	"""

	permission_classes = [permissions.AllowAny]

	@extend_schema(
		methods=['GET'],
		operation_id='ocr_engine_debug',
		responses={
			200: inline_serializer(
				'OCREngineDebugResponse',
				{
					'engine_env': rest_framework_serializers.CharField(),
					'credentials_env': rest_framework_serializers.CharField(allow_blank=True),
					'resolved_engine_class': rest_framework_serializers.CharField(),
					'credentials_file_exists': rest_framework_serializers.BooleanField(),
				},
			),
		},
		summary='Debug — show active OCR engine',
		description=(
			'Returns which OCR engine implementation is currently active in this '
			'container (Tesseract vs Google Vision), along with the raw OCR-related '
			'environment variables and whether the credentials file exists.'
		),
	)
	def get(self, request):
		engine_env = os.getenv('OCR_ENGINE') or ''
		creds_env = os.getenv('GOOGLE_APPLICATION_CREDENTIALS') or ''
		engine = get_ocr_engine()
		resolved_class = engine.__class__.__name__
		credentials_file_exists = bool(creds_env and os.path.isfile(creds_env))

		return Response(
			{
				'engine_env': engine_env,
				'credentials_env': creds_env,
				'resolved_engine_class': resolved_class,
				'credentials_file_exists': credentials_file_exists,
			},
			status=status.HTTP_200_OK,
		)


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
		request=inline_serializer(
			'SignupOTPRequest',
			{
				'phone_number': rest_framework_serializers.CharField(
					max_length=30,
					help_text='Phone number (e.g., +251911234567 or 0911234567)',
				),
				'role': rest_framework_serializers.ChoiceField(
					choices=['client', 'provider'],
					default='client',
					help_text='Account type: "client" or "provider"',
				),
			}
		),
		responses={
			200: OTPSentSerializer,
			400: OpenApiResponse(description='Phone already registered or invalid input.'),
		},
		summary='Signup — request OTP',
		description=(
			'Validates the phone number (must not already exist) and sends a 6-digit OTP. '
			'In DEBUG mode the OTP is returned in the response.'
		),
	)
	def post(self, request):
		serializer = SignupOTPRequestSerializer(data=request.data)
		if not serializer.is_valid():
			detail = _first_error_text(serializer.errors)
			payload = {
				'detail': detail,
				'errors': serializer.errors,
			}
			if 'already registered' in detail.lower():
				payload['next_action'] = 'login'
			return Response(payload, status=status.HTTP_400_BAD_REQUEST)
		vd = serializer.validated_data

		# Persist pending signup data inside the OTP record isn't possible with the
		# current PhoneOTP model, so we carry role/name through the verify step.
		# The serializer already validated the phone is not taken.
		code = _issue_otp(
			vd['phone_number'],
			PhoneOTP.PURPOSE_REGISTER,
			role=vd.get('role'),
			username=vd.get('username', ''),
			first_name=vd.get('first_name', ''),
			last_name=vd.get('last_name', ''),
		)
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
		request=inline_serializer(
			'SignupVerifyRequest',
			{
				'phone_number': rest_framework_serializers.CharField(
					max_length=30,
					help_text='Same phone number from signup/otp request',
				),
				'otp_code': rest_framework_serializers.CharField(
					max_length=6, min_length=6,
					help_text='6-digit OTP code sent to your phone',
				),
				'role': rest_framework_serializers.ChoiceField(
					choices=['client', 'provider'],
					required=False,
					help_text='Optional: "client" or "provider"',
				),
			}
		),
		responses={
			201: AuthTokenSerializer,
			400: OpenApiResponse(description='Invalid / expired OTP or phone already taken.'),
		},
		summary='Signup — verify OTP & create account',
	)
	def post(self, request):
		serializer = SignupVerifySerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		vd = serializer.validated_data

		phone_number = _normalize_phone_number(vd['phone_number'])
		otp_code     = vd['otp_code']

		requested_role = request.data.get('role')
		first_name = request.data.get('first_name', '')
		last_name  = request.data.get('last_name', '')
		username   = request.data.get('username') or phone_number

		if requested_role and requested_role not in (User.ROLE_CLIENT, User.ROLE_PROVIDER):
			return Response({'role': 'Must be "client" or "provider".'}, status=status.HTTP_400_BAD_REQUEST)

		try:
			otp = _verify_otp(phone_number, PhoneOTP.PURPOSE_REGISTER, otp_code)
		except ValueError as exc:
			return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

		# IMPORTANT: role from OTP request is the source of truth for shared signup flow.
		# This prevents provider OTPs from being verified as client (or vice versa).
		if otp.role and requested_role and requested_role != otp.role:
			return Response(
				{'detail': 'Role mismatch. Please verify using the same role selected when requesting OTP.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		role = otp.role or requested_role or User.ROLE_CLIENT
		if role not in (User.ROLE_CLIENT, User.ROLE_PROVIDER):
			return Response({'detail': 'Invalid role for signup verification.'}, status=status.HTTP_400_BAD_REQUEST)

		username = request.data.get('username') or otp.username or phone_number
		first_name = request.data.get('first_name') or otp.first_name or ''
		last_name = request.data.get('last_name') or otp.last_name or ''

		if User.objects.filter(phone_number=phone_number).exists():
			return Response(
				{'detail': 'This phone number is already registered. Please log in.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		with transaction.atomic():
			# Only providers get a trial period; clients do not
			user = User(
				username = _unique_username(username),
				phone_number = phone_number,
				role = role,
				first_name = first_name,
				last_name = last_name,
				is_on_trial = (role == User.ROLE_PROVIDER),
				trial_ends_at = timezone.now() + timedelta(days=TRIAL_DAYS) if role == User.ROLE_PROVIDER else None,
			)
			user.set_unusable_password()
			user.save()

			# Auto-create client profile for clients
			if role == User.ROLE_CLIENT:
				ClientProfile.objects.create(
					user=user,
					client_type=ClientProfile.CLIENT_TYPE_INDIVIDUAL,
					full_name=f'{first_name} {last_name}'.strip() or user.username,
					loyalty_tier=ClientProfile.LOYALTY_BRONZE,
					wallet_balance=0.00,
				)

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
		if not serializer.is_valid():
			return Response(
				{
					'detail': _first_error_text(serializer.errors),
					'errors': serializer.errors,
				},
				status=status.HTTP_400_BAD_REQUEST,
			)
		phone_number = serializer.validated_data['phone_number']

		if DeletedProviderRecord.objects.filter(phone_number=phone_number).exists():
			return Response(
				{'detail': 'This provider account was removed by admin. Please contact admin support.'},
				status=status.HTTP_403_FORBIDDEN,
			)

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

		phone_number = _normalize_phone_number(vd['phone_number'])
		otp_code     = vd['otp_code']

		if DeletedProviderRecord.objects.filter(phone_number=phone_number).exists():
			return Response(
				{'detail': 'This provider account was removed by admin. Please contact admin support.'},
				status=status.HTTP_403_FORBIDDEN,
			)

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

		if not user.is_active:
			return Response(
				{'detail': 'This account is inactive. Please contact admin support.'},
				status=status.HTTP_403_FORBIDDEN,
			)

		return Response(_build_token_response(user), status=status.HTTP_200_OK)


class ProviderOnboardingStatusView(APIView):
	permission_classes = [permissions.IsAuthenticated, IsProvider]

	@extend_schema(
		tags=['Provider'],
		responses={
			200: inline_serializer(
				'ProviderOnboardingStatusResponse',
				{
					'next_step': rest_framework_serializers.CharField(),
					'next_route': rest_framework_serializers.CharField(),
					'profile_completed': rest_framework_serializers.BooleanField(),
					'verification_status': rest_framework_serializers.CharField(),
				},
			)
		},
		summary='Get provider onboarding resume status',
	)
	def get(self, request):
		return Response(_provider_resume_status(request.user), status=status.HTTP_200_OK)


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
# LOGOUT  POST /api/v1/auth/logout/
# ─────────────────────────────────────────────────────────────────────────────

class LogoutView(APIView):
	"""
	Logout endpoint. 
	For JWT, the client should simply delete the access token from their device.
	This endpoint acknowledges the logout request.
	"""

	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		tags=['Auth'],
		request=inline_serializer('LogoutRequest', {}),
		responses={
			200: inline_serializer('LogoutResponse', {
				'detail': rest_framework_serializers.CharField(),
			}),
		},
		summary='Logout',
		description='Logout endpoint. For JWT, the client should delete the access token from their device.',
	)
	def post(self, request):
		return Response(
			{'detail': 'Successfully logged out. Please delete the access token from your device.'},
			status=status.HTTP_200_OK
		)


class UserProfileView(APIView):
	"""Return current authenticated user profile for status/role-aware frontend refreshes."""

	permission_classes = [permissions.IsAuthenticated]

	@extend_schema(
		tags=['Auth'],
		responses={200: OpenApiResponse(description='Role-based profile payload (client or provider).')},
		summary='Get my profile',
		description='Returns the authenticated user profile including provider UID and verification status.',
	)
	def get(self, request):
		if request.user.role == User.ROLE_PROVIDER:
			data = ProviderAuthProfileSerializer(request.user).data
		else:
			data = ClientAuthProfileSerializer(request.user).data
		return Response(data, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# CLIENT PROFILE  GET / PATCH /api/v1/client/profile/
# ─────────────────────────────────────────────────────────────────────────────

class ClientProfileView(APIView):
	"""Retrieve or partially update the authenticated client's profile."""

	permission_classes = [permissions.IsAuthenticated, IsClient]

	@extend_schema(
		tags=['Client'],
		responses={
			200: inline_serializer(
				'ClientProfileDetail',
				{
					'user_id': rest_framework_serializers.IntegerField(),
					'phone_number': rest_framework_serializers.CharField(),
					'full_name': rest_framework_serializers.CharField(),
					'wallet_balance': rest_framework_serializers.DecimalField(max_digits=12, decimal_places=2),
				}
			)
		},
		summary='Get my client profile',
		description='Returns: user_id, phone_number, full_name, wallet_balance.',
	)
	def get(self, request):
		try:
			profile = request.user.client_profile
		except ClientProfile.DoesNotExist:
			return Response({'detail': 'Client profile not found.'}, status=status.HTTP_404_NOT_FOUND)
		return Response(ClientProfileSerializer(profile).data)

	@extend_schema(
		tags=['Client'],
		request=inline_serializer(
			'ClientProfileUpdate',
			{
				'full_name': rest_framework_serializers.CharField(required=False),
			}
		),
		responses={
			200: inline_serializer(
				'ClientProfileDetail',
				{
					'user_id': rest_framework_serializers.IntegerField(),
					'phone_number': rest_framework_serializers.CharField(),
					'full_name': rest_framework_serializers.CharField(),
					'wallet_balance': rest_framework_serializers.DecimalField(max_digits=12, decimal_places=2),
				}
			)
		},
		summary='Update my client profile',
		description='Update full_name only. wallet_balance is read-only.',
	)
	def patch(self, request):
		try:
			profile = request.user.client_profile
		except ClientProfile.DoesNotExist:
			return Response({'detail': 'Client profile not found.'}, status=status.HTTP_404_NOT_FOUND)
		serializer = ClientProfileSerializer(profile, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# IDENTITY DOCUMENT UPLOAD  POST /api/v1/identity-docs/
# ─────────────────────────────────────────────────────────────────────────────

class IdentityDocumentUploadView(APIView):
	"""
	Upload an identity document (and optional biometric selfie).
	Automatically queues the OCR + liveness verification Celery task.
	Accepts multipart/form-data.
	"""

	permission_classes = [permissions.IsAuthenticated, IsProvider]
	parser_classes     = [MultiPartParser, FormParser]

	@extend_schema(
		tags=['Provider'],
		request={
			'multipart/form-data': {
				'type': 'object',
				'properties': {
					'doc_type': {
						'type': 'string',
						'enum': ['national_id', 'drivers_license', 'kebele_id'],
						'description': 'Type of identity document. Only national_id, drivers_license, and kebele_id are supported.',
					},
					'document_url': {
						'type': 'string',
						'format': 'binary',
						'description': 'Government-issued ID document (JPEG, PNG or PDF, max 10 MB).',
					},
					'biometric_selfie': {
						'type': 'string',
						'format': 'binary',
						'nullable': True,
						'description': 'Liveness selfie photo (JPEG/PNG, max 5 MB). Optional.',
					},
				},
				'required': ['doc_type', 'document_url'],
			}
		},
		responses={
			201: IdentityDocumentSerializer,
			400: OpenApiResponse(description='Validation error or unsupported document type'),
		},
		summary='Upload identity document',
		description=(
			'Upload a government-issued ID document (national ID, driver\'s license, or kebele ID) '
			'and an optional biometric selfie. Passport documents are not supported. '
			'Triggers automated OCR + liveness verification. '
			'If the combined confidence score ≥ 0.75 the document is auto-approved; '
			'otherwise it is flagged for admin review.'
		),
	)
	def post(self, request):
		serializer = IdentityDocumentSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		# Validate document type is supported
		doc_type = request.data.get('doc_type')
		if doc_type not in IdentityDocument.SUPPORTED_TYPES:
			return Response(
				{
					'doc_type': f'Unsupported or invalid ID document type. Supported types: {", ".join(IdentityDocument.SUPPORTED_TYPES)}'
				},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		doc = serializer.save(user=request.user)

		# Queue automated verification (non-blocking)
		try:
			from .tasks import run_verification
			run_verification.delay(doc.pk)
		except Exception:	# Celery may not be running in dev
			pass

		return Response(serializer.data, status=status.HTTP_201_CREATED)

	@extend_schema(
		tags=['Provider'],
		responses={200: IdentityDocumentSerializer(many=True)},
		summary='List my identity documents',
	)
	def get(self, request):
		docs = IdentityDocument.objects.filter(user=request.user)
		serializer = IdentityDocumentSerializer(docs, many=True)
		return Response(serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# FACE BIOMETRIC VERIFICATION  POST /api/v1/identity-docs/{id}/verify-face/
# ─────────────────────────────────────────────────────────────────────────────

class FaceVerificationView(APIView):
	"""
	Submit a biometric selfie for face verification (liveness + face matching).
	Automatically runs the face verification engine and returns confidence scores.
	If scores meet the configured thresholds, the submission is auto-approved.
	Otherwise, it is flagged for admin review.
	Accepts multipart/form-data.
	"""

	permission_classes = [permissions.IsAuthenticated, IsProvider]
	parser_classes     = [MultiPartParser, FormParser]

	@extend_schema(
		tags=['Provider'],
		request={
			'multipart/form-data': {
				'type': 'object',
				'properties': {
					'selfie_image': {
						'type': 'string',
						'format': 'binary',
						'description': 'Liveness selfie photo (JPEG/PNG, max 5 MB).',
					},
				},
				'required': ['selfie_image'],
			}
		},
		responses={
			201: FaceBiometricVerificationSerializer,
			404: OpenApiResponse(description='Identity document not found'),
			400: OpenApiResponse(description='Validation error'),
		},
		summary='Submit face for biometric verification',
		description=(
			'Upload a selfie image for liveness detection and face matching against the ID photo. '
			'Returns liveness_score + face_match_score. If both scores meet the configured thresholds, '
			'the document is auto-approved; otherwise it is flagged for admin review.'
		),
		parameters=[
			{
				'name': 'id',
				'in': 'path',
				'required': True,
				'schema': {'type': 'integer'},
				'description': 'Identity document ID',
			}
		],
	)
	def post(self, request, id):
		# Get the identity document
		try:
			doc = IdentityDocument.objects.get(pk=id, user=request.user)
		except IdentityDocument.DoesNotExist:
			return Response({'detail': 'Identity document not found.'}, status=status.HTTP_404_NOT_FOUND)

		# Check if a face verification already exists
		if hasattr(doc, 'face_verification'):
			return Response(
				{'detail': 'Face verification already submitted for this document.'},
				status=status.HTTP_400_BAD_REQUEST
			)

		# Parse and validate the selfie image
		serializer = FaceBiometricVerificationSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		# Create the FaceBiometricVerification record with the selfie
		face_verification = FaceBiometricVerification.objects.create(
			identity_document=doc,
			selfie_image=serializer.validated_data['selfie_image'],
			liveness_score=0.0,  # Will be populated by the task
			face_match_score=0.0,  # Will be populated by the task
		)

		# Queue the face verification task (non-blocking)
		try:
			from .tasks import run_face_verification
			run_face_verification.delay(face_verification.pk)
		except Exception:  # Celery may not be running in dev
			pass

		return Response(
			FaceBiometricVerificationSerializer(face_verification).data,
			status=status.HTTP_201_CREATED
		)


class ProviderManualVerificationUploadView(APIView):
	"""Provider-only endpoint to upload ID front, ID back, and selfie for manual review."""

	permission_classes = [permissions.IsAuthenticated, IsProvider]
	parser_classes = [MultiPartParser, FormParser]

	@extend_schema(
		tags=['Provider'],
		request=OpenApiRequest(
			request=ProviderManualVerificationUploadSerializer,
			encoding={
				'id_front_image': {'contentType': 'image/*'},
				'id_back_image': {'contentType': 'image/*'},
				'selfie_image': {'contentType': 'image/*'},
			},
		),
		responses={
			201: ProviderManualVerificationStatusSerializer,
			400: OpenApiResponse(description='Validation error'),
		},
		summary='Upload provider verification package (manual review)',
		description=(
			'Uploads ID front, ID back, and selfie for service providers only. '
			'Creates a manual verification record with pending status for admin review.'
		),
	)
	def post(self, request):
		serializer = ProviderManualVerificationUploadSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		verification = serializer.save(
			provider=request.user,
			status=ProviderManualVerification.STATUS_PENDING,
			rejection_reason='',
			reviewed_by=None,
			reviewed_at=None,
		)

		request.user.verification_status = User.STATUS_PENDING
		request.user.save(update_fields=['verification_status'])

		return Response(
			ProviderManualVerificationStatusSerializer(verification).data,
			status=status.HTTP_201_CREATED,
		)


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER ONBOARDING  (5-step signup flow)
# ─────────────────────────────────────────────────────────────────────────────

class ProviderOnboardingStep1View(APIView):
	"""Step 1: Upload identity document images and extract via OCR."""
	permission_classes = [permissions.AllowAny]
	parser_classes = [MultiPartParser, FormParser]
	
	@extend_schema(
		request=OpenApiRequest(
			request=OnboardingStep1Serializer,
			encoding={
				'front_image': {'contentType': 'image/*'},
				'back_image': {'contentType': 'image/*'},
			},
		),
		responses={201: inline_serializer('Step1Response', {
			'session_id': rest_framework_serializers.CharField(),
			'step': rest_framework_serializers.IntegerField(),
			'extracted_data': inline_serializer('Step1ExtractedData', {
				'full_name': rest_framework_serializers.CharField(allow_null=True, required=False),
				'id_number': rest_framework_serializers.CharField(allow_null=True, required=False),
				'date_of_birth': rest_framework_serializers.CharField(allow_null=True, required=False),
				'gender': rest_framework_serializers.CharField(allow_null=True, required=False),
				'nationality': rest_framework_serializers.CharField(allow_null=True, required=False),
				'region_sub_city': rest_framework_serializers.CharField(allow_null=True, required=False),
				'woreda': rest_framework_serializers.CharField(allow_null=True, required=False),
				'issue_date': rest_framework_serializers.CharField(allow_null=True, required=False),
				'expiry_date': rest_framework_serializers.CharField(allow_null=True, required=False),
				'phone_number': rest_framework_serializers.CharField(allow_null=True, required=False),
			}),
			'image_quality': rest_framework_serializers.FloatField(),
			'quality_warnings': rest_framework_serializers.ListField(),
			'ocr_confidence': rest_framework_serializers.FloatField(),
		})}
	)
	def post(self, request):
		"""Upload front/back document images and perform OCR extraction."""
		payload = {
			'document_type': request.data.get('document_type'),
			'front_image': request.FILES.get('front_image'),
			'back_image': request.FILES.get('back_image'),
		}
		serializer = OnboardingStep1Serializer(data=payload)
		serializer.is_valid(raise_exception=True)
		
		import uuid
		from .ocr_engine import get_ocr_engine
		
		# Create onboarding session
		session_id = str(uuid.uuid4())
		front_image = serializer.validated_data['front_image']
		back_image = serializer.validated_data['back_image']
		doc_type = serializer.validated_data['document_type']
		
		session = ProviderOnboardingSession.objects.create(
			session_id=session_id,
			step=1,
			front_image=front_image,
			back_image=back_image,
			document_type=doc_type,
			expires_at=timezone.now() + timedelta(hours=12)
		)
		
		# Perform OCR extraction (front from persisted file path)
		ocr_engine = get_ocr_engine()
		ocr_result_front = ocr_engine.extract_text(session.front_image.path, language='auto')

		# OCR extraction (back from temporary file path)
		back_tmp_path = None
		try:
			with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as back_tmp:
				for chunk in back_image.chunks():
					back_tmp.write(chunk)
				back_tmp_path = back_tmp.name
			ocr_result_back = ocr_engine.extract_text(back_tmp_path, language='auto')
		finally:
			if back_tmp_path and os.path.exists(back_tmp_path):
				os.remove(back_tmp_path)
		
		# Check document validation
		validation_front = ocr_result_front.get('validation', {})
		validation_back = ocr_result_back.get('validation', {}) if ocr_result_back else {}
		if validation_front.get('flagged') or validation_back.get('flagged'):
			is_expired = validation_front.get('is_expired', False) or validation_back.get('is_expired', False)
			is_non_ethiopian = validation_front.get('is_non_ethiopian', False) or validation_back.get('is_non_ethiopian', False)
			validation_errors = list(dict.fromkeys(
				(validation_front.get('errors', []) + validation_back.get('errors', []))
			))
			validation_warnings = list(dict.fromkeys(
				(validation_front.get('warnings', []) + validation_back.get('warnings', []))
			))
			non_critical_errors = [
				error for error in validation_errors
				if not error.lower().startswith('missing critical fields')
			]
			has_hard_failure = is_expired or is_non_ethiopian or len(non_critical_errors) > 0

			if is_non_ethiopian:
				user_message = 'Please upload a valid Ethiopian government-issued ID (front and back).'
			elif is_expired:
				user_message = 'Your ID appears expired. Please upload a valid, non-expired ID.'
			elif non_critical_errors:
				user_message = 'We could not validate this document. Please upload a clearer image of your ID (front and back).'
			else:
				user_message = 'Some details were not auto-detected. You can continue and review/edit extracted data in the next step.'

			if has_hard_failure:
				# Document is invalid - return detailed error
				error_details = {
					'error': 'Document validation failed',
					'user_message': user_message,
					'is_expired': is_expired,
					'is_non_ethiopian': is_non_ethiopian,
					'validation_errors': validation_errors,
					'validation_warnings': validation_warnings,
				}
				return Response(error_details, status=status.HTTP_400_BAD_REQUEST)

			# Non-blocking case: keep missing-field feedback as warnings and continue.
			ocr_result_front['quality_warnings'] = list(dict.fromkeys(
				(ocr_result_front.get('quality_warnings', []) or []) + validation_errors + validation_warnings
			))
		
		# Merge extracted fields (prefer front, fill missing from back)
		front_fields = ocr_result_front.get('extracted_fields', {}) or {}
		back_fields = ocr_result_back.get('extracted_fields', {}) or {}
		merged_fields = front_fields.copy()
		for key, value in back_fields.items():
			if merged_fields.get(key) in (None, '') and value not in (None, ''):
				merged_fields[key] = value

		def normalize_value(value):
			if value in ('', 'N/A', 'UNKNOWN', 'unknown'):
				return None
			return value

		# Store extracted data in the required structured format
		normalized_data = {
			'full_name': normalize_value(merged_fields.get('full_name') or merged_fields.get('name')),
			'id_number': normalize_value(merged_fields.get('id_number') or merged_fields.get('document_number')),
			'date_of_birth': normalize_value(merged_fields.get('date_of_birth') or merged_fields.get('dob')),
			'gender': normalize_value(merged_fields.get('gender') or merged_fields.get('sex')),
			'nationality': normalize_value(merged_fields.get('nationality')),
			'region_sub_city': normalize_value(merged_fields.get('region_sub_city') or merged_fields.get('region')),
			'woreda': normalize_value(merged_fields.get('woreda') or merged_fields.get('wereda') or merged_fields.get('district')),
			'issue_date': normalize_value(merged_fields.get('issue_date')),
			'expiry_date': normalize_value(merged_fields.get('expiry_date')),
			'phone_number': normalize_value(merged_fields.get('phone_number') or merged_fields.get('phone')),
		}

		session.extracted_data = normalized_data
		session.ocr_confidence = max(
			ocr_result_front.get('confidence', 0.0),
			ocr_result_back.get('confidence', 0.0) if ocr_result_back else 0.0,
		)
		session.image_quality = max(
			ocr_result_front.get('image_quality', 0.0),
			ocr_result_back.get('image_quality', 0.0) if ocr_result_back else 0.0,
		)
		session.quality_warnings = list(set(
			(ocr_result_front.get('quality_warnings', []) or []) +
			(ocr_result_back.get('quality_warnings', []) or [])
		))
		session.save()
		
		return Response({
			'session_id': session_id,
			'step': 1,
			'extracted_data': session.extracted_data,
			'image_quality': session.image_quality,
			'quality_warnings': session.quality_warnings,
			'ocr_confidence': session.ocr_confidence,
		}, status=status.HTTP_201_CREATED)


class ProviderOnboardingStep2View(APIView):
	"""Step 2: Review and confirm extracted OCR data."""
	permission_classes = [permissions.AllowAny]
	
	def post(self, request):
		"""Confirm OCR-extracted data (user can edit)."""
		serializer = OnboardingStep2Serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		try:
			session = ProviderOnboardingSession.objects.get(
				session_id=serializer.validated_data['session_id'],
				status='in_progress'
			)
		except ProviderOnboardingSession.DoesNotExist:
			return Response({'error': 'Invalid or expired session'}, status=400)
		
		if session.is_expired:
			return Response({'error': 'Session expired'}, status=400)
		
		# Store user-confirmed data
		session.confirmed_data = serializer.validated_data['confirmed_data']
		session.step = 2
		session.save()
		
		return Response({
			'session_id': session.session_id,
			'step': 2,
			'confirmed_data': session.confirmed_data,
			'next_step': 3,
		}, status=status.HTTP_200_OK)


class ProviderOnboardingStep3OTPRequestView(APIView):
	"""Step 3a: Request OTP to extracted or manually-provided phone."""
	permission_classes = [permissions.AllowAny]
	
	@extend_schema(
		request=OnboardingStep3OTPRequestSerializer,
		responses={200: inline_serializer('OTPSentResponse', {
			'detail': rest_framework_serializers.CharField(),
			'otp_code': rest_framework_serializers.CharField(),  # DEBUG only
		})},
		tags=['Provider Onboarding'],
	)
	def post(self, request):
		"""Send OTP to phone (extracted or custom)."""
		serializer = OnboardingStep3OTPRequestSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		try:
			session = ProviderOnboardingSession.objects.get(
				session_id=serializer.validated_data['session_id'],
				status='in_progress'
			)
		except ProviderOnboardingSession.DoesNotExist:
			return Response(
				{'error': 'Invalid or expired session.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if session.is_expired:
			return Response(
				{'error': 'Session expired. Please start over.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		# Determine phone: use manually provided or confirmed/extracted
		phone_number = serializer.validated_data.get('phone_for_verification')
		if not phone_number:
			confirmed = session.confirmed_data or session.extracted_data or {}
			phone_number = confirmed.get('phone')
		
		if not phone_number:
			return Response(
				{'error': 'Phone number not extracted. Please provide phone_for_verification.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		# Issue OTP
		otp_code = _issue_otp(
			phone_number=phone_number,
			purpose=PhoneOTP.PURPOSE_REGISTER,
			role=User.ROLE_PROVIDER,
		)
		
		# Store phone in session
		session.phone_for_verification = phone_number
		session.save()
		
		response_data = {
			'detail': f'OTP sent to {phone_number}',
		}
		
		if settings.DEBUG:
			response_data['otp_code'] = otp_code
		
		return Response(response_data, status=status.HTTP_200_OK)


class ProviderOnboardingStep3OTPVerifyView(APIView):
	"""Step 3b: Verify OTP and create provider account."""
	permission_classes = [permissions.AllowAny]
	
	@extend_schema(
		request=OnboardingStep3OTPVerifySerializer,
		responses={201: AuthTokenSerializer},
		tags=['Provider Onboarding'],
	)
	def post(self, request):
		"""Verify OTP and create provider account."""
		serializer = OnboardingStep3OTPVerifySerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		session_id = serializer.validated_data['session_id']
		otp_code = serializer.validated_data['otp_code']
		
		try:
			session = ProviderOnboardingSession.objects.get(
				session_id=session_id,
				status='in_progress'
			)
		except ProviderOnboardingSession.DoesNotExist:
			return Response(
				{'error': 'Invalid or expired session.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if session.is_expired:
			return Response(
				{'error': 'Session expired. Please start over.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		# Verify OTP
		try:
			phone_otp_obj = _verify_otp(
				phone_number=session.phone_for_verification or session.extracted_data.get('phone'),
				purpose=PhoneOTP.PURPOSE_REGISTER,
				otp_code=otp_code,
			)
		except ValueError as e:
			return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
		
		# Create account (atomic transaction)
		with transaction.atomic():
			# Extract name from confirmed data or OCR data
			confirmed = session.confirmed_data or session.extracted_data or {}
			name_str = confirmed.get('name', '')
			name_parts = name_str.split()
			first_name = name_parts[0] if name_parts else ''
			last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
			
			phone_number = session.phone_for_verification or confirmed.get('phone', '')
			
			# Create User account
			username = _unique_username(phone_number.replace('+', '').replace(' ', ''))
			user = User.objects.create_user(
				username=username,
				phone_number=phone_number,
				first_name=first_name,
				last_name=last_name,
				role=User.ROLE_PROVIDER,
				verification_status=User.STATUS_PENDING,  # Provider stays pending until face verified
				is_on_trial=True,
				trial_ends_at=timezone.now() + timedelta(days=14),
			)
			
			# Create IdentityDocument record
			IdentityDocument.objects.create(
				user=user,
				doc_type=session.document_type,
				document_url=session.front_image,
				ocr_confidence=session.ocr_confidence,
				ocr_extracted=session.extracted_data,
				extracted_name=confirmed.get('name'),
				extracted_id_number=confirmed.get('document_number'),
				extracted_dob=confirmed.get('dob'),
				extracted_expiry=confirmed.get('expiry_date'),
				extracted_nationality=confirmed.get('nationality'),
				status=IdentityDocument.STATUS_PENDING,
			)
			
			# Create ProviderProfile
			ProviderProfile.objects.create(user=user)
			
			# Mark session as completed
			session.status = 'completed'
			session.completed_at = timezone.now()
			session.phone_verified = True
			session.save()
			
			# Generate JWT tokens
			refresh = RefreshToken.from_user(user)
		
		return Response({
			'access': str(refresh.access_token),
			'refresh': str(refresh),
			'user': UserProfileSerializer(user).data,
			'message': 'Welcome! Your account is created. Next, verify your identity with a selfie (Step 4).',
		}, status=status.HTTP_201_CREATED)


class ProviderOnboardingStep4View(APIView):
	"""Step 4: Submit selfie for face biometric verification."""
	permission_classes = [permissions.AllowAny]
	parser_classes = [MultiPartParser, FormParser]
	
	@extend_schema(
		request=OnboardingStep4Serializer,
		responses={201: inline_serializer('Step4Response', {
			'session_id': rest_framework_serializers.CharField(),
			'step': rest_framework_serializers.IntegerField(),
			'liveness_score': rest_framework_serializers.FloatField(),
			'face_match_score': rest_framework_serializers.FloatField(),
			'status': rest_framework_serializers.CharField(),
		})}
	)
	def post(self, request):
		"""Submit selfie for face verification."""
		serializer = OnboardingStep4Serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		try:
			session = ProviderOnboardingSession.objects.get(
				session_id=serializer.validated_data['session_id'],
				status='in_progress'
			)
		except:
			return Response({'error': 'Invalid session'}, status=400)
		
		if session.is_expired or not session.phone_verified:
			return Response({'error': 'Session invalid or phone not verified'}, status=400)
		
		# Store selfie
		session.selfie_file = serializer.validated_data['selfie_image']
		session.step = 4
		session.save()
		
		# Perform face verification synchronously for now
		from .face_verification import get_face_engine
		face_engine = get_face_engine()
		
		# Check liveness
		liveness_result = face_engine.check_liveness(session.selfie_file.path)
		session.liveness_score = liveness_result.get('liveness_score', 0.0)
		
		# Compare faces
		face_match_result = face_engine.compare_faces(
			id_photo_path=session.front_image.path,
			selfie_image_path=session.selfie_file.path
		)
		session.face_match_score = face_match_result.get('face_match_score', 0.0)
		
		# Determine if auto-approved
		liveness_threshold = float(settings.FACE_LIVENESS_THRESHOLD)
		match_threshold = float(settings.FACE_MATCH_THRESHOLD)
		
		if session.liveness_score >= liveness_threshold and session.face_match_score >= match_threshold:
			session.face_verified = True
			status_val = 'approved'
		else:
			status_val = 'flagged'
		
		session.save()
		
		return Response({
			'session_id': session.session_id,
			'step': 4,
			'liveness_score': session.liveness_score,
			'face_match_score': session.face_match_score,
			'status': status_val,
			'next_step': 5,
		}, status=status.HTTP_201_CREATED)


class ProviderOnboardingStep5View(APIView):
	"""Step 5: Complete profile setup and create account."""
	permission_classes = [permissions.AllowAny]
	
	@transaction.atomic
	def post(self, request):
		"""Complete onboarding: create user, documents, profile."""
		serializer = OnboardingStep5Serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		try:
			session = ProviderOnboardingSession.objects.get(
				session_id=serializer.validated_data['session_id'],
				status='in_progress'
			)
		except:
			return Response({'error': 'Invalid session'}, status=400)
		
		if session.is_expired or not session.phone_verified or not session.face_verified:
			return Response(
				{'error': 'Session incomplete or failed verification'},
				status=400
			)
		
		# Store profile info in session
		session.bio = serializer.validated_data.get('bio', '')
		session.address = serializer.validated_data['address']
		session.years_of_experience = serializer.validated_data['years_of_experience']
		session.price_min = serializer.validated_data['price_min']
		session.price_max = serializer.validated_data['price_max']
		session.service_category = ServiceCategory.objects.get(
			id=serializer.validated_data['service_category_id']
		)
		session.service_ids = serializer.validated_data['service_ids']
		session.step = 5
		session.save()
		
		# 1. Create User
		phone = session.confirmed_data['phone']
		username = _unique_username(session.confirmed_data['name'].lower().replace(' ', '_'))
		
		user = User.objects.create_user(
			username=username,
			phone_number=phone,
			role='provider',
			is_active=True,
			is_on_trial=True,
			trial_ends_at=timezone.now() + timedelta(days=30),
			biometric_verified=True,
		)
		
		# 2. Create permanent IdentityDocument
		identity_doc = IdentityDocument.objects.create(
			user=user,
			doc_type=session.document_type,
			document_url=session.front_image,
			biometric_selfie=session.selfie_file,
			status='approved',
			auto_verified=True,
			ocr_confidence=session.ocr_confidence,
			extracted_name=session.confirmed_data.get('name'),
			extracted_id_number=session.confirmed_data.get('id_number'),
			extracted_dob=session.confirmed_data.get('dob'),
			extracted_nationality=session.confirmed_data.get('nationality'),
		)
		
		# 3. Create FaceBiometricVerification
		FaceBiometricVerification.objects.create(
			identity_document=identity_doc,
			selfie_image=session.selfie_file,
			liveness_score=session.liveness_score,
			face_match_score=session.face_match_score,
			status='approved',
			auto_verified=True,
		)
		
		# 4. Create ProviderProfile
		provider_profile = ProviderProfile.objects.create(
			user=user,
			bio=session.bio,
			address=session.address,
			years_of_experience=session.years_of_experience,
			price_min=session.price_min,
			price_max=session.price_max,
			is_available=True,
			is_online=False,
		)
		
		# 5. Create ProviderService (with categories)
		provider_service = ProviderService.objects.create(
			provider=provider_profile,
			primary_service=session.service_category
		)
		# Add sub-services
		subservices = SubService.objects.filter(id__in=session.service_ids)
		provider_service.subservices.set(subservices)
		
		# 6. Mark session as completed
		session.status = 'completed'
		session.completed_at = timezone.now()
		session.save()
		
		# 7. Generate JWT tokens
		refresh = RefreshToken.from_user(user)
		
		return Response({
			'access': str(refresh.access_token),
			'refresh': str(refresh),
			'user': UserProfileSerializer(user).data,
			'provider_profile': ProviderProfileSerializer(provider_profile).data,
			'message': 'Welcome! Your account is fully verified. Go online when ready!',
		}, status=status.HTTP_201_CREATED)


class ServiceCategoryListView(APIView):
	"""List all available service categories."""
	permission_classes = [permissions.AllowAny]
	
	def get(self, request):
		"""Get all service categories."""
		categories = ServiceCategory.objects.filter(is_active=True)
		serializer = ServiceCategorySerializer(categories, many=True)
		return Response(serializer.data)


class SubServiceListView(APIView):
	"""List sub-services for a category."""
	permission_classes = [permissions.AllowAny]
	
	def get(self, request, category_id):
		"""Get sub-services for a category."""
		subservices = SubService.objects.filter(
			category_id=category_id,
			is_active=True
		)
		serializer = SubServiceSerializer(subservices, many=True)
		return Response(serializer.data)


class ProviderProfileSetupView(APIView):
	"""Create/update authenticated provider profile and offered services."""
	permission_classes = [permissions.IsAuthenticated, IsProvider]
	parser_classes = [MultiPartParser, FormParser]

	@extend_schema(
		tags=['Provider'],
		request=ProviderProfileSetupSerializer,
		responses={
			200: inline_serializer(
				'ProviderProfileSetupResponse',
				{
					'user_id': rest_framework_serializers.IntegerField(),
					'phone_number': rest_framework_serializers.CharField(),
					'full_name': rest_framework_serializers.CharField(),
					'service_category': rest_framework_serializers.CharField(),
					'sub_services': rest_framework_serializers.ListField(child=rest_framework_serializers.CharField()),
					'price_min': rest_framework_serializers.IntegerField(),
					'price_max': rest_framework_serializers.IntegerField(),
					'bio': rest_framework_serializers.CharField(allow_blank=True),
					'profile_picture': rest_framework_serializers.CharField(allow_blank=True, required=False),
					'profile_completed': rest_framework_serializers.BooleanField(),
					'message': rest_framework_serializers.CharField(),
				},
			),
			400: OpenApiResponse(description='Validation error.'),
			401: OpenApiResponse(description='Authentication required.'),
			403: OpenApiResponse(description='Only service providers can perform this action.'),
		},
		summary='Provider profile setup',
		description='Create or update the authenticated service provider profile before identity upload.',
	)

	@transaction.atomic
	def post(self, request):
		serializer = ProviderProfileSetupSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		vd = serializer.validated_data

		def _ensure_unique_slug(model_cls, base_name: str) -> str:
			base_slug = slugify(base_name) or 'item'
			slug = base_slug
			counter = 1
			while model_cls.objects.filter(slug=slug).exists():
				slug = f'{base_slug}-{counter}'
				counter += 1
			return slug

		full_name = vd['full_name']
		category_name = vd['service_category']
		sub_service_names = vd['sub_services']

		# Keep user name in sync with provider profile setup.
		name_parts = full_name.split()
		request.user.first_name = name_parts[0] if name_parts else ''
		request.user.last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
		request.user.save(update_fields=['first_name', 'last_name'])

		provider_profile, _ = ProviderProfile.objects.get_or_create(user=request.user)
		provider_profile.bio = vd.get('bio', '')
		provider_profile.price_min = vd['price_min']
		provider_profile.price_max = vd['price_max']
		if vd.get('profile_picture') is not None:
			provider_profile.profile_picture = vd['profile_picture']
		provider_profile.profile_completed = True
		provider_profile.save()

		service_category = ServiceCategory.objects.filter(name__iexact=category_name).first()
		if not service_category:
			service_category = ServiceCategory.objects.create(
				name=category_name,
				slug=_ensure_unique_slug(ServiceCategory, category_name),
				is_active=True,
			)

		sub_service_objects = []
		for sub_name in sub_service_names:
			sub_service = SubService.objects.filter(
				category=service_category,
				name__iexact=sub_name,
			).first()
			if not sub_service:
				sub_service = SubService.objects.create(
					category=service_category,
					name=sub_name,
					slug=_ensure_unique_slug(SubService, sub_name),
					is_active=True,
				)
			sub_service_objects.append(sub_service)

		provider_service, _ = ProviderService.objects.get_or_create(provider=provider_profile)
		provider_service.primary_service = service_category
		provider_service.save()
		provider_service.subservices.set(sub_service_objects)

		profile_picture_url = ''
		if provider_profile.profile_picture:
			try:
				profile_picture_url = request.build_absolute_uri(provider_profile.profile_picture.url)
			except Exception:
				profile_picture_url = provider_profile.profile_picture.url

		return Response(
			{
				'user_id': request.user.id,
				'phone_number': request.user.phone_number,
				'full_name': full_name,
				'service_category': service_category.name,
				'sub_services': [item.name for item in sub_service_objects],
				'price_min': vd['price_min'],
				'price_max': vd['price_max'],
				'bio': provider_profile.bio,
				'profile_picture': profile_picture_url,
				'profile_completed': provider_profile.profile_completed,
				'message': 'Profile setup completed successfully. Proceed to identity upload.',
			},
			status=status.HTTP_200_OK,
		)


# ─────────────────────────────────────────────────────────────────────────────
# CLIENT ONBOARDING — Unified with Provider (but simpler: no face verification)
#
# FLOW:
#  Step 1: Upload document + OCR (unauthenticated)
#  Step 2: Confirm OCR data
#  Step 3: Request OTP + Verify OTP → Create account
#  Step 4 (optional): Update profile
# ─────────────────────────────────────────────────────────────────────────────

class ClientOnboardingStep1View(APIView):
	"""Step 1: Upload identity document and run OCR extraction."""
	permission_classes = [permissions.AllowAny]
	parser_classes = [MultiPartParser, FormParser]
	
	@extend_schema(
		request=OnboardingStep1Serializer,  # Reuse provider serializer
		responses={201: inline_serializer(
			name='ClientStep1Response',
			fields={
				'message': rest_framework_serializers.CharField(),
				'session_id': rest_framework_serializers.CharField(),
				'extracted_data': rest_framework_serializers.JSONField(),
				'image_quality': rest_framework_serializers.FloatField(),
				'quality_warnings': rest_framework_serializers.ListField(),
			}
		)},
		tags=['Client Onboarding'],
	)
	def post(self, request):
		"""Upload document and run OCR extraction (like provider Step 1)."""
		from .ocr_engine import get_ocr_engine
		import uuid
		
		serializer = OnboardingStep1Serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		document_type = serializer.validated_data['document_type']
		document_file = serializer.validated_data['document_file']
		
		# Create client onboarding session
		session_id = str(uuid.uuid4())
		session = ClientOnboardingSession.objects.create(
			session_id=session_id,
			document_type=document_type,
			document_file=document_file,
			expires_at=timezone.now() + timedelta(hours=6),
		)
		
		# Run OCR
		try:
			ocr_engine = get_ocr_engine()
			ocr_result = ocr_engine.extract_text(document_file.path, language='auto')
			
			# Check document validation
			validation = ocr_result.get('validation', {})
			if validation.get('flagged'):
				is_expired = validation.get('is_expired', False)
				is_non_ethiopian = validation.get('is_non_ethiopian', False)
				validation_errors = list(dict.fromkeys(validation.get('errors', [])))
				validation_warnings = list(dict.fromkeys(validation.get('warnings', [])))
				non_critical_errors = [
					error for error in validation_errors
					if not error.lower().startswith('missing critical fields')
				]
				has_hard_failure = is_expired or is_non_ethiopian or len(non_critical_errors) > 0

				if is_non_ethiopian:
					user_message = 'Please upload a valid Ethiopian government-issued ID.'
				elif is_expired:
					user_message = 'Your ID appears expired. Please upload a valid, non-expired ID.'
				elif non_critical_errors:
					user_message = 'We could not validate this document. Please upload a clearer image of your ID.'
				else:
					user_message = 'Some details were not auto-detected. You can continue and review/edit extracted data in the next step.'

				if has_hard_failure:
					# Document is invalid - return detailed error
					error_details = {
						'error': 'Document validation failed',
						'user_message': user_message,
						'is_expired': is_expired,
						'is_non_ethiopian': is_non_ethiopian,
						'validation_errors': validation_errors,
						'validation_warnings': validation_warnings,
					}
					return Response(error_details, status=status.HTTP_400_BAD_REQUEST)

				# Non-blocking case: keep missing-field feedback as warnings and continue.
				ocr_result['quality_warnings'] = list(dict.fromkeys(
					(ocr_result.get('quality_warnings', []) or []) + validation_errors + validation_warnings
				))
			
			# Store OCR results
			session.extracted_data = ocr_result.get('extracted_fields', {})
			session.ocr_confidence = ocr_result.get('confidence', 0.0)
			session.image_quality = ocr_result.get('image_quality', 0.0)
			session.quality_warnings = ocr_result.get('quality_warnings', [])
			session.save()
		except Exception as e:
			return Response(
				{'error': f'OCR extraction failed: {str(e)}'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		return Response({
			'message': 'Document uploaded and processed successfully.',
			'session_id': session_id,
			'extracted_data': session.extracted_data,
			'image_quality': session.image_quality,
			'quality_warnings': session.quality_warnings,
		}, status=status.HTTP_201_CREATED)


class ClientOnboardingStep2View(APIView):
	"""Step 2: Confirm OCR-extracted data."""
	permission_classes = [permissions.AllowAny]
	
	@extend_schema(
		request=OnboardingStep2Serializer,  # Reuse provider serializer
		responses={200: inline_serializer(
			name='ClientStep2Response',
			fields={
				'message': rest_framework_serializers.CharField(),
				'confirmed_data': rest_framework_serializers.JSONField(),
			}
		)},
		tags=['Client Onboarding'],
	)
	def post(self, request):
		"""Confirm OCR-extracted data (like provider Step 2)."""
		serializer = OnboardingStep2Serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		session_id = serializer.validated_data['session_id']
		confirmed_data = serializer.validated_data.get('confirmed_data', {})
		
		try:
			session = ClientOnboardingSession.objects.get(
				session_id=session_id,
				status='in_progress',
			)
		except ClientOnboardingSession.DoesNotExist:
			return Response(
				{'error': 'Invalid or expired session.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if session.is_expired:
			return Response(
				{'error': 'Session expired. Please start over.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		# Store confirmed data
		session.confirmed_data = confirmed_data
		session.save()
		
		return Response({
			'message': 'Data confirmed successfully.',
			'confirmed_data': session.confirmed_data,
		}, status=status.HTTP_200_OK)


class ClientOnboardingStep3OTPRequestView(APIView):
	"""Step 3: Request OTP for phone verification."""
	permission_classes = [permissions.AllowAny]
	
	@extend_schema(
		request=OnboardingStep3OTPRequestSerializer,  # Reuse provider serializer
		responses={200: OTPSentSerializer},
		tags=['Client Onboarding'],
	)
	def post(self, request):
		"""Request OTP to verify phone (like provider Step 3)."""
		serializer = OnboardingStep3OTPRequestSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		session_id = serializer.validated_data['session_id']
		phone_for_verification = serializer.validated_data.get('phone_for_verification')
		
		try:
			session = ClientOnboardingSession.objects.get(
				session_id=session_id,
				status='in_progress',
			)
		except ClientOnboardingSession.DoesNotExist:
			return Response(
				{'error': 'Invalid or expired session.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if session.is_expired:
			return Response(
				{'error': 'Session expired. Please start over.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		# Use extraction phone or override
		if phone_for_verification:
			phone_number = phone_for_verification
		elif session.extracted_data and 'phone' in session.extracted_data:
			phone_number = session.extracted_data['phone']
		else:
			return Response(
				{'error': 'Phone number not extracted. Please provide phone_for_verification.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		# Issue OTP
		otp_code = _issue_otp(
			phone_number=phone_number,
			purpose=PhoneOTP.PURPOSE_REGISTER,
			role=User.ROLE_CLIENT,
		)
		
		# Store phone in session
		session.phone_for_verification = phone_number
		session.save()
		
		response_data = {
			'detail': f'OTP sent to {phone_number}',
		}
		
		if settings.DEBUG:
			response_data['otp_code'] = otp_code
		
		return Response(response_data, status=status.HTTP_200_OK)


class ClientOnboardingStep3OTPVerifyView(APIView):
	"""Step 3: Verify OTP and create client account."""
	permission_classes = [permissions.AllowAny]
	
	@extend_schema(
		request=OnboardingStep3OTPVerifySerializer,  # Reuse provider serializer
		responses={201: AuthTokenSerializer},
		tags=['Client Onboarding'],
	)
	def post(self, request):
		"""Verify OTP and create client account (like provider Step 3)."""
		serializer = OnboardingStep3OTPVerifySerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		session_id = serializer.validated_data['session_id']
		otp_code = serializer.validated_data['otp_code']
		
		try:
			session = ClientOnboardingSession.objects.get(
				session_id=session_id,
				status='in_progress',
			)
		except ClientOnboardingSession.DoesNotExist:
			return Response(
				{'error': 'Invalid or expired session.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if session.is_expired:
			return Response(
				{'error': 'Session expired. Please start over.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if not session.phone_for_verification:
			return Response(
				{'error': 'Please complete Step 3 OTP request first.'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		# Verify OTP
		try:
			phone_otp_obj = _verify_otp(
				phone_number=session.phone_for_verification,
				purpose=PhoneOTP.PURPOSE_REGISTER,
				otp_code=otp_code,
			)
		except ValueError as e:
			return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
		
		# Create account (atomic transaction)
		with transaction.atomic():
			# Extract name from confirmed data or OCR data
			confirmed = session.confirmed_data or session.extracted_data or {}
			first_name = confirmed.get('name', '').split()[0] if confirmed.get('name') else ''
			last_name = confirmed.get('name', '').split()[1] if confirmed.get('name', '').split().__len__() > 1 else ''
			
			# Create User account
			username = _unique_username(session.phone_for_verification.replace('+', ''))
			user = User.objects.create_user(
				username=username,
				phone_number=session.phone_for_verification,
				first_name=first_name,
				last_name=last_name,
				role=User.ROLE_CLIENT,
				verification_status=User.STATUS_VERIFIED,
			)
			
			# Mark session as completed
			session.status = 'completed'
			session.completed_at = timezone.now()
			session.phone_verified = True
			session.save()
			
			# Generate JWT tokens
			refresh = RefreshToken.from_user(user)
		
		return Response({
			'access': str(refresh.access_token),
			'refresh': str(refresh),
			'user': UserProfileSerializer(user).data,
			'message': 'Welcome! Your account is ready. You can now start booking services.',
		}, status=status.HTTP_201_CREATED)


class ClientOnboardingStep4ProfileView(APIView):
	"""Step 4 (Optional): Update profile with additional information."""
	permission_classes = [permissions.IsAuthenticated]
	
	@extend_schema(
		request=ClientOnboardingProfileUpdateSerializer,
		responses={200: UserProfileSerializer},
		tags=['Client Onboarding'],
	)
	def post(self, request):
		"""Update client profile with confirmed/additional info."""
		serializer = ClientOnboardingProfileUpdateSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		first_name = serializer.validated_data.get('first_name', '')
		last_name = serializer.validated_data.get('last_name', '')
		address = serializer.validated_data.get('address', '')
		
		# Update user
		user = request.user
		if first_name:
			user.first_name = first_name
		if last_name:
			user.last_name = last_name
		user.save(update_fields=['first_name', 'last_name'])
		
		return Response({
			'message': 'Profile updated successfully.',
			'user': UserProfileSerializer(user).data,
		}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# OCR TEST ENDPOINT — For development/testing only
# ─────────────────────────────────────────────────────────────────────────────

class OCRTestView(APIView):
	"""
	Test OCR extraction on identity documents without creating full signup flow.
	
	DEVELOPMENT ONLY: Allows testing OCR engine on various document types.
	
	Accepts:
	  - doc_type: one of 'national_id', 'drivers_license', 'kebele_id'
	  - document: image file (JPEG, PNG, PDF)
	
	Returns:
	  - extracted_fields (standardized)
	  - confidence score
	  - validation results
	"""
	
	permission_classes = [permissions.AllowAny]  # Allow unauthenticated for testing
	parser_classes = [MultiPartParser, FormParser]
	
	@extend_schema(
		tags=['Testing'],
		request={
			'multipart/form-data': {
				'type': 'object',
				'properties': {
					'doc_type': {
						'type': 'string',
						'enum': ['national_id', 'drivers_license', 'kebele_id'],
						'description': 'Type of identity document',
					},
					'document': {
						'type': 'string',
						'format': 'binary',
						'description': 'Identity document image (JPEG, PNG, or PDF)',
					},
				},
				'required': ['doc_type', 'document'],
			}
		},
		responses={
			200: OpenApiResponse(description='OCR extraction successful'),
			400: OpenApiResponse(description='Invalid document type or file format'),
			500: OpenApiResponse(description='OCR processing error'),
		},
		summary='Test OCR extraction (debugging only)',
		description=(
			'Test the OCR engine on identity documents without creating a full identity document record. '
			'Returns extracted fields, confidence score, and validation results. '
			'ONLY for testing and debugging; do not use in production workflows.'
		),
	)
	def post(self, request):
		"""Extract OCR data from an uploaded identity document for testing."""
		import os
		import tempfile
		
		doc_type = request.data.get('doc_type')
		document = request.data.get('document')
		
		# Validate doc_type
		if not doc_type:
			return Response(
				{'error': 'doc_type is required'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if doc_type not in IdentityDocument.SUPPORTED_TYPES:
			return Response(
				{
					'error': f'Unsupported document type: {doc_type}',
					'supported_types': list(IdentityDocument.SUPPORTED_TYPES)
				},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		# Validate file
		if not document:
			return Response(
				{'error': 'document file is required'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if document.content_type not in {'image/jpeg', 'image/png', 'application/pdf', 'image/webp'}:
			return Response(
				{
					'error': f'Unsupported file type: {document.content_type}',
					'allowed_types': ['image/jpeg', 'image/png', 'application/pdf']
				},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		try:
			# Create temporary file for OCR processing
			with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
				# Write file chunks
				if hasattr(document, 'chunks'):
					for chunk in document.chunks():
						tmp_file.write(chunk)
				else:
					tmp_file.write(document.read())
				
				tmp_path = tmp_file.name
			
			try:
				# Initialize OCR engine and extract text
				from .ocr_engine import get_ocr_engine
				import logging
				logger = logging.getLogger(__name__)
				
				ocr_engine = get_ocr_engine()
				logger.info(f'Testing OCR with {ocr_engine.__class__.__name__} on {doc_type}')
				
				ocr_result = ocr_engine.extract_text(tmp_path, language='auto')
				
				# Return standardized results
				return Response(
					{
						'doc_type': doc_type,
						'ocr_result': {
							'extracted_fields': ocr_result.get('extracted_fields', {}),
							'confidence': ocr_result.get('confidence', 0.0),
							'language': ocr_result.get('language', 'auto'),
							'raw_text_preview': ocr_result.get('raw_text', '')[:200],  # First 200 chars
							'warnings': ocr_result.get('warnings', []),
							'validation': ocr_result.get('validation', {}),
						}
					},
					status=status.HTTP_200_OK
				)
				
			finally:
				# Clean up temp file
				if os.path.exists(tmp_path):
					os.remove(tmp_path)
		
		except Exception as e:
			import logging
			logger = logging.getLogger(__name__)
			logger.exception(f'OCR test error: {e}')
			return Response(
				{
					'error': 'OCR processing failed',
					'detail': str(e)
				},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)
