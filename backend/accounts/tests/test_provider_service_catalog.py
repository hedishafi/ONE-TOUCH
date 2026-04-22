from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import ServiceCategory, SubService
from accounts.tests.base import AuthScenarioBase


class ProviderServiceCatalogTests(AuthScenarioBase):
    def _auth_as_provider(self):
        access = str(RefreshToken.for_user(self.provider_user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def _auth_as_client(self):
        access = str(RefreshToken.for_user(self.client_user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_service_categories_requires_authentication(self):
        response = self.client.get('/api/v1/provider/service-categories/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_service_categories_rejects_client_role(self):
        self._auth_as_client()
        response = self.client.get('/api/v1/provider/service-categories/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_service_categories_returns_only_active_categories(self):
        ServiceCategory.objects.create(name='Plumbing', slug='plumbing', is_active=True)
        ServiceCategory.objects.create(name='Electrical', slug='electrical', is_active=False)

        self._auth_as_provider()
        response = self.client.get('/api/v1/provider/service-categories/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item['name'] for item in response.data.get('results', [])]
        self.assertIn('Plumbing', names)
        self.assertNotIn('Electrical', names)

    def test_sub_services_requires_authentication(self):
        response = self.client.get('/api/v1/provider/service-categories/1/sub-services/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sub_services_rejects_client_role(self):
        self._auth_as_client()
        response = self.client.get('/api/v1/provider/service-categories/1/sub-services/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sub_services_returns_only_active_for_given_category(self):
        category = ServiceCategory.objects.create(name='Cleaning', slug='cleaning', is_active=True)
        other = ServiceCategory.objects.create(name='IT', slug='it', is_active=True)

        SubService.objects.create(category=category, name='Deep Clean', slug='deep-clean', is_active=True)
        SubService.objects.create(category=category, name='Window Clean', slug='window-clean', is_active=False)
        SubService.objects.create(category=other, name='Printer Setup', slug='printer-setup', is_active=True)

        self._auth_as_provider()
        response = self.client.get(f'/api/v1/provider/service-categories/{category.id}/sub-services/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'Deep Clean')
        self.assertEqual(results[0]['category_id'], category.id)

    def test_sub_services_returns_empty_list_for_unknown_category(self):
        self._auth_as_provider()
        response = self.client.get('/api/v1/provider/service-categories/999999/sub-services/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('results'), [])

    def test_service_categories_ordered_by_name(self):
        ServiceCategory.objects.create(name='Zebra Service', slug='zebra', is_active=True)
        ServiceCategory.objects.create(name='Alpha Service', slug='alpha', is_active=True)
        ServiceCategory.objects.create(name='Beta Service', slug='beta', is_active=True)

        self._auth_as_provider()
        response = self.client.get('/api/v1/provider/service-categories/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item['name'] for item in response.data.get('results', [])]
        self.assertEqual(names, sorted(names))

    def test_sub_services_ordered_by_name(self):
        category = ServiceCategory.objects.create(name='Testing', slug='testing', is_active=True)
        SubService.objects.create(category=category, name='Zulu Task', slug='zulu', is_active=True)
        SubService.objects.create(category=category, name='Alpha Task', slug='alpha-task', is_active=True)
        SubService.objects.create(category=category, name='Beta Task', slug='beta-task', is_active=True)

        self._auth_as_provider()
        response = self.client.get(f'/api/v1/provider/service-categories/{category.id}/sub-services/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [item['name'] for item in response.data.get('results', [])]
        self.assertEqual(names, sorted(names))

    def test_service_categories_includes_id_and_slug(self):
        category = ServiceCategory.objects.create(name='Test Category', slug='test-cat', is_active=True)

        self._auth_as_provider()
        response = self.client.get('/api/v1/provider/service-categories/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', [])
        test_cat = next((item for item in results if item['name'] == 'Test Category'), None)
        self.assertIsNotNone(test_cat)
        self.assertEqual(test_cat['id'], category.id)
        self.assertEqual(test_cat['slug'], 'test-cat')

    def test_sub_services_includes_category_id(self):
        category = ServiceCategory.objects.create(name='Home Repair', slug='home-repair', is_active=True)
        sub = SubService.objects.create(category=category, name='Door Fix', slug='door-fix', is_active=True)

        self._auth_as_provider()
        response = self.client.get(f'/api/v1/provider/service-categories/{category.id}/sub-services/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['category_id'], category.id)
        self.assertEqual(results[0]['id'], sub.id)
