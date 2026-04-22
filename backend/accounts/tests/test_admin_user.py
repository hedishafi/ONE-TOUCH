from django.contrib.auth import get_user_model
from django.urls import reverse

from accounts.admin import UserAdmin
from accounts.tests.admin_base import AdminTestBase

User = get_user_model()


class UserAdminTests(AdminTestBase):
    """Tests for User model admin interface"""

    def setUp(self):
        super().setUp()
        self.user_admin = UserAdmin(User, self.site)

    def test_admin_can_access_user_list(self):
        self.login_admin()
        url = reverse('admin:accounts_user_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'admin_user')

    def test_staff_can_access_user_list(self):
        self.login_staff()
        url = reverse('admin:accounts_user_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_non_staff_cannot_access_user_list(self):
        self.client.force_login(self.client_user)
        url = reverse('admin:accounts_user_changelist')
        response = self.client.get(url)

        self.assertAdminAccessDenied(response)

    def test_admin_can_view_user_detail(self):
        self.login_admin()
        url = reverse('admin:accounts_user_change', args=[self.client_user.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.client_user.phone_number)

    def test_admin_can_search_users_by_phone(self):
        self.login_admin()
        url = reverse('admin:accounts_user_changelist')
        response = self.client.get(url, {'q': self.client_user.phone_number})

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.client_user.phone_number)

    def test_admin_can_search_users_by_provider_uid(self):
        self.login_admin()
        url = reverse('admin:accounts_user_changelist')
        response = self.client.get(url, {'q': self.provider_user.provider_uid})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_filter_users_by_role(self):
        self.login_admin()
        url = reverse('admin:accounts_user_changelist')
        response = self.client.get(url, {'role': User.ROLE_CLIENT})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_filter_users_by_verification_status(self):
        self.login_admin()
        url = reverse('admin:accounts_user_changelist')
        response = self.client.get(url, {'verification_status': User.STATUS_PENDING})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_filter_users_by_trial_status(self):
        self.login_admin()
        url = reverse('admin:accounts_user_changelist')
        response = self.client.get(url, {'is_on_trial': 'True'})

        self.assertEqual(response.status_code, 200)

    def test_display_user_shows_full_name_when_available(self):
        user = User.objects.create_user(
            username='test_display',
            phone_number='+251911999999',
            first_name='John',
            last_name='Doe',
        )

        display = self.user_admin.display_user(user)
        self.assertEqual(display, 'John Doe')

    def test_display_user_shows_phone_when_no_name(self):
        user = User.objects.create_user(
            username='test_phone_display',
            phone_number='+251911888888',
        )

        display = self.user_admin.display_user(user)
        self.assertEqual(display, '+251911888888')

    def test_display_user_shows_email_when_no_name_or_phone(self):
        user = User.objects.create_user(
            username='test_email_display',
            email='test@example.com',
        )

        display = self.user_admin.display_user(user)
        self.assertEqual(display, 'test@example.com')

    def test_verification_status_display_shows_dash_for_client(self):
        display = self.user_admin.verification_status_display(self.client_user)
        self.assertEqual(display, '—')

    def test_verification_status_display_shows_status_for_provider(self):
        display = self.user_admin.verification_status_display(self.provider_user)
        self.assertEqual(display, User.STATUS_PENDING)

    def test_is_on_trial_display_shows_dash_for_client(self):
        display = self.user_admin.is_on_trial_display(self.client_user)
        self.assertEqual(display, '—')

    def test_is_on_trial_display_shows_status_for_provider(self):
        display = self.user_admin.is_on_trial_display(self.provider_user)
        self.assertIn(display, [True, False])

    def test_provider_uid_and_verification_status_are_readonly(self):
        self.assertIn('provider_uid', self.user_admin.readonly_fields)
        self.assertIn('verification_status', self.user_admin.readonly_fields)

    def test_admin_list_display_includes_required_fields(self):
        expected_fields = [
            'display_user',
            'phone_number',
            'provider_uid_display',  # Changed from 'provider_uid'
            'role',
            'verification_status_display',
            'is_on_trial_display',
            'date_joined',
        ]
        for field in expected_fields:
            self.assertIn(field, self.user_admin.list_display)

    def test_admin_can_create_new_user(self):
        self.login_admin()
        url = reverse('admin:accounts_user_add')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_admin_ordering_by_date_joined_desc(self):
        self.assertEqual(self.user_admin.ordering, ('-date_joined',))

    def test_admin_search_fields_include_key_fields(self):
        expected_fields = [
            'phone_number',
            'provider_uid',
            'first_name',
            'last_name',
            'email',
        ]
        for field in expected_fields:
            self.assertIn(field, self.user_admin.search_fields)
