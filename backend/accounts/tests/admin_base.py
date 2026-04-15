from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import RequestFactory, TestCase
from rest_framework.test import APIClient

from accounts.models import (
    ClientProfile,
    PhoneOTP,
    ProviderManualVerification,
    ProviderProfile,
    ServiceCategory,
    SubService,
)

User = get_user_model()


class AdminTestBase(TestCase):
    """
    Base class for admin-related tests.
    Provides common fixtures and utilities for testing Django admin functionality.
    """

    def setUp(self):
        cache.clear()
        self.factory = RequestFactory()
        self.site = AdminSite()
        self.api_client = APIClient()

        self.admin_user = User.objects.create_user(
            username='admin_user',
            phone_number='+251911000001',
            email='admin@test.com',
            role=User.ROLE_ADMIN,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        self.admin_user.set_password('admin123')
        self.admin_user.save()

        self.staff_user = User.objects.create_user(
            username='staff_user',
            phone_number='+251911000002',
            email='staff@test.com',
            role=User.ROLE_ADMIN,
            is_staff=True,
            is_superuser=True,  # Staff needs superuser for full admin access
            is_active=True,
        )
        self.staff_user.set_password('staff123')
        self.staff_user.save()

        self.client_user = User.objects.create_user(
            username='client_test',
            phone_number='+251911000003',
            role=User.ROLE_CLIENT,
            is_active=True,
        )
        ClientProfile.objects.create(
            user=self.client_user,
            full_name='Test Client',
            client_type=ClientProfile.CLIENT_TYPE_INDIVIDUAL,
        )

        self.provider_user = User.objects.create_user(
            username='provider_test',
            phone_number='+251911000004',
            role=User.ROLE_PROVIDER,
            is_active=True,
            verification_status=User.STATUS_PENDING,
        )
        ProviderProfile.objects.create(
            user=self.provider_user,
            bio='Test provider bio',
            profile_completed=True,
        )

        self.verified_provider = User.objects.create_user(
            username='verified_provider',
            phone_number='+251911000005',
            role=User.ROLE_PROVIDER,
            is_active=True,
            verification_status=User.STATUS_VERIFIED,
        )
        ProviderProfile.objects.create(
            user=self.verified_provider,
            bio='Verified provider',
            profile_completed=True,
        )

        self.service_category = ServiceCategory.objects.create(
            name='Plumbing',
            slug='plumbing',
            is_active=True,
        )
        self.sub_service = SubService.objects.create(
            category=self.service_category,
            name='Leak Fix',
            slug='leak-fix',
            is_active=True,
        )

    def login_admin(self):
        """Login as admin user via Django test client"""
        self.client.force_login(self.admin_user)
        return self.admin_user

    def login_staff(self):
        """Login as staff user via Django test client"""
        self.client.force_login(self.staff_user)
        return self.staff_user

    def create_mock_request(self, user=None, method='GET', path='/', data=None):
        """Create a mock request object for testing admin views"""
        if method.upper() == 'GET':
            request = self.factory.get(path, data or {})
        elif method.upper() == 'POST':
            request = self.factory.post(path, data or {})
        else:
            raise ValueError(f'Unsupported method: {method}')

        request.user = user or self.admin_user
        return request

    def create_verification(self, provider=None, status=None):
        """Helper to create a provider manual verification"""
        if provider is None:
            provider = self.provider_user
        if status is None:
            status = ProviderManualVerification.STATUS_PENDING

        return ProviderManualVerification.objects.create(
            provider=provider,
            id_front_image='test_front.jpg',
            id_back_image='test_back.jpg',
            selfie_image='test_selfie.jpg',
            status=status,
        )

    def create_otp(self, phone_number, purpose, code='123456', is_used=False, attempts=0):
        """Helper to create OTP records"""
        from datetime import timedelta
        from django.utils import timezone

        return PhoneOTP.objects.create(
            phone_number=phone_number,
            purpose=purpose,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=5),
            is_used=is_used,
            attempts=attempts,
        )

    def assertAdminAccessDenied(self, response):
        """Assert that admin access was denied (redirect to login or 403)"""
        self.assertIn(response.status_code, [302, 403])

    def assertAdminAccessGranted(self, response):
        """Assert that admin access was granted (200 or successful redirect)"""
        self.assertIn(response.status_code, [200, 302])
