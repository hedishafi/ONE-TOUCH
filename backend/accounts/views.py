import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from drf_spectacular.utils import OpenApiRequest, OpenApiResponse, extend_schema, inline_serializer
from rest_framework import permissions, serializers as rest_framework_serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView

from .models import (
    PhoneOTP,
    ProviderProfile,
    ClientProfile,
    ServiceCategory,
    SubService,
    ProviderService,
    ProviderManualVerification,
    DeletedProviderRecord,
)
from .permissions import IsProvider
from .serializers import (
    AuthTokenSerializer,
    ClientMinimalUserSerializer,
    LoginOTPRequestSerializer,
    LoginVerifySerializer,
    OTPSentSerializer,
    ProviderFullUserSerializer,
    ProviderProfileSetupSerializer,
    SignupOTPRequestSerializer,
    SignupVerifySerializer,
    ClientAuthProfileSerializer,
    ProviderAuthProfileSerializer,
    ProviderManualVerificationUploadSerializer,
    ProviderManualVerificationStatusSerializer,
)

User = get_user_model()

OTP_EXPIRY_MINUTES = 5
OTP_MAX_ATTEMPTS = 5
TRIAL_DAYS = 14


def _generate_otp() -> str:
    return f'{random.randint(0, 999_999):06d}'


def _unique_username(base: str) -> str:
    candidate, n = base, 1
    while User.objects.filter(username=candidate).exists():
        candidate = f'{base}_{n}'
        n += 1
    return candidate


def _normalize_phone_number(phone_number: str) -> str:
    phone_number = phone_number.strip().replace(' ', '').replace('-', '')

    if phone_number.startswith('+251'):
        return phone_number

    if phone_number.startswith('0') and len(phone_number) == 10:
        return '+251' + phone_number[1:]

    if phone_number.startswith('251') and len(phone_number) == 12:
        return '+' + phone_number

    if len(phone_number) == 9 and phone_number.isdigit():
        return '+251' + phone_number

    return phone_number


def _invalidate_previous_otps(phone_number: str, purpose: str) -> None:
    phone_number = _normalize_phone_number(phone_number)
    PhoneOTP.objects.filter(
        phone_number=phone_number,
        purpose=purpose,
        is_used=False,
    ).update(is_used=True)


def _issue_otp(phone_number: str, purpose: str, **meta) -> str:
    from .sms_service import send_otp_sms

    phone_number = _normalize_phone_number(phone_number)
    _invalidate_previous_otps(phone_number, purpose)
    code = _generate_otp()

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

    sms_sent = send_otp_sms(phone_number, code)
    if not sms_sent:
        otp.delete()
        raise ValueError('Failed to send OTP. Please try again.')

    return code


def _verify_otp(phone_number: str, purpose: str, otp_code: str):
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
    refresh = RefreshToken.for_user(user)
    access = refresh.access_token
    access['role'] = user.role
    access['phone_number'] = user.phone_number

    if user.role == User.ROLE_CLIENT:
        user_data = ClientMinimalUserSerializer(user).data
    else:
        user_data = ProviderFullUserSerializer(user).data

    return {
        'access': str(access),
        'refresh': str(refresh),
        'user': user_data,
    }


def _otp_response(code: str) -> dict:
    payload = {
        'detail': 'OTP sent successfully.',
        'expires_in_seconds': OTP_EXPIRY_MINUTES * 60,
    }
    if settings.DEBUG:
        payload['otp_code'] = code
    return payload


def _error_response(detail: str, *, http_status: int = status.HTTP_400_BAD_REQUEST, errors=None, extra: dict | None = None) -> Response:
    payload = {
        'error': detail,
        'detail': detail,
    }
    if errors is not None:
        payload['errors'] = errors
    if extra:
        payload.update(extra)
    return Response(payload, status=http_status)


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        httponly=settings.JWT_REFRESH_COOKIE_HTTPONLY,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
        path=settings.JWT_REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_REFRESH_COOKIE_PATH,
        samesite=settings.JWT_REFRESH_COOKIE_SAMESITE,
    )


