from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import ProviderManualVerification
from accounts.tests.base import AuthScenarioBase

User = get_user_model()


class ProviderManualVerificationUploadTests(AuthScenarioBase):
    def _auth_as(self, user):
        access = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def _image_file(self, name='id.png', content_type='image/png', content=None):
        data = content or (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff?\x00\x05\xfe\x02\xfeA\xed\xd4\xb6\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        return SimpleUploadedFile(name, data, content_type=content_type)

    def test_upload_requires_authentication(self):
        response = self.client.post('/api/v1/provider/manual-verification/upload/', {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_rejects_client_role(self):
        self._auth_as(self.client_user)
        response = self.client.post('/api/v1/provider/manual-verification/upload/', {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_upload_success_creates_pending_verification_and_updates_user_status(self):
        self._auth_as(self.provider_user)

        response = self.client.post(
            '/api/v1/provider/manual-verification/upload/',
            {
                'id_front_image': self._image_file('front.png'),
                'id_back_image': self._image_file('back.png'),
                'selfie_image': self._image_file('selfie.png'),
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data.get('status'), ProviderManualVerification.STATUS_PENDING)

        created = ProviderManualVerification.objects.get(id=response.data['id'])
        self.assertEqual(created.provider, self.provider_user)
        self.assertEqual(created.status, ProviderManualVerification.STATUS_PENDING)

        self.provider_user.refresh_from_db()
        self.assertEqual(self.provider_user.verification_status, User.STATUS_PENDING)

    def test_upload_rejects_unsupported_content_type(self):
        self._auth_as(self.provider_user)

        response = self.client.post(
            '/api/v1/provider/manual-verification/upload/',
            {
                'id_front_image': self._image_file('front.gif', content_type='image/gif'),
                'id_back_image': self._image_file('back.png'),
                'selfie_image': self._image_file('selfie.png'),
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('id_front_image', response.data)

    def test_upload_rejects_missing_required_fields(self):
        self._auth_as(self.provider_user)

        response = self.client.post(
            '/api/v1/provider/manual-verification/upload/',
            {
                'id_front_image': self._image_file('front.png'),
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('id_back_image', response.data)
        self.assertIn('selfie_image', response.data)

    def test_upload_allows_resubmission_after_rejection(self):
        self._auth_as(self.provider_user)

        first_response = self.client.post(
            '/api/v1/provider/manual-verification/upload/',
            {
                'id_front_image': self._image_file('front1.png'),
                'id_back_image': self._image_file('back1.png'),
                'selfie_image': self._image_file('selfie1.png'),
            },
            format='multipart',
        )
        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)

        first_verification = ProviderManualVerification.objects.get(id=first_response.data['id'])
        first_verification.status = ProviderManualVerification.STATUS_REJECTED
        first_verification.rejection_reason = 'Blurry image'
        first_verification.save()

        second_response = self.client.post(
            '/api/v1/provider/manual-verification/upload/',
            {
                'id_front_image': self._image_file('front2.png'),
                'id_back_image': self._image_file('back2.png'),
                'selfie_image': self._image_file('selfie2.png'),
            },
            format='multipart',
        )

        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProviderManualVerification.objects.filter(provider=self.provider_user).count(), 2)

    def test_upload_creates_verification_with_correct_provider(self):
        self._auth_as(self.provider_user)

        response = self.client.post(
            '/api/v1/provider/manual-verification/upload/',
            {
                'id_front_image': self._image_file('front.png'),
                'id_back_image': self._image_file('back.png'),
                'selfie_image': self._image_file('selfie.png'),
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        verification = ProviderManualVerification.objects.get(id=response.data['id'])
        self.assertEqual(verification.provider.id, self.provider_user.id)
        self.assertIsNone(verification.reviewed_by)
        self.assertIsNone(verification.reviewed_at)

    def test_rejected_provider_can_resubmit_while_in_client_role(self):
        """
        Test that a rejected provider who switches to client role can still
        access the verification upload endpoint using has_provider_role check.
        """
        # Setup: Provider submits verification
        self._auth_as(self.provider_user)
        first_response = self.client.post(
            '/api/v1/provider/manual-verification/upload/',
            {
                'id_front_image': self._image_file('front1.png'),
                'id_back_image': self._image_file('back1.png'),
                'selfie_image': self._image_file('selfie1.png'),
            },
            format='multipart',
        )
        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)

        # Admin rejects the verification
        verification = ProviderManualVerification.objects.get(id=first_response.data['id'])
        verification.status = ProviderManualVerification.STATUS_REJECTED
        verification.rejection_reason = 'Document not clear'
        verification.save()
        
        self.provider_user.verification_status = User.STATUS_REJECTED
        self.provider_user.save()

        # User switches to client role (simulating role switch)
        self.provider_user.role = User.ROLE_CLIENT
        self.provider_user.save()
        self.provider_user.refresh_from_db()
        
        # Verify user is in client role but still has provider capability
        self.assertEqual(self.provider_user.role, User.ROLE_CLIENT)
        self.assertTrue(self.provider_user.has_provider_role)

        # Re-authenticate with updated user state
        self._auth_as(self.provider_user)

        # User should still be able to resubmit verification
        # because IsProvider now checks has_provider_role instead of role
        resubmit_response = self.client.post(
            '/api/v1/provider/manual-verification/upload/',
            {
                'id_front_image': self._image_file('front2.png'),
                'id_back_image': self._image_file('back2.png'),
                'selfie_image': self._image_file('selfie2.png'),
            },
            format='multipart',
        )

        # Should succeed because has_provider_role=True
        self.assertEqual(resubmit_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProviderManualVerification.objects.filter(provider=self.provider_user).count(), 2)
        
        # Verify the new verification was created
        new_verification = ProviderManualVerification.objects.get(id=resubmit_response.data['id'])
        self.assertEqual(new_verification.status, ProviderManualVerification.STATUS_PENDING)
        self.assertEqual(new_verification.provider, self.provider_user)
