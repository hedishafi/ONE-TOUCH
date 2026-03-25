import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import permissions, serializers as rest_framework_serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView

from .models import (
	IdentityDocument, PhoneOTP, ProviderProfile, ClientProfile, FaceBiometricVerification,
	ProviderOnboardingSession, ServiceCategory, SubService, ProviderService, ClientOnboardingSession
)
from .permissions import IsProvider, IsClient
from .serializers import (
	AuthTokenSerializer,
	ClientProfileSerializer,
	FaceBiometricVerificationSerializer,
	IdentityDocumentSerializer,
	LoginOTPRequestSerializer,
	LoginVerifySerializer,
	OTPSentSerializer,
	ProviderProfileSerializer,
	SignupOTPRequestSerializer,
	SignupVerifySerializer,
	UserProfileSerializer,
	ServiceCategorySerializer,
	SubServiceSerializer,
	OnboardingStep1Serializer,
	OnboardingStep2Serializer,
	OnboardingStep3OTPRequestSerializer,
	OnboardingStep3OTPVerifySerializer,
	OnboardingStep4Serializer,
	OnboardingStep5Serializer,
	ClientOnboardingProfileUpdateSerializer,
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


def _issue_otp(phone_number: str, purpose: str, **meta) -> str:
	"""Invalidate old OTPs, create a new one (persist optional meta) and return the code."""
	_invalidate_previous_otps(phone_number, purpose)
	code = _generate_otp()
	PhoneOTP.objects.create(
		phone_number=phone_number,
		purpose=purpose,
		code=code,
		expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
		role=meta.get('role'),
		username=meta.get('username', '') or '',
		first_name=meta.get('first_name', '') or '',
		last_name=meta.get('last_name', '') or '',
	)
	return code


def _verify_otp(phone_number: str, purpose: str, otp_code: str):
	"""
	Validate `otp_code` against the latest unused OTP for this phone+purpose.

	Returns the `PhoneOTP` instance on success.
	Raises `ValueError` with a human-readable message on failure.
	"""
	phone_number = phone_number.strip()
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
			otp = _verify_otp(phone_number, PhoneOTP.PURPOSE_REGISTER, otp_code)
		except ValueError as exc:
			return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

		# Use values persisted on the OTP record (from OCR/extraction) as primary
		# but allow the client to override if they provide values in the verify call.
		role = request.data.get('role') or otp.role or User.ROLE_CLIENT
		username = request.data.get('username') or otp.username or phone_number
		first_name = request.data.get('first_name') or otp.first_name or ''
		last_name = request.data.get('last_name') or otp.last_name or ''

		if User.objects.filter(phone_number=phone_number).exists():
			return Response(
				{'detail': 'This phone number is already registered.'},
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


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER PROFILE  GET / POST / PATCH /api/v1/provider/profile/
# ─────────────────────────────────────────────────────────────────────────────

class ProviderProfileView(APIView):
	"""Create, retrieve, or partially update the authenticated provider's profile."""

	permission_classes = [permissions.IsAuthenticated, IsProvider]

	@extend_schema(
		tags=['Provider'],
		responses={200: ProviderProfileSerializer},
		summary='Get my provider profile',
	)
	def get(self, request):
		try:
			profile = request.user.provider_profile
		except ProviderProfile.DoesNotExist:
			return Response({'detail': 'Profile not created yet.'}, status=status.HTTP_404_NOT_FOUND)
		return Response(ProviderProfileSerializer(profile).data)

	@extend_schema(
		tags=['Provider'],
		request=ProviderProfileSerializer,
		responses={201: ProviderProfileSerializer},
		summary='Create provider profile',
		description='Creates the ProviderProfile for the authenticated provider. Only allowed once.',
	)
	def post(self, request):
		if ProviderProfile.objects.filter(user=request.user).exists():
			return Response({'detail': 'Profile already exists. Use PATCH to update.'}, status=status.HTTP_400_BAD_REQUEST)
		serializer = ProviderProfileSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		serializer.save(user=request.user)
		return Response(serializer.data, status=status.HTTP_201_CREATED)

	@extend_schema(
		tags=['Provider'],
		request=ProviderProfileSerializer,
		responses={200: ProviderProfileSerializer},
		summary='Update provider profile',
	)
	def patch(self, request):
		try:
			profile = request.user.provider_profile
		except ProviderProfile.DoesNotExist:
			return Response({'detail': 'Profile not found. POST to create one first.'}, status=status.HTTP_404_NOT_FOUND)
		serializer = ProviderProfileSerializer(profile, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# CLIENT PROFILE  GET / PATCH /api/v1/client/profile/
# ─────────────────────────────────────────────────────────────────────────────

class ClientProfileView(APIView):
	"""Retrieve or partially update the authenticated client's profile."""

	permission_classes = [permissions.IsAuthenticated, IsClient]

	@extend_schema(
		tags=['Client'],
		responses={200: ClientProfileSerializer},
		summary='Get my client profile',
		description='Requires client role. Returns wallet balance, loyalty tier, and booking stats.',
	)
	def get(self, request):
		try:
			profile = request.user.client_profile
		except ClientProfile.DoesNotExist:
			return Response({'detail': 'Client profile not found.'}, status=status.HTTP_404_NOT_FOUND)
		return Response(ClientProfileSerializer(profile).data)

	@extend_schema(
		tags=['Client'],
		request=ClientProfileSerializer,
		responses={200: ClientProfileSerializer},
		summary='Update my client profile',
		description='Allows updating profile information. Wallet and stats are read-only.',
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


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER ONBOARDING  (5-step signup flow)
# ─────────────────────────────────────────────────────────────────────────────

class ProviderOnboardingStep1View(APIView):
	"""Step 1: Upload identity document and extract via OCR."""
	permission_classes = [permissions.AllowAny]
	parser_classes = [MultiPartParser, FormParser]
	
	@extend_schema(
		request=OnboardingStep1Serializer,
		responses={201: inline_serializer('Step1Response', {
			'session_id': rest_framework_serializers.CharField(),
			'step': rest_framework_serializers.IntegerField(),
			'extracted_data': rest_framework_serializers.JSONField(),
			'image_quality': rest_framework_serializers.FloatField(),
			'quality_warnings': rest_framework_serializers.ListField(),
			'ocr_confidence': rest_framework_serializers.FloatField(),
		})}
	)
	def post(self, request):
		"""Upload document and perform OCR extraction."""
		serializer = OnboardingStep1Serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		
		import uuid
		from .ocr_engine import get_ocr_engine
		
		# Create onboarding session
		session_id = str(uuid.uuid4())
		doc_file = serializer.validated_data['document_file']
		doc_type = serializer.validated_data['document_type']
		
		session = ProviderOnboardingSession.objects.create(
			session_id=session_id,
			step=1,
			document_file=doc_file,
			document_type=doc_type,
			expires_at=timezone.now() + timedelta(hours=12)
		)
		
		# Perform OCR extraction
		ocr_engine = get_ocr_engine()
		ocr_result = ocr_engine.extract_text(doc_file.path, language='auto')
		
		# Check document validation
		validation = ocr_result.get('validation', {})
		if validation.get('flagged'):
			# Document is invalid - return detailed error
			error_details = {
				'error': 'Document validation failed',
				'is_expired': validation.get('is_expired', False),
				'is_non_ethiopian': validation.get('is_non_ethiopian', False),
				'validation_errors': validation.get('errors', []),
				'validation_warnings': validation.get('warnings', []),
			}
			return Response(error_details, status=status.HTTP_400_BAD_REQUEST)
		
		# Store extracted data
		session.extracted_data = ocr_result['extracted_fields']
		session.ocr_confidence = ocr_result.get('confidence', 0.0)
		session.image_quality = ocr_result.get('image_quality', 0.0)
		session.quality_warnings = ocr_result.get('quality_warnings', [])
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
				document_url=session.document_file,
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
			id_photo_path=session.document_file.path,
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
			document_url=session.document_file,
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
				# Document is invalid - return detailed error
				error_details = {
					'error': 'Document validation failed',
					'is_expired': validation.get('is_expired', False),
					'is_non_ethiopian': validation.get('is_non_ethiopian', False),
					'validation_errors': validation.get('errors', []),
					'validation_warnings': validation.get('warnings', []),
				}
				return Response(error_details, status=status.HTTP_400_BAD_REQUEST)
			
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
