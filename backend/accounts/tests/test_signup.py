from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status

from accounts.models import PhoneOTP
from accounts.tests.base import AuthScenarioBase

User = get_user_model()


class SignupFlowTests(AuthScenarioBase):
    def test_signup_otp_request_client_success(self):
        response = self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '0911123452', 'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)
        otp = self.latest_otp('+251911123452', PhoneOTP.PURPOSE_REGISTER)
        self.assertIsNotNone(otp)
        self.assertEqual(otp.role, User.ROLE_CLIENT)

    def test_signup_otp_request_provider_success(self):
        response = self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '+251911123453', 'role': 'provider'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        otp = self.latest_otp('+251911123453', PhoneOTP.PURPOSE_REGISTER)
        self.assertIsNotNone(otp)
        self.assertEqual(otp.role, User.ROLE_PROVIDER)

    def test_signup_otp_request_rejects_duplicate_phone(self):
        response = self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': self.client_user.phone_number, 'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get('next_action'), 'login')
        self.assertIn('already registered', response.data.get('detail', '').lower())

    def test_signup_otp_request_rejects_invalid_phone_format(self):
        response = self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '12345', 'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ethiopian format', response.data.get('detail', '').lower())

    def test_signup_resend_invalidates_previous_otp(self):
        initial = self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '+251911123454', 'role': 'client'},
            format='json',
        )
        self.assertEqual(initial.status_code, status.HTTP_200_OK)
        first_otp = self.latest_otp('+251911123454', PhoneOTP.PURPOSE_REGISTER)
        self.assertIsNotNone(first_otp)

        resend = self.client.post(
            '/api/v1/auth/signup/resend-otp/',
            {'phone_number': '+251911123454', 'role': 'client'},
            format='json',
        )
        self.assertEqual(resend.status_code, status.HTTP_200_OK)

        first_otp.refresh_from_db()
        second_otp = self.latest_otp('+251911123454', PhoneOTP.PURPOSE_REGISTER)
        self.assertTrue(first_otp.is_used)
        self.assertIsNotNone(second_otp)
        self.assertNotEqual(first_otp.id, second_otp.id)

    def test_signup_verify_success_creates_client_and_returns_tokens(self):
        request_otp = self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '+251911123455', 'role': 'client'},
            format='json',
        )
        self.assertEqual(request_otp.status_code, status.HTTP_200_OK)
        otp = self.latest_otp('+251911123455', PhoneOTP.PURPOSE_REGISTER)

        response = self.client.post(
            '/api/v1/auth/signup/verify/',
            {'phone_number': '+251911123455', 'otp_code': otp.code, 'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('refresh_token', response.cookies)
        self.assertIn('csrftoken', response.cookies)
        created = User.objects.get(phone_number='+251911123455')
        self.assertEqual(created.role, User.ROLE_CLIENT)

    def test_signup_verify_success_creates_provider_with_trial(self):
        request_otp = self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '+251911123456', 'role': 'provider'},
            format='json',
        )
        self.assertEqual(request_otp.status_code, status.HTTP_200_OK)
        otp = self.latest_otp('+251911123456', PhoneOTP.PURPOSE_REGISTER)

        response = self.client.post(
            '/api/v1/auth/signup/verify/',
            {'phone_number': '+251911123456', 'otp_code': otp.code, 'role': 'provider'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = User.objects.get(phone_number='+251911123456')
        self.assertEqual(created.role, User.ROLE_PROVIDER)
        self.assertTrue(created.is_on_trial)
        self.assertIsNotNone(created.trial_ends_at)

    def test_signup_verify_rejects_invalid_otp(self):
        self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '+251911123457', 'role': 'client'},
            format='json',
        )

        response = self.client.post(
            '/api/v1/auth/signup/verify/',
            {'phone_number': '+251911123457', 'otp_code': '000000', 'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('invalid otp', response.data.get('detail', '').lower())

    def test_signup_verify_rejects_expired_otp(self):
        PhoneOTP.objects.create(
            phone_number='+251911123458',
            purpose=PhoneOTP.PURPOSE_REGISTER,
            code='111111',
            expires_at=timezone.now() - timedelta(minutes=1),
            is_used=False,
            role=User.ROLE_CLIENT,
        )

        response = self.client.post(
            '/api/v1/auth/signup/verify/',
            {'phone_number': '+251911123458', 'otp_code': '111111', 'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', response.data.get('detail', '').lower())

    def test_signup_verify_rejects_role_mismatch(self):
        PhoneOTP.objects.create(
            phone_number='+251911123459',
            purpose=PhoneOTP.PURPOSE_REGISTER,
            code='222222',
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=False,
            role=User.ROLE_PROVIDER,
        )

        response = self.client.post(
            '/api/v1/auth/signup/verify/',
            {'phone_number': '+251911123459', 'otp_code': '222222', 'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('role mismatch', response.data.get('detail', '').lower())

    def test_signup_verify_tracks_failed_attempts(self):
        self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '+251911123460', 'role': 'client'},
            format='json',
        )
        otp = self.latest_otp('+251911123460', PhoneOTP.PURPOSE_REGISTER)

        response = self.client.post(
            '/api/v1/auth/signup/verify/',
            {'phone_number': '+251911123460', 'otp_code': '999999', 'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('invalid otp', response.data.get('detail', '').lower())
        otp.refresh_from_db()
        self.assertEqual(otp.attempts, 1)
        self.assertFalse(otp.is_used)

    def test_signup_verify_blocks_after_max_attempts(self):
        self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '+251911123461', 'role': 'client'},
            format='json',
        )
        otp = self.latest_otp('+251911123461', PhoneOTP.PURPOSE_REGISTER)

        for attempt in range(5):
            response = self.client.post(
                '/api/v1/auth/signup/verify/',
                {'phone_number': '+251911123461', 'otp_code': '999999', 'role': 'client'},
                format='json',
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        otp.refresh_from_db()
        self.assertEqual(otp.attempts, 5)
        self.assertTrue(otp.is_used)

        response = self.client.post(
            '/api/v1/auth/signup/verify/',
            {'phone_number': '+251911123461', 'otp_code': otp.code, 'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('otp not found', response.data.get('detail', '').lower())

    def test_signup_verify_allows_retry_after_resend(self):
        self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '+251911123462', 'role': 'client'},
            format='json',
        )
        first_otp = self.latest_otp('+251911123462', PhoneOTP.PURPOSE_REGISTER)

        for _ in range(3):
            self.client.post(
                '/api/v1/auth/signup/verify/',
                {'phone_number': '+251911123462', 'otp_code': '999999', 'role': 'client'},
                format='json',
            )

        first_otp.refresh_from_db()
        self.assertEqual(first_otp.attempts, 3)

        self.client.post(
            '/api/v1/auth/signup/resend-otp/',
            {'phone_number': '+251911123462', 'role': 'client'},
            format='json',
        )

        second_otp = self.latest_otp('+251911123462', PhoneOTP.PURPOSE_REGISTER)
        self.assertNotEqual(first_otp.id, second_otp.id)
        self.assertEqual(second_otp.attempts, 0)

        response = self.client.post(
            '/api/v1/auth/signup/verify/',
            {'phone_number': '+251911123462', 'otp_code': second_otp.code, 'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)

    def test_signup_verify_increments_attempts_correctly(self):
        self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '+251911123463', 'role': 'client'},
            format='json',
        )
        otp = self.latest_otp('+251911123463', PhoneOTP.PURPOSE_REGISTER)

        for expected_attempts in range(1, 4):
            self.client.post(
                '/api/v1/auth/signup/verify/',
                {'phone_number': '+251911123463', 'otp_code': '111111', 'role': 'client'},
                format='json',
            )
            otp.refresh_from_db()
            self.assertEqual(otp.attempts, expected_attempts)

    def test_signup_verify_success_on_last_attempt(self):
        self.client.post(
            '/api/v1/auth/signup/otp/',
            {'phone_number': '+251911123464', 'role': 'client'},
            format='json',
        )
        otp = self.latest_otp('+251911123464', PhoneOTP.PURPOSE_REGISTER)

        for _ in range(4):
            self.client.post(
                '/api/v1/auth/signup/verify/',
                {'phone_number': '+251911123464', 'otp_code': '999999', 'role': 'client'},
                format='json',
            )

        otp.refresh_from_db()
        self.assertEqual(otp.attempts, 4)
        self.assertFalse(otp.is_used)

        response = self.client.post(
            '/api/v1/auth/signup/verify/',
            {'phone_number': '+251911123464', 'otp_code': otp.code, 'role': 'client'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        otp.refresh_from_db()
        self.assertTrue(otp.is_used)
