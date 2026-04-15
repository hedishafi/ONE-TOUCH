from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import ProviderManualVerification, ProviderProfile
from accounts.tests.base import AuthScenarioBase

User = get_user_model()


class ProviderOnboardingStatusTests(AuthScenarioBase):
    def _auth_as(self, user):
        access = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_onboarding_status_requires_authentication(self):
        response = self.client.get('/api/v1/provider/onboarding/status/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_onboarding_status_rejects_client_role(self):
        self._auth_as(self.client_user)
        response = self.client.get('/api/v1/provider/onboarding/status/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_onboarding_status_profile_setup_step_when_profile_missing(self):
        self._auth_as(self.provider_user)

        response = self.client.get('/api/v1/provider/onboarding/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('next_step'), 'profile_setup')
        self.assertFalse(response.data.get('profile_completed'))
        self.assertEqual(response.data.get('verification_status'), 'not_submitted')

    def test_onboarding_status_identity_upload_step_when_profile_completed_but_not_submitted(self):
        ProviderProfile.objects.update_or_create(user=self.provider_user, defaults={'profile_completed': True})
        self._auth_as(self.provider_user)

        response = self.client.get('/api/v1/provider/onboarding/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('next_step'), 'identity_upload')
        self.assertTrue(response.data.get('profile_completed'))

    def test_onboarding_status_shows_rejection_reason(self):
        ProviderProfile.objects.update_or_create(user=self.provider_user, defaults={'profile_completed': True})
        ProviderManualVerification.objects.create(
            provider=self.provider_user,
            id_front_image='provider_verification/id_front/test.jpg',
            id_back_image='provider_verification/id_back/test.jpg',
            selfie_image='provider_verification/selfie/test.jpg',
            status=ProviderManualVerification.STATUS_REJECTED,
            rejection_reason='Document is blurry',
        )

        self._auth_as(self.provider_user)
        response = self.client.get('/api/v1/provider/onboarding/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('next_step'), 'identity_upload')
        self.assertEqual(response.data.get('verification_status'), ProviderManualVerification.STATUS_REJECTED)
        self.assertEqual(response.data.get('rejection_reason'), 'Document is blurry')

    def test_onboarding_status_dashboard_when_verification_pending(self):
        ProviderProfile.objects.update_or_create(user=self.provider_user, defaults={'profile_completed': True})
        ProviderManualVerification.objects.create(
            provider=self.provider_user,
            id_front_image='provider_verification/id_front/test.jpg',
            id_back_image='provider_verification/id_back/test.jpg',
            selfie_image='provider_verification/selfie/test.jpg',
            status=ProviderManualVerification.STATUS_PENDING,
        )

        self._auth_as(self.provider_user)
        response = self.client.get('/api/v1/provider/onboarding/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('next_step'), 'dashboard')
        self.assertEqual(response.data.get('next_route'), '/provider/dashboard')

    def test_onboarding_status_dashboard_when_verification_approved(self):
        ProviderProfile.objects.update_or_create(user=self.provider_user, defaults={'profile_completed': True})
        ProviderManualVerification.objects.create(
            provider=self.provider_user,
            id_front_image='provider_verification/id_front/test.jpg',
            id_back_image='provider_verification/id_back/test.jpg',
            selfie_image='provider_verification/selfie/test.jpg',
            status=ProviderManualVerification.STATUS_APPROVED,
        )

        self._auth_as(self.provider_user)
        response = self.client.get('/api/v1/provider/onboarding/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('next_step'), 'dashboard')
        self.assertEqual(response.data.get('verification_status'), ProviderManualVerification.STATUS_APPROVED)

    def test_onboarding_status_returns_empty_rejection_reason_when_not_rejected(self):
        ProviderProfile.objects.update_or_create(user=self.provider_user, defaults={'profile_completed': True})
        ProviderManualVerification.objects.create(
            provider=self.provider_user,
            id_front_image='provider_verification/id_front/test.jpg',
            id_back_image='provider_verification/id_back/test.jpg',
            selfie_image='provider_verification/selfie/test.jpg',
            status=ProviderManualVerification.STATUS_PENDING,
        )

        self._auth_as(self.provider_user)
        response = self.client.get('/api/v1/provider/onboarding/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('rejection_reason'), '')
