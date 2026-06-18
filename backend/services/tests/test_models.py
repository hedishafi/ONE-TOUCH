from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.utils import timezone

from accounts.models import ProviderProfile, User
from services.models import (
    ProviderCategoryPricing,
    ProviderService,
    ProviderSkill,
    Service,
    ServiceCategory,
    Skill,
    SubService,
)


class ServicesModelBaseTestCase(TestCase):
    def create_provider(self, idx):
        user = User.objects.create_user(
            username=f'provider{idx}',
            password='pass12345',
            phone_number=f'+2519000000{idx:02d}',
            role=User.ROLE_PROVIDER,
        )
        return ProviderProfile.objects.create(user=user)


class ServiceCategoryModelTests(ServicesModelBaseTestCase):
    def test_slug_auto_generated_from_name(self):
        category = ServiceCategory.objects.create(name='Home Cleaning')
        self.assertEqual(category.slug, 'home-cleaning')

    def test_slug_preserved_when_provided(self):
        category = ServiceCategory.objects.create(name='Electrical', slug='custom-electrical')
        self.assertEqual(category.slug, 'custom-electrical')

    def test_string_representation_returns_name(self):
        category = ServiceCategory.objects.create(name='Plumbing')
        self.assertEqual(str(category), 'Plumbing')

    def test_default_is_active_is_true(self):
        category = ServiceCategory.objects.create(name='Carpentry')
        self.assertTrue(category.is_active)

    def test_ordering_by_name(self):
        ServiceCategory.objects.create(name='Zeta')
        ServiceCategory.objects.create(name='Alpha')
        ordered_names = list(ServiceCategory.objects.values_list('name', flat=True))
        self.assertEqual(ordered_names, ['Alpha', 'Zeta'])

    def test_name_must_be_unique(self):
        ServiceCategory.objects.create(name='Painting')
        with self.assertRaises(IntegrityError):
            ServiceCategory.objects.create(name='Painting')


class SubServiceModelTests(ServicesModelBaseTestCase):
    def setUp(self):
        self.category = ServiceCategory.objects.create(name='Cleaning')

    def test_string_representation_includes_category_and_name(self):
        sub = SubService.objects.create(category=self.category, name='Deep Clean', slug='deep-clean')
        self.assertEqual(str(sub), 'Cleaning - Deep Clean')

    def test_default_is_active_is_true(self):
        sub = SubService.objects.create(category=self.category, name='Regular', slug='regular')
        self.assertTrue(sub.is_active)

    def test_unique_slug_per_category(self):
        SubService.objects.create(category=self.category, name='Move In', slug='move-in')
        with self.assertRaises(IntegrityError):
            SubService.objects.create(category=self.category, name='Move Out', slug='move-in')

    def test_same_slug_allowed_in_different_categories(self):
        other_category = ServiceCategory.objects.create(name='Painting')
        SubService.objects.create(category=self.category, name='Interior', slug='basic')
        sub = SubService.objects.create(category=other_category, name='Exterior', slug='basic')
        self.assertEqual(sub.slug, 'basic')

    def test_ordering_by_category_then_name(self):
        b_cat = ServiceCategory.objects.create(name='B Category')
        a_cat = ServiceCategory.objects.create(name='A Category')
        SubService.objects.create(category=b_cat, name='Z Job', slug='z-job')
        SubService.objects.create(category=a_cat, name='A Job', slug='a-job')
        first = SubService.objects.first()
        self.assertEqual(first.category.name, 'A Category')
        self.assertEqual(first.name, 'A Job')

    def test_deleting_category_cascades_subservices(self):
        SubService.objects.create(category=self.category, name='Steam Clean', slug='steam-clean')
        self.category.delete()
        self.assertEqual(SubService.objects.count(), 0)


