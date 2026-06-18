"""Test cases for Provider Location APIs"""
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import ProviderProfile, PhoneOTP
from accounts.tests.base import AuthScenarioBase

User = get_user_model()


class ProviderLocationTestBase(AuthScenarioBase):
    """Base class with helper methods for provider location tests"""

    def _get_provider_token(self):
        """Get access token for provider user"""
        otp = PhoneOTP.objects.create(
            phone_number=self.provider_user.phone_number,
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code='123456',
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
        )
        
        response = self.client.post(
            '/api/v1/auth/login/verify/',
            {
                'phone_number': self.provider_user.phone_number,
                'otp_code': '123456',
            },
            format='json',
        )
        
        return response.data.get('access')

    def _get_client_token(self):
        """Get access token for client user"""
        otp = PhoneOTP.objects.create(
            phone_number=self.client_user.phone_number,
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code='123456',
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
        )
        
        response = self.client.post(
            '/api/v1/auth/login/verify/',
            {
                'phone_number': self.client_user.phone_number,
                'otp_code': '123456',
            },
            format='json',
        )
        
        return response.data.get('access')

    def _authenticated_client(self, access_token):
        """Create authenticated API client"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        return client


class ProviderGoOnlineTests(ProviderLocationTestBase):
    """Test cases for POST /api/v1/provider/go-online/"""

    def setUp(self):
        super().setUp()
        self.provider_profile = ProviderProfile.objects.create(
            user=self.provider_user,
            is_online=False,
            current_latitude=9.0320,
            current_longitude=38.7469,
            profile_completed=True,
        )

    def test_go_online_success(self):
        """Provider can go online with valid location"""
        access_token = self._get_provider_token()
        client = self._authenticated_client(access_token)

        response = client.post(
            '/api/v1/provider/go-online/',
            {'latitude': 9.0320, 'longitude': 38.7469},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('is_online'))

    def test_go_online_requires_auth(self):
        """Unauthenticated request is rejected"""
        response = self.client.post(
            '/api/v1/provider/go-online/',
            {'latitude': 9.0320, 'longitude': 38.7469},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProviderGoOfflineTests(ProviderLocationTestBase):
    """Test cases for POST /api/v1/provider/go-offline/"""

    def setUp(self):
        super().setUp()
        self.provider_profile = ProviderProfile.objects.create(
            user=self.provider_user,
            is_online=True,
            current_latitude=9.0320,
            current_longitude=38.7469,
            profile_completed=True,
        )

    def test_go_offline_success(self):
        """Provider can go offline"""
        access_token = self._get_provider_token()
        client = self._authenticated_client(access_token)

        response = client.post('/api/v1/provider/go-offline/', format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get('is_online'))


class ProviderUpdateLocationTests(ProviderLocationTestBase):
    """Test cases for POST /api/v1/provider/update-location/"""

    def setUp(self):
        super().setUp()
        self.provider_profile = ProviderProfile.objects.create(
            user=self.provider_user,
            is_online=True,
            current_latitude=9.0320,
            current_longitude=38.7469,
            profile_completed=True,
        )

    def test_update_location_success(self):
        """Provider can update location"""
        access_token = self._get_provider_token()
        client = self._authenticated_client(access_token)

        response = client.post(
            '/api/v1/provider/update-location/',
            {'latitude': 9.0400, 'longitude': 38.7500},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ProviderStatusTests(ProviderLocationTestBase):
    """Test cases for GET /api/v1/provider/status/"""

    def setUp(self):
        super().setUp()
        self.provider_profile = ProviderProfile.objects.create(
            user=self.provider_user,
            is_online=True,
            current_latitude=9.0320,
            current_longitude=38.7469,
            profile_completed=True,
        )

    def test_get_status_success(self):
        """Provider can get their status"""
        access_token = self._get_provider_token()
        client = self._authenticated_client(access_token)

        response = client.get('/api/v1/provider/status/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('is_online'))


class SearchNearbyProvidersTests(ProviderLocationTestBase):
    """Test cases for GET /api/v1/client/search-providers/"""

    def setUp(self):
        super().setUp()
        self.provider1 = ProviderProfile.objects.create(
            user=self.provider_user,
            is_online=True,
            current_latitude=9.0320,
            current_longitude=38.7469,
            profile_completed=True,
        )

    def test_search_providers_success(self):
        """Client can search for nearby providers"""
        access_token = self._get_client_token()
        client = self._authenticated_client(access_token)

        response = client.get(
            '/api/v1/client/search-providers/',
            {'latitude': 9.0320, 'longitude': 38.7469},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
