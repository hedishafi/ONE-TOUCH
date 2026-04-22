from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.test import APIClient

from accounts.tests.base import AuthScenarioBase


class LogoutFlowTests(AuthScenarioBase):
    def test_logout_requires_authentication(self):
        response = self.client.post('/api/v1/auth/logout/', {'refresh': 'dummy'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_csrf_even_when_authenticated(self):
        access = str(RefreshToken.for_user(self.client_user).access_token)
        api_client = APIClient()
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        response = api_client.post('/api/v1/auth/logout/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('csrf', response.data.get('detail', '').lower())

    def test_logout_success_blacklists_refresh_token(self):
        refresh = str(RefreshToken.for_user(self.client_user))
        access = str(RefreshToken.for_user(self.client_user).access_token)
        api_client, csrf = self.csrf_client(access)

        logout_response = api_client.post(
            '/api/v1/auth/logout/',
            {'refresh': refresh},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

        refresh_response = api_client.post(
            '/api/v1/auth/token/refresh/',
            {'refresh': refresh},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertIn(refresh_response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_logout_without_refresh_token_still_succeeds(self):
        access = str(RefreshToken.for_user(self.client_user).access_token)
        api_client, csrf = self.csrf_client(access)

        response = api_client.post(
            '/api/v1/auth/logout/',
            {},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_clears_refresh_cookie(self):
        refresh = str(RefreshToken.for_user(self.client_user))
        access = str(RefreshToken.for_user(self.client_user).access_token)
        api_client, csrf = self.csrf_client(access)

        response = api_client.post(
            '/api/v1/auth/logout/',
            {'refresh': refresh},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('refresh_token', response.cookies)
        self.assertEqual(response.cookies['refresh_token'].value, '')

    def test_logout_with_invalid_refresh_token_still_succeeds(self):
        access = str(RefreshToken.for_user(self.client_user).access_token)
        api_client, csrf = self.csrf_client(access)

        response = api_client.post(
            '/api/v1/auth/logout/',
            {'refresh': 'invalid_token'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('successfully logged out', response.data.get('detail', '').lower())

    def test_logout_with_provider_user(self):
        refresh = str(RefreshToken.for_user(self.provider_user))
        access = str(RefreshToken.for_user(self.provider_user).access_token)
        api_client, csrf = self.csrf_client(access)

        response = api_client.post(
            '/api/v1/auth/logout/',
            {'refresh': refresh},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