class ProviderServiceModelTests(ServicesModelBaseTestCase):
    def setUp(self):
        self.provider = self.create_provider(1)
        self.category = ServiceCategory.objects.create(name='Plumbing')
        self.sub_1 = SubService.objects.create(category=self.category, name='Leak Fix', slug='leak-fix')
        self.sub_2 = SubService.objects.create(category=self.category, name='Pipe Install', slug='pipe-install')

    def test_string_representation_with_primary_service(self):
        offering = ProviderService.objects.create(provider=self.provider, primary_service=self.category)
        self.assertIn('plumbing', str(offering).lower())

    def test_string_representation_when_primary_service_missing(self):
        offering = ProviderService.objects.create(provider=self.provider, primary_service=None)
        self.assertIn('unassigned', str(offering).lower())

    def test_provider_has_one_to_one_service_offering(self):
        ProviderService.objects.create(provider=self.provider, primary_service=self.category)
        with self.assertRaises(IntegrityError):
            ProviderService.objects.create(provider=self.provider, primary_service=self.category)

    def test_subservices_many_to_many_assignment(self):
        offering = ProviderService.objects.create(provider=self.provider, primary_service=self.category)
        offering.subservices.add(self.sub_1, self.sub_2)
        self.assertEqual(offering.subservices.count(), 2)

    def test_primary_service_set_null_when_category_deleted(self):
        offering = ProviderService.objects.create(provider=self.provider, primary_service=self.category)
        self.category.delete()
        offering.refresh_from_db()
        self.assertIsNone(offering.primary_service)

    def test_provider_delete_cascades_provider_service(self):
        ProviderService.objects.create(provider=self.provider, primary_service=self.category)
        self.provider.delete()
        self.assertEqual(ProviderService.objects.count(), 0)


class SkillModelTests(ServicesModelBaseTestCase):
    def test_slug_auto_generated_from_name(self):
        skill = Skill.objects.create(name='Pipe Repair')
        self.assertEqual(skill.slug, 'pipe-repair')

    def test_slug_preserved_when_provided(self):
        skill = Skill.objects.create(name='AC Install', slug='ac-custom')
        self.assertEqual(skill.slug, 'ac-custom')

    def test_string_representation_returns_name(self):
        skill = Skill.objects.create(name='Wiring')
        self.assertEqual(str(skill), 'Wiring')

    def test_ordering_by_name(self):
        Skill.objects.create(name='Z Skill')
        Skill.objects.create(name='A Skill')
        ordered_names = list(Skill.objects.values_list('name', flat=True))
        self.assertEqual(ordered_names, ['A Skill', 'Z Skill'])

    def test_name_must_be_unique(self):
        Skill.objects.create(name='Tile Work')
        with self.assertRaises(IntegrityError):
            Skill.objects.create(name='Tile Work')


class ProviderSkillModelTests(ServicesModelBaseTestCase):
    def setUp(self):
        self.provider = self.create_provider(1)
        self.skill = Skill.objects.create(name='Wiring')

    def test_string_representation_contains_username_and_skill(self):
        provider_skill = ProviderSkill.objects.create(provider=self.provider, skill=self.skill)
        self.assertIn('provider1', str(provider_skill))
        self.assertIn('Wiring', str(provider_skill))

    def test_unique_provider_skill_pair(self):
        ProviderSkill.objects.create(provider=self.provider, skill=self.skill)
        with self.assertRaises(IntegrityError):
            ProviderSkill.objects.create(provider=self.provider, skill=self.skill)

    def test_related_name_available_on_provider(self):
        ProviderSkill.objects.create(provider=self.provider, skill=self.skill)
        self.assertEqual(self.provider.provider_skills.count(), 1)

    def test_related_name_available_on_skill(self):
        ProviderSkill.objects.create(provider=self.provider, skill=self.skill)
        self.assertEqual(self.skill.provider_skills.count(), 1)

    def test_deleting_skill_cascades_provider_skill(self):
        ProviderSkill.objects.create(provider=self.provider, skill=self.skill)
        self.skill.delete()
        self.assertEqual(ProviderSkill.objects.count(), 0)

    def test_deleting_provider_cascades_provider_skill(self):
        ProviderSkill.objects.create(provider=self.provider, skill=self.skill)
        self.provider.delete()
        self.assertEqual(ProviderSkill.objects.count(), 0)