def _set_csrf_cookie(response: Response, request) -> None:
    token = get_token(request)
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=token,
        max_age=settings.CSRF_COOKIE_AGE,
        httponly=settings.CSRF_COOKIE_HTTPONLY,
        secure=settings.CSRF_COOKIE_SECURE,
        samesite=settings.CSRF_COOKIE_SAMESITE,
        path=settings.CSRF_COOKIE_PATH,
    )


def _csrf_valid(request) -> bool:
    header_token = request.headers.get('X-CSRFToken') or request.headers.get('X-CSRF-Token')
    cookie_token = request.COOKIES.get(settings.CSRF_COOKIE_NAME)
    return bool(header_token and cookie_token and header_token == cookie_token)


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
    rejection_reason = ''
    if latest_verification and latest_verification.status == ProviderManualVerification.STATUS_REJECTED:
        rejection_reason = latest_verification.rejection_reason or ''

    if not profile_completed:
        return {
            'next_step': 'profile_setup',
            'next_route': '/provider/profile-setup',
            'profile_completed': False,
            'verification_status': verification_status,
            'rejection_reason': rejection_reason,
        }

    if latest_verification is None or latest_verification.status == ProviderManualVerification.STATUS_REJECTED:
        return {
            'next_step': 'identity_upload',
            'next_route': '/provider/onboarding/step1',
            'profile_completed': True,
            'verification_status': verification_status,
            'rejection_reason': rejection_reason,
        }

    return {
        'next_step': 'dashboard',
        'next_route': '/provider/dashboard',
        'profile_completed': True,
        'verification_status': verification_status,
        'rejection_reason': rejection_reason,
    }


class SignupRequestOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'signup_otp'

    @extend_schema(
        tags=['Signup'],
        request=inline_serializer(
            'SignupOTPRequest',
            {
                'phone_number': rest_framework_serializers.CharField(max_length=30),
                'role': rest_framework_serializers.ChoiceField(choices=['client', 'provider'], default='client'),
            },
        ),
        responses={
            200: OTPSentSerializer,
            400: OpenApiResponse(description='Phone already registered or invalid input.'),
        },
        summary='Signup — request OTP',
    )
    def post(self, request):
        serializer = SignupOTPRequestSerializer(data=request.data)
        if not serializer.is_valid():
            detail = _first_error_text(serializer.errors)
            extra = {}
            if 'already registered' in detail.lower():
                extra['next_action'] = 'login'
            return _error_response(detail, http_status=status.HTTP_400_BAD_REQUEST, errors=serializer.errors, extra=extra)

        vd = serializer.validated_data
        try:
            code = _issue_otp(
                vd['phone_number'],
                PhoneOTP.PURPOSE_REGISTER,
                role=vd.get('role'),
                username=vd.get('username', ''),
                first_name=vd.get('first_name', ''),
                last_name=vd.get('last_name', ''),
            )
        except ValueError as exc:
            return _error_response(str(exc), http_status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(_otp_response(code), status=status.HTTP_200_OK)


class SignupVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'signup_verify'

    @extend_schema(
        tags=['Signup'],
        request=inline_serializer(
            'SignupVerifyRequest',
            {
                'phone_number': rest_framework_serializers.CharField(max_length=30),
                'otp_code': rest_framework_serializers.CharField(max_length=6, min_length=6),
                'role': rest_framework_serializers.ChoiceField(choices=['client', 'provider'], required=False),
            },
        ),
        responses={
            201: AuthTokenSerializer,
            400: OpenApiResponse(description='Invalid / expired OTP or phone already taken.'),
        },
        summary='Signup — verify OTP & create account',
    )
    def post(self, request):
        serializer = SignupVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return _error_response(_first_error_text(serializer.errors), errors=serializer.errors)
        vd = serializer.validated_data

        phone_number = _normalize_phone_number(vd['phone_number'])
        otp_code = vd['otp_code']

        requested_role = request.data.get('role')
        if requested_role and requested_role not in (User.ROLE_CLIENT, User.ROLE_PROVIDER):
            return _error_response('Must be "client" or "provider".', errors={'role': ['Must be "client" or "provider".']})

        try:
            otp = _verify_otp(phone_number, PhoneOTP.PURPOSE_REGISTER, otp_code)
        except ValueError as exc:
            return _error_response(str(exc))

        if otp.role and requested_role and requested_role != otp.role:
            return _error_response('Role mismatch. Please verify using the same role selected when requesting OTP.')

        role = otp.role or requested_role or User.ROLE_CLIENT
        if role not in (User.ROLE_CLIENT, User.ROLE_PROVIDER):
            return _error_response('Invalid role for signup verification.')

        username = request.data.get('username') or otp.username or phone_number
        first_name = request.data.get('first_name') or otp.first_name or ''
        last_name = request.data.get('last_name') or otp.last_name or ''

        if User.objects.filter(phone_number=phone_number).exists():
            return _error_response('This phone number is already registered. Please log in instead.')

        with transaction.atomic():
            user = User(
                username=_unique_username(username),
                phone_number=phone_number,
                role=role,
                first_name=first_name,
                last_name=last_name,
                is_on_trial=(role == User.ROLE_PROVIDER),
                trial_ends_at=timezone.now() + timedelta(days=TRIAL_DAYS) if role == User.ROLE_PROVIDER else None,
            )
            user.set_unusable_password()
            user.save()

            if role == User.ROLE_CLIENT:
                ClientProfile.objects.create(
                    user=user,
                    client_type=ClientProfile.CLIENT_TYPE_INDIVIDUAL,
                    full_name=f'{first_name} {last_name}'.strip() or user.username,
                    loyalty_tier=ClientProfile.LOYALTY_BRONZE,
                    wallet_balance=0.00,
                )

        payload = _build_token_response(user)
        response = Response(payload, status=status.HTTP_201_CREATED)
        _set_refresh_cookie(response, payload['refresh'])
        _set_csrf_cookie(response, request)
        return response


class LoginRequestOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login_otp'

    @extend_schema(
        tags=['Login'],
        request=LoginOTPRequestSerializer,
        responses={
            200: OTPSentSerializer,
            400: OpenApiResponse(description='Phone number not registered.'),
        },
        summary='Login — request OTP',
    )
    def post(self, request):
        raw_phone = request.data.get('phone_number') or request.data.get('phone')
        if raw_phone:
            normalized_phone = _normalize_phone_number(str(raw_phone))
            if DeletedProviderRecord.objects.filter(phone_number=normalized_phone).exists():
                return _error_response(
                    'This provider account was removed by admin. Please contact admin support.',
                    http_status=status.HTTP_403_FORBIDDEN,
                )

        serializer = LoginOTPRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return _error_response(_first_error_text(serializer.errors), errors=serializer.errors)

        phone_number = serializer.validated_data['phone_number']
        try:
            code = _issue_otp(phone_number, PhoneOTP.PURPOSE_LOGIN)
        except ValueError as exc:
            return _error_response(str(exc), http_status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(_otp_response(code), status=status.HTTP_200_OK)


class LoginVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login_verify'

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
        if not serializer.is_valid():
            return _error_response(_first_error_text(serializer.errors), errors=serializer.errors)
        vd = serializer.validated_data

        phone_number = _normalize_phone_number(vd['phone_number'])
        otp_code = vd['otp_code']

        if DeletedProviderRecord.objects.filter(phone_number=phone_number).exists():
            return _error_response(
                'This provider account was removed by admin. Please contact admin support.',
                http_status=status.HTTP_403_FORBIDDEN,
            )

        try:
            _verify_otp(phone_number, PhoneOTP.PURPOSE_LOGIN, otp_code)
        except ValueError as exc:
            return _error_response(str(exc))

        try:
            user = User.objects.get(phone_number=phone_number)
        except User.DoesNotExist:
            return _error_response('No account found for this phone number.', http_status=status.HTTP_404_NOT_FOUND)

        if not user.is_active:
            return _error_response(
                'This account is inactive. Please contact admin support.',
                http_status=status.HTTP_403_FORBIDDEN,
            )

        payload = _build_token_response(user)
        response = Response(payload, status=status.HTTP_200_OK)
        _set_refresh_cookie(response, payload['refresh'])
        _set_csrf_cookie(response, request)
        return response


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
                    'rejection_reason': rest_framework_serializers.CharField(allow_blank=True),
                },
            )
        },
        summary='Get provider onboarding resume status',
    )
    def get(self, request):
        return Response(_provider_resume_status(request.user), status=status.HTTP_200_OK)


