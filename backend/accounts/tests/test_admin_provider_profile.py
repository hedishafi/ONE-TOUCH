from django.urls import reverse

from accounts.admin import ProviderProfileAdmin
from accounts.models import ProviderProfile
from accounts.tests.admin_base import AdminTestBase


class ProviderProfileAdminTests(AdminTestBase):
    """Tests for ProviderProfile admin interface"""

    def setUp(self):
        super().setUp()
        self.profile_admin = ProviderProfileAdmin(ProviderProfile, self.site)

    def test_admin_can_access_provider_profile_list(self):
        self.login_admin()
        url = reverse('admin:accounts_providerprofile_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_staff_can_access_provider_profile_list(self):
        self.login_staff()
        url = reverse('admin:accounts_providerprofile_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_non_staff_cannot_access_provider_profile_list(self):
        self.client.force_login(self.client_user)
        url = reverse('admin:accounts_providerprofile_changelist')
        response = self.client.get(url)

        self.assertAdminAccessDenied(response)

    def test_admin_can_view_provider_profile_detail(self):
        profile = ProviderProfile.objects.get(user=self.provider_user)
        self.login_admin()
        url = reverse('admin:accounts_providerprofile_change', args=[profile.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.provider_user.username)

    def test_admin_can_filter_by_availability(self):
        self.login_admin()
        url = reverse('admin:accounts_providerprofile_changelist')
        response = self.client.get(url, {'is_available': 'True'})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_search_by_username(self):
        self.login_admin()
        url = reverse('admin:accounts_providerprofile_changelist')
        response = self.client.get(url, {'q': self.provider_user.username})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_search_by_phone_number(self):
        self.login_admin()
        url = reverse('admin:accounts_providerprofile_changelist')
        response = self.client.get(url, {'q': self.provider_user.phone_number})

        self.assertEqual(response.status_code, 200)

    def test_commission_amount_display_shows_value(self):
        profile = ProviderProfile.objects.get(user=self.provider_user)
        profile.price_min = 100
        profile.price_max = 200
        profile.save()

        display = self.profile_admin.commission_amount_display(profile)
        self.assertIn('ETB', display)
        self.assertIn('3', display)

    def test_commission_amount_display_shows_dash_when_none(self):
        profile = ProviderProfile.objects.get(user=self.provider_user)
        profile.price_min = None
        profile.price_max = None
        profile.save()

        display = self.profile_admin.commission_amount_display(profile)
        self.assertEqual(display, '—')

    def test_readonly_fields_include_stats(self):
        expected_readonly = [
            'avg_rating',
            'total_reviews',
            'total_jobs',
            'created_at',
            'updated_at',
        ]
        for field in expected_readonly:
            self.assertIn(field, self.profile_admin.readonly_fields)

    def test_list_display_includes_required_fields(self):
        expected_fields = [
            'provider_name_display',  # Changed from 'user'
            'provider_uid_display',  # Added
            'is_available',
            'avg_rating',
            'total_jobs',
            'price_min',
            'price_max',
            'commission_amount_display',
            'created_at',
        ]
        for field in expected_fields:
            self.assertIn(field, self.profile_admin.list_display)

    def test_commission_calculation_is_correct(self):
        profile = ProviderProfile.objects.get(user=self.provider_user)
        profile.price_min = 100
        profile.price_max = 200
        profile.save()

        expected_commission = ((100 + 200) / 2) * 0.02
        self.assertEqual(profile.commission_amount, expected_commission)
