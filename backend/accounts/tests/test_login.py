from unittest.mock import patch
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status

from accounts.models import DeletedProviderRecord, PhoneOTP
from accounts.tests.base import AuthScenarioBase

User = get_user_model()


class LoginFlowTests(AuthScenarioBase):
    def test_login_otp_request_success_for_existing_user(self):
        response = self.client.post(
            '/api/v1/auth/login/otp/',
            {'phone_number': '0911123450'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        otp = self.latest_otp(self.client_user.phone_number, PhoneOTP.PURPOSE_LOGIN)
        self.assertIsNotNone(otp)

    def test_login_otp_request_rejects_unknown_phone(self):
        response = self.client.post(
            '/api/v1/auth/login/otp/',
            {'phone_number': '+251911199999'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('no account found', response.data.get('detail', '').lower())

    def test_login_otp_request_rejects_deleted_provider_phone(self):
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

    @patch('accounts.sms_service.send_otp_sms', return_value=False)
    def test_login_otp_sms_failure_returns_structured_json(self, _mock_send_sms):
        response = self.client.post(
            '/api/v1/auth/login/otp/',
            {'phone_number': self.client_user.phone_number},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn('error', response.data)
        self.assertIn('detail', response.data)
        self.assertIn('failed to send otp', response.data['detail'].lower())

    def test_login_verify_success_returns_tokens_and_cookies(self):
        PhoneOTP.objects.create(
            phone_number=self.client_user.phone_number,
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code='333333',
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
        )

        response = self.client.post(
            '/api/v1/auth/login/verify/',
            {'phone_number': self.client_user.phone_number, 'otp_code': '333333'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('refresh_token', response.cookies)
        self.assertIn('csrftoken', response.cookies)

    def test_login_verify_returns_404_when_user_missing_after_valid_otp(self):
        PhoneOTP.objects.create(
            phone_number='+251911123460',
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code='444444',
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
        )

        response = self.client.post(
            '/api/v1/auth/login/verify/',
            {'phone_number': '+251911123460', 'otp_code': '444444'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('no account found', response.data.get('detail', '').lower())

    def test_login_verify_rejects_inactive_user(self):
        inactive_user = User.objects.create_user(
            username='inactive_ci',
            phone_number='+251911123461',
            role=User.ROLE_CLIENT,
            is_active=False,
        )
        PhoneOTP.objects.create(
            phone_number=inactive_user.phone_number,
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code='555555',
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
        )

        response = self.client.post(
            '/api/v1/auth/login/verify/',
            {'phone_number': inactive_user.phone_number, 'otp_code': '555555'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('inactive', response.data.get('detail', '').lower())

    def test_login_verify_rejects_expired_otp(self):
        PhoneOTP.objects.create(
            phone_number=self.client_user.phone_number,
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code='565656',
            expires_at=timezone.now() - timedelta(minutes=1),
            is_used=False,
        )

        response = self.client.post(
            '/api/v1/auth/login/verify/',
            {'phone_number': self.client_user.phone_number, 'otp_code': '565656'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', response.data.get('detail', '').lower())

    def test_login_verify_locks_after_max_invalid_attempts(self):
        PhoneOTP.objects.create(
            phone_number=self.client_user.phone_number,
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code='777777',
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
            attempts=4,
        )

        response = self.client.post(
            '/api/v1/auth/login/verify/',
            {'phone_number': self.client_user.phone_number, 'otp_code': '000000'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('invalid otp', response.data.get('detail', '').lower())
        otp = self.latest_otp(self.client_user.phone_number, PhoneOTP.PURPOSE_LOGIN)
        self.assertTrue(otp.is_used)

    def test_login_verify_tracks_failed_attempts(self):
        PhoneOTP.objects.create(
            phone_number=self.client_user.phone_number,
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code='888888',
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
        )

        response = self.client.post(
            '/api/v1/auth/login/verify/',
            {'phone_number': self.client_user.phone_number, 'otp_code': '999999'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        otp = self.latest_otp(self.client_user.phone_number, PhoneOTP.PURPOSE_LOGIN)
        self.assertEqual(otp.attempts, 1)
        self.assertFalse(otp.is_used)

    def test_login_verify_blocks_after_5_failed_attempts(self):
        otp = PhoneOTP.objects.create(
            phone_number=self.client_user.phone_number,
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code='123456',
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
        )

        for _ in range(5):
            self.client.post(
                '/api/v1/auth/login/verify/',
                {'phone_number': self.client_user.phone_number, 'otp_code': '000000'},
                format='json',
            )

        otp.refresh_from_db()
        self.assertEqual(otp.attempts, 5)
        self.assertTrue(otp.is_used)

        response = self.client.post(
            '/api/v1/auth/login/verify/',
            {'phone_number': self.client_user.phone_number, 'otp_code': otp.code},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('otp not found', response.data.get('detail', '').lower())

    def test_login_otp_invalidates_previous_otps(self):
        first_otp = PhoneOTP.objects.create(
            phone_number=self.client_user.phone_number,
            purpose=PhoneOTP.PURPOSE_LOGIN,
            code='111111',
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
        )

        self.client.post(
            '/api/v1/auth/login/otp/',
            {'phone_number': self.client_user.phone_number},
            format='json',
        )

        first_otp.refresh_from_db()
        self.assertTrue(first_otp.is_used)

    def test_login_verify_rejects_invalid_phone_format(self):
        response = self.client.post(
            '/api/v1/auth/login/verify/',
            {'phone_number': '12345', 'otp_code': '123456'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