class TokenRefreshView(BaseTokenRefreshView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'token_refresh'

    @extend_schema(tags=['Auth'], summary='Refresh access token')
    def post(self, request, *args, **kwargs):
        if not _csrf_valid(request):
            return Response({'detail': 'CSRF validation failed.'}, status=status.HTTP_403_FORBIDDEN)

        refresh_token = request.data.get('refresh') or request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not refresh_token:
            return Response({'detail': 'Refresh token missing. Please log in again.'}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, ValidationError):
            response = Response({'detail': 'Refresh token expired or invalid. Please log in again.'}, status=status.HTTP_401_UNAUTHORIZED)
            _clear_refresh_cookie(response)
            return response

        data = serializer.validated_data
        response = Response(data, status=status.HTTP_200_OK)
        _set_refresh_cookie(response, data.get('refresh', refresh_token))
        _set_csrf_cookie(response, request)
        return response


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Auth'],
        request=inline_serializer('LogoutRequest', {'refresh': rest_framework_serializers.CharField(required=False)}),
        responses={200: inline_serializer('LogoutResponse', {'detail': rest_framework_serializers.CharField()})},
        summary='Logout',
    )
    def post(self, request):
        if not _csrf_valid(request):
            return Response({'detail': 'CSRF validation failed.'}, status=status.HTTP_403_FORBIDDEN)

        refresh_token = request.data.get('refresh') or request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass

        response = Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        _clear_refresh_cookie(response)
        return response


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Auth'],
        responses={200: OpenApiResponse(description='Role-based profile payload (client or provider).')},
        summary='Get my profile',
    )
    def get(self, request):
        if request.user.role == User.ROLE_PROVIDER:
            data = ProviderAuthProfileSerializer(request.user).data
        else:
            data = ClientAuthProfileSerializer(request.user).data
        return Response(data, status=status.HTTP_200_OK)


class ProviderManualVerificationUploadView(APIView):
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


class ProviderProfileSetupView(APIView):
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
            sub_service = SubService.objects.filter(category=service_category, name__iexact=sub_name).first()
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


class ServiceCategoryListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProvider]

    @extend_schema(
        tags=['Provider'],
        responses={
            200: inline_serializer(
                'ServiceCategoryListResponse',
                {
                    'results': rest_framework_serializers.ListField(
                        child=inline_serializer(
                            'ServiceCategoryItem',
                            {
                                'id': rest_framework_serializers.IntegerField(),
                                'name': rest_framework_serializers.CharField(),
                                'slug': rest_framework_serializers.CharField(),
                            },
                        )
                    )
                },
            )
        },
        summary='List service categories for profile setup',
    )
    def get(self, request):
        categories = ServiceCategory.objects.filter(is_active=True).order_by('name')
        return Response(
            {
                'results': [
                    {
                        'id': category.id,
                        'name': category.name,
                        'slug': category.slug,
                    }
                    for category in categories
                ]
            },
            status=status.HTTP_200_OK,
        )


class SubServiceListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsProvider]

    @extend_schema(
        tags=['Provider'],
        responses={
            200: inline_serializer(
                'SubServiceListResponse',
                {
                    'results': rest_framework_serializers.ListField(
                        child=inline_serializer(
                            'SubServiceItem',
                            {
                                'id': rest_framework_serializers.IntegerField(),
                                'name': rest_framework_serializers.CharField(),
                                'slug': rest_framework_serializers.CharField(),
                                'category_id': rest_framework_serializers.IntegerField(),
                            },
                        )
                    )
                },
            )
        },
        summary='List sub-services by service category',
    )
    def get(self, request, category_id: int):
        sub_services = SubService.objects.filter(category_id=category_id, is_active=True).order_by('name')
        return Response(
            {
                'results': [
                    {
                        'id': item.id,
                        'name': item.name,
                        'slug': item.slug,
                        'category_id': item.category_id,
                    }
                    for item in sub_services
                ]
            },
            status=status.HTTP_200_OK,
        )