class ServiceModelTests(ServicesModelBaseTestCase):
    def setUp(self):
        self.provider_1 = self.create_provider(1)
        self.provider_2 = self.create_provider(2)
        self.category = ServiceCategory.objects.create(name='Electrical Repair')

    def test_string_representation_returns_title(self):
        service = Service.objects.create(
            category=self.category,
            title='Panel Upgrade',
            description='Upgrade electrical panel',
            base_price=Decimal('1000.00'),
        )
        self.assertEqual(str(service), 'Panel Upgrade')

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
            title='Panel Maintenance',
            description='Maintenance',
            base_price=Decimal('350.00'),
        )
        service_1.providers.add(self.provider_1)
        service_2.providers.add(self.provider_1)
        self.assertEqual(self.provider_1.services.count(), 2)

    def test_category_delete_is_protected_when_service_exists(self):
        Service.objects.create(
            category=self.category,
            title='Emergency Repair',
            description='Urgent fixes',
            base_price=Decimal('300.00'),
        )
        with self.assertRaises(ProtectedError):
            self.category.delete()

    def test_description_allows_blank(self):
        service = Service.objects.create(
            category=self.category,
            title='Inspection',
            description='',
            base_price=Decimal('100.00'),
        )
        self.assertEqual(service.description, '')

    def test_ordering_by_created_at_desc(self):
        older = Service.objects.create(
            category=self.category,
            title='Older Service',
            description='older',
            base_price=Decimal('100.00'),
        )
        newer = Service.objects.create(
            category=self.category,
            title='Newer Service',
            description='newer',
            base_price=Decimal('120.00'),
        )

        # Make timestamps deterministic to avoid flaky ordering when objects are
        # created within the same tick on fast test runners.
        now = timezone.now()
        Service.objects.filter(id=older.id).update(created_at=now - timezone.timedelta(days=1))
        Service.objects.filter(id=newer.id).update(created_at=now)

        ordered_ids = list(Service.objects.values_list('id', flat=True))
        self.assertEqual(ordered_ids[0], newer.id)
        self.assertEqual(ordered_ids[-1], older.id)


class ProviderCategoryPricingModelTests(ServicesModelBaseTestCase):
    def setUp(self):
        self.provider = self.create_provider(1)
        self.category = ServiceCategory.objects.create(name='HVAC')

    def test_accepts_valid_price_range(self):
        pricing = ProviderCategoryPricing(
            provider=self.provider,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('150.00'),
        )
        pricing.full_clean()
        pricing.save()
        self.assertEqual(ProviderCategoryPricing.objects.count(), 1)

    def test_rejects_min_greater_or_equal_max(self):
        pricing = ProviderCategoryPricing(
            provider=self.provider,
            category=self.category,
            min_price=Decimal('200.00'),
            max_price=Decimal('200.00'),
        )
        with self.assertRaises(ValidationError) as ctx:
            pricing.full_clean()
        self.assertIn('Minimum price must be less than maximum price.', str(ctx.exception))

    def test_rejects_range_gap_over_two_hundred_percent(self):
        pricing = ProviderCategoryPricing(
            provider=self.provider,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('301.00'),
        )
        with self.assertRaises(ValidationError) as ctx:
            pricing.full_clean()
        self.assertIn('Maximum price cannot exceed 200% above minimum price.', str(ctx.exception))

    def test_allows_exactly_two_hundred_percent_gap(self):
        pricing = ProviderCategoryPricing(
            provider=self.provider,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('300.00'),
        )
        pricing.full_clean()

    def test_unique_provider_category_pair(self):
        ProviderCategoryPricing.objects.create(
            provider=self.provider,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('140.00'),
        )
        duplicate = ProviderCategoryPricing(
            provider=self.provider,
            category=self.category,
            min_price=Decimal('110.00'),
            max_price=Decimal('150.00'),
        )
        with self.assertRaises(ValidationError):
            duplicate.validate_unique()

    def test_string_representation_contains_provider_category_and_range(self):
        pricing = ProviderCategoryPricing.objects.create(
            provider=self.provider,
            category=self.category,
            min_price=Decimal('100.00'),
            max_price=Decimal('130.00'),
        )
        text = str(pricing)
        self.assertIn('provider1', text)
        self.assertIn('HVAC', text)
        self.assertIn('100.00 - 130.00 ETB', text)
