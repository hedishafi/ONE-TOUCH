from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import ProviderProfile, User
from services.models import ProviderCategoryPricing, Service, ServiceCategory


class ServicesViewSetTests(APITestCase):
    def setUp(self):
        self.category = ServiceCategory.objects.create(name='Plumbing', description='Plumbing works')

        self.provider_user = User.objects.create_user(
            username='provider_user',
            password='pass12345',
            phone_number='+251911000001',
            role=User.ROLE_PROVIDER,
        )
        self.provider_profile = ProviderProfile.objects.create(user=self.provider_user)

        self.other_provider_user = User.objects.create_user(
            username='other_provider',
            password='pass12345',
            phone_number='+251911000002',
            role=User.ROLE_PROVIDER,
        )
        self.other_provider_profile = ProviderProfile.objects.create(user=self.other_provider_user)

        self.admin_user = User.objects.create_user(
            username='admin_user',
            password='pass12345',
            phone_number='+251911000003',
            role=User.ROLE_ADMIN,
            is_staff=True,
        )

    def test_public_can_list_categories(self):
        url = reverse('service-category-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_provider_can_create_own_category_pricing(self):
        self.client.force_authenticate(self.provider_user)
        url = reverse('provider-category-pricing-list')

        payload = {
            'category_id': self.category.id,
            'min_price': '100.00',
            'max_price': '150.00',
        }
        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProviderCategoryPricing.objects.count(), 1)
        pricing = ProviderCategoryPricing.objects.first()
        self.assertEqual(pricing.provider_id, self.provider_profile.id)

    def test_provider_service_create_fails_when_pricing_missing(self):
        self.client.force_authenticate(self.provider_user)
        url = reverse('service-list')

        payload = {
            'category_id': self.category.id,
            'title': 'Leak Repair',
            'description': 'Fix sink leak',
            'base_price': '120.00',
        }
        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('provider_ids', response.data)

    def test_provider_service_create_succeeds_with_valid_pricing(self):
        ProviderCategoryPricing.objects.create(
            provider=self.provider_profile,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('150.00'),
        )

        self.client.force_authenticate(self.provider_user)
        url = reverse('service-list')
        payload = {
            'category_id': self.category.id,
            'title': 'Leak Repair',
            'description': 'Fix sink leak',
            'base_price': '120.00',
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        service = Service.objects.get(title='Leak Repair')
        self.assertEqual(service.providers.count(), 1)
        self.assertEqual(service.providers.first().id, self.provider_profile.id)

    def test_provider_cannot_manage_another_provider_service(self):
        ProviderCategoryPricing.objects.create(
            provider=self.other_provider_profile,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('150.00'),
        )
        service = Service.objects.create(
            category=self.category,
            title='Pipe Install',
            description='Install new pipes',
            base_price=Decimal('120.00'),
        )
        service.providers.add(self.other_provider_profile)

        self.client.force_authenticate(self.provider_user)
        url = reverse('service-detail', kwargs={'pk': service.id})

        response = self.client.patch(url, {'title': 'Unauthorized Edit'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_service_for_multiple_providers(self):
        ProviderCategoryPricing.objects.create(
            provider=self.provider_profile,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('200.00'),
        )
        ProviderCategoryPricing.objects.create(
            provider=self.other_provider_profile,
            category=self.category,
            min_price=Decimal('80.00'),
            max_price=Decimal('200.00'),
        )

        self.client.force_authenticate(self.admin_user)
        url = reverse('service-list')
        payload = {
            'category_id': self.category.id,
            'title': 'Full Pipe Work',
            'description': 'Install and repair',
            'base_price': '150.00',
            'provider_ids': [self.provider_profile.id, self.other_provider_profile.id],
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        service = Service.objects.get(title='Full Pipe Work')
        self.assertEqual(service.providers.count(), 2)
