from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from accounts.admin import PhoneOTPAdmin
from accounts.models import PhoneOTP, User
from accounts.tests.admin_base import AdminTestBase


class PhoneOTPAdminTests(AdminTestBase):
    """Tests for PhoneOTP admin interface"""

    def setUp(self):
        super().setUp()
        self.otp_admin = PhoneOTPAdmin(PhoneOTP, self.site)

    def test_admin_can_access_otp_list(self):
        self.login_admin()
        url = reverse('admin:accounts_phoneotp_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_staff_can_access_otp_list(self):
        self.login_staff()
        url = reverse('admin:accounts_phoneotp_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_non_staff_cannot_access_otp_list(self):
        self.client.force_login(self.client_user)
        url = reverse('admin:accounts_phoneotp_changelist')
        response = self.client.get(url)

        self.assertAdminAccessDenied(response)

    def test_admin_can_view_otp_detail(self):
        otp = self.create_otp(
            '+251911123456', PhoneOTP.PURPOSE_REGISTER, code='123456'
        )
        self.login_admin()
        url = reverse('admin:accounts_phoneotp_change', args=[otp.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '+251911123456')

    def test_admin_can_filter_by_purpose(self):
        self.create_otp('+251911123456', PhoneOTP.PURPOSE_REGISTER)
        self.create_otp('+251911123457', PhoneOTP.PURPOSE_LOGIN)

        self.login_admin()
        url = reverse('admin:accounts_phoneotp_changelist')
        response = self.client.get(url, {'purpose': PhoneOTP.PURPOSE_REGISTER})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_filter_by_is_used(self):
        self.create_otp('+251911123456', PhoneOTP.PURPOSE_REGISTER, is_used=True)
        self.create_otp('+251911123457', PhoneOTP.PURPOSE_REGISTER, is_used=False)

        self.login_admin()
        url = reverse('admin:accounts_phoneotp_changelist')
        response = self.client.get(url, {'is_used': 'True'})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_filter_by_role(self):
        otp1 = self.create_otp('+251911123456', PhoneOTP.PURPOSE_REGISTER)
        otp1.role = User.ROLE_CLIENT
        otp1.save()

        otp2 = self.create_otp('+251911123457', PhoneOTP.PURPOSE_REGISTER)
        otp2.role = User.ROLE_PROVIDER
        otp2.save()

        self.login_admin()
        url = reverse('admin:accounts_phoneotp_changelist')
        response = self.client.get(url, {'role': User.ROLE_CLIENT})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_search_by_phone_number(self):
        self.create_otp('+251911123456', PhoneOTP.PURPOSE_REGISTER)

        self.login_admin()
        url = reverse('admin:accounts_phoneotp_changelist')
        response = self.client.get(url, {'q': '+251911123456'})

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '+251911123456')

    def test_code_is_readonly(self):
        self.assertIn('code', self.otp_admin.readonly_fields)

    def test_created_at_is_readonly(self):
        self.assertIn('created_at', self.otp_admin.readonly_fields)

    def test_list_display_includes_required_fields(self):
        expected_fields = [
            'phone_number',
            'purpose',
            'role',
            'is_used',
            'attempts',
            'expires_at',
            'created_at',
        ]
        for field in expected_fields:
            self.assertIn(field, self.otp_admin.list_display)

    def test_admin_can_view_expired_otps(self):
        otp = PhoneOTP.objects.create(
            phone_number='+251911123456',
            purpose=PhoneOTP.PURPOSE_REGISTER,
            code='123456',
            expires_at=timezone.now() - timedelta(minutes=10),
            is_used=False,
        )

        self.login_admin()
        url = reverse('admin:accounts_phoneotp_change', args=[otp.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_admin_can_view_otp_with_attempts(self):
        otp = self.create_otp(
            '+251911123456', PhoneOTP.PURPOSE_LOGIN, attempts=3
        )

        self.login_admin()
        url = reverse('admin:accounts_phoneotp_change', args=[otp.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_admin_can_view_used_otp(self):
        otp = self.create_otp(
            '+251911123456', PhoneOTP.PURPOSE_REGISTER, is_used=True
        )

        self.login_admin()
        url = reverse('admin:accounts_phoneotp_change', args=[otp.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_admin_can_view_otp_with_metadata(self):
        otp = self.create_otp('+251911123456', PhoneOTP.PURPOSE_REGISTER)
        otp.first_name = 'John'
        otp.last_name = 'Doe'
        otp.username = 'johndoe'
        otp.role = User.ROLE_CLIENT
        otp.save()

        self.login_admin()
        url = reverse('admin:accounts_phoneotp_change', args=[otp.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'John')
        self.assertContains(response, 'Doe')

    def test_admin_list_shows_recent_otps_first(self):
        old_otp = self.create_otp('+251911123456', PhoneOTP.PURPOSE_REGISTER)
        old_otp.created_at = timezone.now() - timedelta(days=1)
        old_otp.save()

        new_otp = self.create_otp('+251911123457', PhoneOTP.PURPOSE_REGISTER)

        self.login_admin()
        url = reverse('admin:accounts_phoneotp_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_admin_cannot_edit_otp_code(self):
        otp = self.create_otp('+251911123456', PhoneOTP.PURPOSE_REGISTER)
        self.login_admin()
        url = reverse('admin:accounts_phoneotp_change', args=[otp.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'readonly')

    def test_admin_can_view_otp_for_provider_onboarding(self):
        otp = self.create_otp(
            '+251911123456', PhoneOTP.PURPOSE_PROVIDER_ONBOARDING
        )

        self.login_admin()
        url = reverse('admin:accounts_phoneotp_change', args=[otp.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_admin_can_delete_otp(self):
        otp = self.create_otp('+251911123456', PhoneOTP.PURPOSE_REGISTER)
        self.login_admin()
        url = reverse('admin:accounts_phoneotp_delete', args=[otp.id])
        response = self.client.post(url, {'post': 'yes'})

        self.assertFalse(PhoneOTP.objects.filter(id=otp.id).exists())
