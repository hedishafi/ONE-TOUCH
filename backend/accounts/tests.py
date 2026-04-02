from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import DeletedProviderRecord, PhoneOTP


User = get_user_model()


class AuthSecurityTests(APITestCase):
	def setUp(self):
		self.provider = User.objects.create_user(
			username='provider_test',
			phone_number='+251911000001',
			role=User.ROLE_PROVIDER,
			is_active=True,
		)
		self.client_user = User.objects.create_user(
			username='client_test',
			phone_number='+251911000002',
			role=User.ROLE_CLIENT,
			is_active=True,
		)

	def _csrf_client(self):
		client = APIClient()
		return client

	def _csrf_post(self, client: APIClient, path: str, data: dict):
		csrf_value = 'test-csrf-token'
		client.cookies['csrftoken'] = csrf_value
		return client.post(
			path,
			data,
			format='json',
			HTTP_X_CSRFTOKEN=csrf_value,
		)

	def _login_otp(self, phone_number: str, code: str = '123456'):
		PhoneOTP.objects.create(
			phone_number=phone_number,
			purpose=PhoneOTP.PURPOSE_LOGIN,
			code=code,
			expires_at=timezone.now() + timedelta(minutes=5),
			is_used=False,
			attempts=0,
		)
		return code

	def test_login_verify_sets_refresh_cookie(self):
		otp_code = self._login_otp(self.provider.phone_number)

		response = self.client.post(
			'/api/v1/auth/login/verify/',
			{'phone_number': self.provider.phone_number, 'otp_code': otp_code},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('access', response.data)
		self.assertIn('refresh', response.data)
		self.assertIn('refresh_token', response.cookies)
		self.assertIn('csrftoken', response.cookies)

	def test_refresh_rotation_blacklists_old_token(self):
		old_refresh = str(RefreshToken.for_user(self.provider))
		client = self._csrf_client()

		first = self._csrf_post(client, '/api/v1/auth/token/refresh/', {'refresh': old_refresh})
		self.assertEqual(first.status_code, status.HTTP_200_OK)
		self.assertIn('refresh', first.data)

		second = self._csrf_post(client, '/api/v1/auth/token/refresh/', {'refresh': old_refresh})
		self.assertEqual(second.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_logout_blacklists_refresh_token(self):
		refresh = str(RefreshToken.for_user(self.provider))
		access = str(RefreshToken.for_user(self.provider).access_token)

		client = self._csrf_client()
		client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

		logout_response = self._csrf_post(client, '/api/v1/auth/logout/', {'refresh': refresh})
		self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

		refresh_response = self._csrf_post(client, '/api/v1/auth/token/refresh/', {'refresh': refresh})
		self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

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
		access = str(RefreshToken.for_user(self.provider).access_token)
		self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

		response = self.client.get('/api/v1/auth/profile/')
		self.assertEqual(response.status_code, status.HTTP_200_OK)

		self.assertIn('provider_uid', response.data)
		self.assertIn('verification_status', response.data)
		self.assertIn('is_on_trial', response.data)
		self.assertIn('trial_ends_at', response.data)

	def test_deleted_provider_phone_cannot_request_login_otp(self):
		DeletedProviderRecord.objects.create(
			phone_number='+251911999999',
			provider_uid='999999',
		)

		response = self.client.post(
			'/api/v1/auth/login/otp/',
			{'phone_number': '+251911999999'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
		self.assertIn('contact admin support', response.data.get('detail', '').lower())

	def test_signup_otp_request_supports_both_roles(self):
		provider_response = self.client.post(
			'/api/v1/auth/signup/otp/',
			{'phone_number': '+251911777001', 'role': 'provider'},
			format='json',
		)
		self.assertEqual(provider_response.status_code, status.HTTP_200_OK)

		client_response = self.client.post(
			'/api/v1/auth/signup/otp/',
			{'phone_number': '+251911777002', 'role': 'client'},
			format='json',
		)
		self.assertEqual(client_response.status_code, status.HTTP_200_OK)

		self.assertTrue(
			PhoneOTP.objects.filter(
				phone_number='+251911777001',
				purpose=PhoneOTP.PURPOSE_REGISTER,
				role=User.ROLE_PROVIDER,
			).exists()
		)
		self.assertTrue(
			PhoneOTP.objects.filter(
				phone_number='+251911777002',
				purpose=PhoneOTP.PURPOSE_REGISTER,
				role=User.ROLE_CLIENT,
			).exists()
		)

	def test_login_otp_request_supports_both_roles(self):
		provider_login_response = self.client.post(
			'/api/v1/auth/login/otp/',
			{'phone_number': self.provider.phone_number},
			format='json',
		)
		self.assertEqual(provider_login_response.status_code, status.HTTP_200_OK)

		client_login_response = self.client.post(
			'/api/v1/auth/login/otp/',
			{'phone_number': self.client_user.phone_number},
			format='json',
		)
		self.assertEqual(client_login_response.status_code, status.HTTP_200_OK)

