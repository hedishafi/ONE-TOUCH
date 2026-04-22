from django.urls import reverse

from accounts.admin import ServiceCategoryAdmin, SubServiceAdmin, ProviderServiceAdmin
from accounts.models import ServiceCategory, SubService, ProviderService, ProviderProfile
from accounts.tests.admin_base import AdminTestBase


class ServiceCategoryAdminTests(AdminTestBase):
    """Tests for ServiceCategory admin interface"""

    def setUp(self):
        super().setUp()
        self.category_admin = ServiceCategoryAdmin(ServiceCategory, self.site)

    def test_admin_can_access_service_category_list(self):
        self.login_admin()
        url = reverse('admin:accounts_servicecategory_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_staff_can_access_service_category_list(self):
        self.login_staff()
        url = reverse('admin:accounts_servicecategory_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_non_staff_cannot_access_service_category_list(self):
        self.client.force_login(self.client_user)
        url = reverse('admin:accounts_servicecategory_changelist')
        response = self.client.get(url)

        self.assertAdminAccessDenied(response)

    def test_admin_can_view_service_category_detail(self):
        self.login_admin()
        url = reverse(
            'admin:accounts_servicecategory_change', args=[self.service_category.id]
        )
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.service_category.name)

    def test_admin_can_filter_by_active_status(self):
        self.login_admin()
        url = reverse('admin:accounts_servicecategory_changelist')
        response = self.client.get(url, {'is_active': 'True'})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_search_by_name(self):
        self.login_admin()
        url = reverse('admin:accounts_servicecategory_changelist')
        response = self.client.get(url, {'q': 'Plumbing'})

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Plumbing')

    def test_admin_can_search_by_slug(self):
        self.login_admin()
        url = reverse('admin:accounts_servicecategory_changelist')
        response = self.client.get(url, {'q': 'plumbing'})

        self.assertEqual(response.status_code, 200)


class SubServiceAdminTests(AdminTestBase):
    """Tests for SubService admin interface"""

    def setUp(self):
        super().setUp()
        self.subservice_admin = SubServiceAdmin(SubService, self.site)

    def test_admin_can_access_subservice_list(self):
        self.login_admin()
        url = reverse('admin:accounts_subservice_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_admin_can_view_subservice_detail(self):
        self.login_admin()
        url = reverse('admin:accounts_subservice_change', args=[self.sub_service.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.sub_service.name)

    def test_admin_can_filter_by_category(self):
        self.login_admin()
        url = reverse('admin:accounts_subservice_changelist')
        response = self.client.get(url, {'category': self.service_category.id})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_filter_by_active_status(self):
        self.login_admin()
        url = reverse('admin:accounts_subservice_changelist')
        response = self.client.get(url, {'is_active': 'True'})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_search_by_name(self):
        self.login_admin()
        url = reverse('admin:accounts_subservice_changelist')
        response = self.client.get(url, {'q': 'Leak Fix'})

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Leak Fix')

    def test_list_display_includes_required_fields(self):
        expected_fields = ['name', 'category', 'slug', 'is_active', 'created_at']
        for field in expected_fields:
            self.assertIn(field, self.subservice_admin.list_display)


class ProviderServiceAdminTests(AdminTestBase):
    """Tests for ProviderService admin interface"""

    def setUp(self):
        super().setUp()
        self.provider_service_admin = ProviderServiceAdmin(ProviderService, self.site)
        self.provider_profile = ProviderProfile.objects.get(user=self.provider_user)
        self.provider_service = ProviderService.objects.create(
            provider=self.provider_profile,
            primary_service=self.service_category,
        )
        self.provider_service.subservices.add(self.sub_service)

    def test_admin_can_access_provider_service_list(self):
        self.login_admin()
        url = reverse('admin:accounts_providerservice_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_admin_can_view_provider_service_detail(self):
        self.login_admin()
        url = reverse(
            'admin:accounts_providerservice_change', args=[self.provider_service.id]
        )
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_admin_can_filter_by_primary_service(self):
        self.login_admin()
        url = reverse('admin:accounts_providerservice_changelist')
        response = self.client.get(
            url, {'primary_service': self.service_category.id}
        )

        self.assertEqual(response.status_code, 200)

    def test_admin_can_search_by_provider_username(self):
        self.login_admin()
        url = reverse('admin:accounts_providerservice_changelist')
        response = self.client.get(url, {'q': self.provider_user.username})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_search_by_service_name(self):
        self.login_admin()
        url = reverse('admin:accounts_providerservice_changelist')
        response = self.client.get(url, {'q': 'Plumbing'})

        self.assertEqual(response.status_code, 200)

    def test_subservice_count_display_shows_correct_count(self):
        count = self.provider_service_admin.subservice_count(self.provider_service)
        self.assertEqual(count, 1)

    def test_subservice_count_display_shows_zero_when_none(self):
        self.provider_service.subservices.clear()
        count = self.provider_service_admin.subservice_count(self.provider_service)
        self.assertEqual(count, 0)

    def test_list_display_includes_required_fields(self):
        expected_fields = [
            'provider_name_display',  # Changed from 'provider'
            'provider_uid_display',  # Added
            'primary_service',
            'subservice_count',
            'created_at',
        ]
        for field in expected_fields:
            self.assertIn(field, self.provider_service_admin.list_display)

    def test_admin_can_update_provider_service(self):
        new_category = ServiceCategory.objects.create(
            name='Electrical', slug='electrical', is_active=True
        )
        self.login_admin()
        url = reverse(
            'admin:accounts_providerservice_change', args=[self.provider_service.id]
        )

        response = self.client.post(url, {
            'provider': self.provider_profile.id,
            'primary_service': new_category.id,
            'subservices': [self.sub_service.id],
        })

        self.provider_service.refresh_from_db()
        self.assertEqual(self.provider_service.primary_service, new_category)

    def test_admin_can_add_multiple_subservices(self):
        sub2 = SubService.objects.create(
            category=self.service_category,
            name='Pipe Repair',
            slug='pipe-repair',
            is_active=True,
        )

        self.login_admin()
        url = reverse(
            'admin:accounts_providerservice_change', args=[self.provider_service.id]
        )

        response = self.client.post(url, {
            'provider': self.provider_profile.id,
            'primary_service': self.service_category.id,
            'subservices': [self.sub_service.id, sub2.id],
        })

        self.provider_service.refresh_from_db()
        self.assertEqual(self.provider_service.subservices.count(), 2)
