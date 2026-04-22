from datetime import timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import ProviderManualVerification, ProviderProfile, ServiceCategory, SubService
from accounts.tests.base import AuthScenarioBase

User = get_user_model()


class AuthSecurityTests(AuthScenarioBase):
    def test_login_verify_sets_refresh_cookie(self):
        from django.utils import timezone
        from accounts.models import PhoneOTP

        PhoneOTP.objects.create(
            phone_number=self.provider_user.phone_number,
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code='123456',
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
            attempts=0,
        )

        response = self.client.post(
            '/api/v1/auth/login/verify/',
            {'phone_number': self.provider_user.phone_number, 'otp_code': '123456'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('refresh_token', response.cookies)
        self.assertIn('csrftoken', response.cookies)

    def test_refresh_rotation_blacklists_old_token (self):
        old_refresh = str(RefreshToken.for_user(self.provider_user))
        client, csrf = self.csrf_client()

        first = client.post('/api/v1/auth/token/refresh/', {'refresh': old_refresh}, format='json', HTTP_X_CSRFTOKEN=csrf)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertIn('refresh', first.data)

        second = client.post('/api/v1/auth/token/refresh/', {'refresh': old_refresh}, format='json', HTTP_X_CSRFTOKEN=csrf)
        self.assertIn(second.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_profile_payload_is_role_based_for_client(self):
        access = str(RefreshToken.for_user(self.client_user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = self.client.get('/api/v1/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertIn('id', response.data)
        self.assertIn('phone_number', response.data)
        self.assertIn('first_name', response.data)
        self.assertIn('last_name', response.data)
        self.assertIn('role', response.data)
        self.assertIn('date_joined', response.data)

        self.assertNotIn('provider_uid', response.data)
        self.assertNotIn('verification_status', response.data)
        self.assertNotIn('is_on_trial', response.data)
        self.assertNotIn('trial_ends_at', response.data)

    def test_profile_payload_is_role_based_for_provider(self):
        access = str(RefreshToken.for_user(self.provider_user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = self.client.get('/api/v1/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertIn('provider_uid', response.data)
        self.assertIn('verification_status', response.data)
        self.assertIn('is_on_trial', response.data)
        self.assertIn('trial_ends_at', response.data)

    def test_provider_onboarding_status_includes_rejection_reason(self):
        ProviderProfile.objects.update_or_create(
            user=self.provider_user,
            defaults={'profile_completed': True},
        )
        ProviderManualVerification.objects.create(
            provider=self.provider_user,
            id_front_image='provider_verification/id_front/test.jpg',
            id_back_image='provider_verification/id_back/test.jpg',
            selfie_image='provider_verification/selfie/test.jpg',
            status=ProviderManualVerification.STATUS_REJECTED,
            rejection_reason='ID image is unclear',
        )

        access = str(RefreshToken.for_user(self.provider_user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = self.client.get('/api/v1/provider/onboarding/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('verification_status'), ProviderManualVerification.STATUS_REJECTED)
        self.assertEqual(response.data.get('rejection_reason'), 'ID image is unclear')

    def test_provider_service_category_and_subservice_endpoints(self):
        category = ServiceCategory.objects.create(name='Plumbing', slug='plumbing', is_active=True)
        SubService.objects.create(category=category, name='Leak Fix', slug='leak-fix', is_active=True)
        SubService.objects.create(category=category, name='Pipe Repair', slug='pipe-repair', is_active=True)

        access = str(RefreshToken.for_user(self.provider_user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        categories_response = self.client.get('/api/v1/provider/service-categories/')
        self.assertEqual(categories_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['name'] == 'Plumbing' for item in categories_response.data.get('results', [])))

        subservices_response = self.client.get(f'/api/v1/provider/service-categories/{category.id}/sub-services/')
        self.assertEqual(subservices_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(subservices_response.data.get('results', [])), 2)

    def test_token_refresh_requires_csrf(self):
        refresh = str(RefreshToken.for_user(self.client_user))

        response = self.client.post('/api/v1/auth/token/refresh/', {'refresh': refresh}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('csrf', response.data.get('detail', '').lower())

    def test_token_refresh_with_valid_csrf_succeeds(self):
        refresh = str(RefreshToken.for_user(self.client_user))
        api_client, csrf = self.csrf_client()

        response = api_client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': refresh},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_token_refresh_with_expired_token_fails(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        from datetime import datetime
        from django.utils import timezone

        refresh = RefreshToken.for_user(self.client_user)
        refresh.set_exp(lifetime=timedelta(seconds=-1))
        expired_token = str(refresh)

        api_client, csrf = self.csrf_client()
        response = api_client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': expired_token},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_user_cannot_access_profile(self):
        response = self.client.get('/api/v1/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_client_profile_excludes_provider_fields(self):
        access = str(RefreshToken.for_user(self.client_user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = self.client.get('/api/v1/auth/profile/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('phone_number', response.data)
        self.assertNotIn('provider_uid', response.data)
        self.assertNotIn('trial_ends_at', response.data)
