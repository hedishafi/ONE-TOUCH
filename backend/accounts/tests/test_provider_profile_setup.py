from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import ProviderProfile
from services.models import ProviderService, ServiceCategory, SubService
from accounts.tests.base import AuthScenarioBase

User = get_user_model()


class ProviderProfileSetupTests(AuthScenarioBase):
    def _auth_as(self, user):
        access = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_profile_setup_requires_authentication(self):
        response = self.client.post('/api/v1/provider/profile/', {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_setup_rejects_client_role(self):
        self._auth_as(self.client_user)
        response = self.client.post('/api/v1/provider/profile/', {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_profile_setup_success_creates_profile_and_services(self):
        self._auth_as(self.provider_user)
        ServiceCategory.objects.create(name='Plumbing', slug='plumbing', is_active=True)
        SubService.objects.create(category=ServiceCategory.objects.get(name='Plumbing'), name='Leak Fix', slug='leak-fix', is_active=True)
        SubService.objects.create(category=ServiceCategory.objects.get(name='Plumbing'), name='Pipe Repair', slug='pipe-repair', is_active=True)

        payload = {
            'full_name': 'Abebe Kebede',
            'service_category': 'Plumbing',
            'sub_services': ['Leak Fix', 'Pipe Repair'],
            'price_min': 200,
            'price_max': 500,
            'bio': 'Experienced technician',
        }
        response = self.client.post('/api/v1/provider/profile/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('full_name'), 'Abebe Kebede')
        self.assertEqual(response.data.get('service_category'), 'Plumbing')
        self.assertEqual(response.data.get('sub_services'), ['Leak Fix', 'Pipe Repair'])
        self.assertTrue(response.data.get('profile_completed'))

        self.provider_user.refresh_from_db()
        self.assertEqual(self.provider_user.first_name, 'Abebe')
        self.assertEqual(self.provider_user.last_name, 'Kebede')

        provider_profile = ProviderProfile.objects.get(user=self.provider_user)
        self.assertTrue(provider_profile.profile_completed)
        self.assertEqual(int(provider_profile.price_min), 200)
        self.assertEqual(int(provider_profile.price_max), 500)

        provider_service = ProviderService.objects.get(provider=provider_profile)
        self.assertEqual(provider_service.primary_service.name, 'Plumbing')
        self.assertEqual(provider_service.subservices.count(), 2)

    def test_profile_setup_rejects_price_min_greater_than_price_max(self):
        self._auth_as(self.provider_user)
        ServiceCategory.objects.create(name='Electrical', slug='electrical', is_active=True)
        SubService.objects.create(
            category=ServiceCategory.objects.get(name='Electrical'),
            name='Wiring',
            slug='wiring',
            is_active=True,
        )

        response = self.client.post(
            '/api/v1/provider/profile/',
            {
                'full_name': 'Abebe Kebede',
                'service_category': 'Electrical',
                'sub_services': ['Wiring'],
                'price_min': 800,
                'price_max': 500,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price_max', response.data)

    def test_profile_setup_rejects_empty_sub_services(self):
        self._auth_as(self.provider_user)
        ServiceCategory.objects.create(name='Electrical', slug='electrical', is_active=True)

        response = self.client.post(
            '/api/v1/provider/profile/',
            {
                'full_name': 'Abebe Kebede',
                'service_category': 'Electrical',
                'sub_services': [],
                'price_min': 100,
                'price_max': 500,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sub_services', response.data)

    def test_profile_setup_uses_existing_category_and_subservices_case_insensitive(self):
        category = ServiceCategory.objects.create(name='Cleaning', slug='cleaning', is_active=True)
        existing_sub = SubService.objects.create(category=category, name='Deep Clean', slug='deep-clean', is_active=True)

        self._auth_as(self.provider_user)
        response = self.client.post(
            '/api/v1/provider/profile/',
            {
                'full_name': 'Abebe Kebede',
                'service_category': 'cleaning',
                'sub_services': ['deep clean'],
                'price_min': 100,
                'price_max': 300,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ServiceCategory.objects.filter(name__iexact='cleaning').count(), 1)
        self.assertEqual(SubService.objects.filter(category=category, name__iexact='deep clean').count(), 1)
        self.assertTrue(SubService.objects.filter(id=existing_sub.id).exists())

    def test_profile_setup_rejects_unknown_service_category(self):
        self._auth_as(self.provider_user)

        response = self.client.post(
            '/api/v1/provider/profile/',
            {
                'full_name': 'Abebe Kebede',
                'service_category': 'Non Existing Category',
                'sub_services': ['Anything'],
                'price_min': 100,
                'price_max': 300,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('service_category', response.data)

    def test_profile_setup_rejects_sub_service_not_in_selected_category(self):
        plumbing = ServiceCategory.objects.create(name='Plumbing', slug='plumbing', is_active=True)
        cleaning = ServiceCategory.objects.create(name='Cleaning', slug='cleaning', is_active=True)
        SubService.objects.create(category=plumbing, name='Leak Fix', slug='leak-fix', is_active=True)
        SubService.objects.create(category=cleaning, name='Deep Clean', slug='deep-clean', is_active=True)

        self._auth_as(self.provider_user)
        response = self.client.post(
            '/api/v1/provider/profile/',
            {
                'full_name': 'Abebe Kebede',
                'service_category': 'Plumbing',
                'sub_services': ['Deep Clean'],
                'price_min': 100,
                'price_max': 300,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sub_services', response.data)

    def test_profile_setup_rejects_inactive_sub_service(self):
        category = ServiceCategory.objects.create(name='Painting', slug='painting', is_active=True)
        SubService.objects.create(category=category, name='Wall Paint', slug='wall-paint', is_active=False)

        self._auth_as(self.provider_user)
        response = self.client.post(
            '/api/v1/provider/profile/',
            {
                'full_name': 'Abebe Kebede',
                'service_category': 'Painting',
                'sub_services': ['Wall Paint'],
                'price_min': 100,
                'price_max': 300,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sub_services', response.data)

    def test_profile_setup_updates_existing_profile(self):
        ProviderProfile.objects.create(
            user=self.provider_user,
            bio='Old bio',
            price_min=100,
            price_max=200,
            profile_completed=False,
        )

        category = ServiceCategory.objects.create(name='Carpentry', slug='carpentry', is_active=True)
        SubService.objects.create(category=category, name='Furniture Repair', slug='furniture-repair', is_active=True)

        self._auth_as(self.provider_user)
        response = self.client.post(
            '/api/v1/provider/profile/',
            {
                'full_name': 'Kebede Abebe',
                'service_category': 'Carpentry',
                'sub_services': ['Furniture Repair'],
                'price_min': 300,
                'price_max': 600,
                'bio': 'New bio',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.provider_user.refresh_from_db()
        profile = ProviderProfile.objects.get(user=self.provider_user)
        self.assertEqual(profile.bio, 'New bio')
        self.assertEqual(int(profile.price_min), 300)
        self.assertEqual(int(profile.price_max), 600)
        self.assertTrue(profile.profile_completed)

    def test_profile_setup_rejects_negative_prices(self):
        category = ServiceCategory.objects.create(name='Gardening', slug='gardening', is_active=True)
        SubService.objects.create(category=category, name='Lawn Mowing', slug='lawn-mowing', is_active=True)

        self._auth_as(self.provider_user)
        response = self.client.post(
            '/api/v1/provider/profile/',
            {
                'full_name': 'Abebe Kebede',
                'service_category': 'Gardening',
                'sub_services': ['Lawn Mowing'],
                'price_min': -100,
                'price_max': 300,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_setup_rejects_missing_full_name(self):
        category = ServiceCategory.objects.create(name='Painting', slug='painting', is_active=True)
        SubService.objects.create(category=category, name='Wall Paint', slug='wall-paint', is_active=True)

        self._auth_as(self.provider_user)
        response = self.client.post(
            '/api/v1/provider/profile/',
            {
                'service_category': 'Painting',
                'sub_services': ['Wall Paint'],
                'price_min': 100,
                'price_max': 300,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('full_name', response.data)
