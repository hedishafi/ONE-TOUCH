from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from accounts.models import ProviderProfile, User
from services.models import ProviderCategoryPricing, ProviderSkill, Service, ServiceCategory, Skill


class ServicesModelTests(TestCase):
    def setUp(self):
        self.provider_user_1 = User.objects.create_user(
            username='provider1',
            password='pass12345',
            phone_number='+251900000001',
            role=User.ROLE_PROVIDER,
        )
        self.provider_user_2 = User.objects.create_user(
            username='provider2',
            password='pass12345',
            phone_number='+251900000002',
            role=User.ROLE_PROVIDER,
        )

        self.provider_1 = ProviderProfile.objects.create(user=self.provider_user_1)
        self.provider_2 = ProviderProfile.objects.create(user=self.provider_user_2)

        self.category = ServiceCategory.objects.create(
            name='Electrical Repair',
            icon='bolt',
            description='Electrical services',
        )
        self.skill = Skill.objects.create(name='Wiring')

    def test_service_category_slug_auto_generated(self):
        category = ServiceCategory.objects.create(name='Home Cleaning')
        self.assertEqual(category.slug, 'home-cleaning')

    def test_skill_slug_auto_generated(self):
        skill = Skill.objects.create(name='Pipe Repair')
        self.assertEqual(skill.slug, 'pipe-repair')

    def test_provider_skill_unique_per_provider_and_skill(self):
        ProviderSkill.objects.create(provider=self.provider_1, skill=self.skill)

        with self.assertRaises(IntegrityError):
            ProviderSkill.objects.create(provider=self.provider_1, skill=self.skill)

    def test_service_supports_many_providers(self):
        service = Service.objects.create(
            category=self.category,
            title='Electric Installation',
            description='Complete wiring setup',
            base_price=Decimal('500.00'),
        )
        service.providers.add(self.provider_1, self.provider_2)

        provider_ids = set(service.providers.values_list('id', flat=True))
        self.assertEqual(provider_ids, {self.provider_1.id, self.provider_2.id})

    def test_provider_can_be_on_multiple_services(self):
        service_1 = Service.objects.create(
            category=self.category,
            title='Electric Diagnostics',
            description='Fault detection',
            base_price=Decimal('250.00'),
        )
        service_2 = Service.objects.create(
            category=self.category,
            title='Panel Upgrade',
            description='Panel maintenance and upgrades',
            base_price=Decimal('1000.00'),
        )

        service_1.providers.add(self.provider_1)
        service_2.providers.add(self.provider_1)

        titles = set(self.provider_1.services.values_list('title', flat=True))
        self.assertEqual(titles, {'Electric Diagnostics', 'Panel Upgrade'})

    def test_provider_category_pricing_accepts_valid_range(self):
        pricing = ProviderCategoryPricing(
            provider=self.provider_1,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('150.00'),
        )

        pricing.full_clean()
        pricing.save()

        self.assertEqual(ProviderCategoryPricing.objects.count(), 1)

    def test_provider_category_pricing_rejects_min_greater_or_equal_max(self):
        pricing = ProviderCategoryPricing(
            provider=self.provider_1,
            category=self.category,
            min_price=Decimal('200.00'),
            max_price=Decimal('200.00'),
        )

        with self.assertRaises(ValidationError) as ctx:
            pricing.full_clean()

        self.assertIn('Minimum price must be less than maximum price.', str(ctx.exception))

    def test_provider_category_pricing_rejects_range_gap_over_50_percent(self):
        pricing = ProviderCategoryPricing(
            provider=self.provider_1,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('151.00'),
        )

        with self.assertRaises(ValidationError) as ctx:
            pricing.full_clean()

        self.assertIn('Maximum price cannot exceed 50% above minimum price.', str(ctx.exception))

    def test_provider_category_pricing_allows_exactly_50_percent_gap(self):
        pricing = ProviderCategoryPricing(
            provider=self.provider_1,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('150.00'),
        )

        pricing.full_clean()

    def test_provider_category_pricing_unique_per_provider_category(self):
        ProviderCategoryPricing.objects.create(
            provider=self.provider_1,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('150.00'),
        )

        duplicate = ProviderCategoryPricing(
            provider=self.provider_1,
            category=self.category,
            min_price=Decimal('110.00'),
            max_price=Decimal('160.00'),
        )

        with self.assertRaises(ValidationError):
            duplicate.validate_unique()
