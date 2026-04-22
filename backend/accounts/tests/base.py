from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient, APITestCase

from accounts.models import PhoneOTP

User = get_user_model()


class AuthScenarioBase(APITestCase):
    def setUp(self):
        cache.clear()
        self.client_user = User.objects.create_user(
            username='ci_client',
            phone_number='+251911123450',
            role=User.ROLE_CLIENT,
            is_active=True,
        )
        self.provider_user = User.objects.create_user(
            username='ci_provider',
            phone_number='+251911123451',
            role=User.ROLE_PROVIDER,
            is_active=True,
        )

    def latest_otp(self, phone_number: str, purpose: str) -> PhoneOTP | None:
        return PhoneOTP.objects.filter(phone_number=phone_number, purpose=purpose).order_by('-created_at').first()

    def csrf_client(self, access_token: str | None = None):
        api_client = APIClient()
        csrf_value = 'test-csrf-token'
        api_client.cookies['csrftoken'] = csrf_value
        if access_token:
            api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        return api_client, csrf_value
