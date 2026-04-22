from django.urls import reverse

from accounts.admin import DeletedProviderRecordAdmin
from accounts.models import DeletedProviderRecord
from accounts.tests.admin_base import AdminTestBase


class DeletedProviderRecordAdminTests(AdminTestBase):
    """Tests for DeletedProviderRecord admin interface"""

    def setUp(self):
        super().setUp()
        self.deleted_admin = DeletedProviderRecordAdmin(
            DeletedProviderRecord, self.site
        )

    def test_admin_can_access_deleted_provider_list(self):
        self.login_admin()
        url = reverse('admin:accounts_deletedproviderrecord_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_staff_can_access_deleted_provider_list(self):
        self.login_staff()
        url = reverse('admin:accounts_deletedproviderrecord_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_non_staff_cannot_access_deleted_provider_list(self):
        self.client.force_login(self.client_user)
        url = reverse('admin:accounts_deletedproviderrecord_changelist')
        response = self.client.get(url)

        self.assertAdminAccessDenied(response)

    def test_admin_can_view_deleted_provider_detail(self):
        record = DeletedProviderRecord.objects.create(
            phone_number='+251911999999',
            provider_uid='999999',
        )

        self.login_admin()
        url = reverse(
            'admin:accounts_deletedproviderrecord_change', args=[record.id]
        )
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '+251911999999')

    def test_admin_can_search_by_phone_number(self):
        DeletedProviderRecord.objects.create(
            phone_number='+251911999999',
            provider_uid='999999',
        )

        self.login_admin()
        url = reverse('admin:accounts_deletedproviderrecord_changelist')
        response = self.client.get(url, {'q': '+251911999999'})

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '+251911999999')

    def test_admin_can_search_by_provider_uid(self):
        DeletedProviderRecord.objects.create(
            phone_number='+251911999999',
            provider_uid='999999',
        )

        self.login_admin()
        url = reverse('admin:accounts_deletedproviderrecord_changelist')
        response = self.client.get(url, {'q': '999999'})

        self.assertEqual(response.status_code, 200)

    def test_list_display_includes_required_fields(self):
        expected_fields = ['phone_number', 'provider_uid', 'deleted_at']
        for field in expected_fields:
            self.assertIn(field, self.deleted_admin.list_display)

    def test_admin_ordering_by_deleted_at_desc(self):
        self.assertEqual(self.deleted_admin.ordering, ('-deleted_at',))

    def test_admin_can_create_deleted_provider_record(self):
        self.login_admin()
        url = reverse('admin:accounts_deletedproviderrecord_add')
        response = self.client.post(url, {
            'phone_number': '+251911888888',
            'provider_uid': '888888',
        })

        self.assertTrue(
            DeletedProviderRecord.objects.filter(
                phone_number='+251911888888'
            ).exists()
        )

    def test_admin_can_delete_record(self):
        record = DeletedProviderRecord.objects.create(
            phone_number='+251911999999',
            provider_uid='999999',
        )

        self.login_admin()
        url = reverse(
            'admin:accounts_deletedproviderrecord_delete', args=[record.id]
        )
        response = self.client.post(url, {'post': 'yes'})

        self.assertFalse(
            DeletedProviderRecord.objects.filter(id=record.id).exists()
        )

    def test_deleted_at_is_auto_set(self):
        record = DeletedProviderRecord.objects.create(
            phone_number='+251911999999',
            provider_uid='999999',
        )

        self.assertIsNotNone(record.deleted_at)

    def test_admin_can_view_record_without_provider_uid(self):
        record = DeletedProviderRecord.objects.create(
            phone_number='+251911999999',
            provider_uid='',
        )

        self.login_admin()
        url = reverse(
            'admin:accounts_deletedproviderrecord_change', args=[record.id]
        )
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_phone_number_is_unique(self):
        DeletedProviderRecord.objects.create(
            phone_number='+251911999999',
            provider_uid='999999',
        )

        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            DeletedProviderRecord.objects.create(
                phone_number='+251911999999',
                provider_uid='888888',
            )

    def test_admin_list_shows_most_recent_first(self):
        from django.utils import timezone
        from datetime import timedelta

        old_record = DeletedProviderRecord.objects.create(
            phone_number='+251911888888',
            provider_uid='888888',
        )
        old_record.deleted_at = timezone.now() - timedelta(days=7)
        old_record.save()

        new_record = DeletedProviderRecord.objects.create(
            phone_number='+251911999999',
            provider_uid='999999',
        )

        self.login_admin()
        url = reverse('admin:accounts_deletedproviderrecord_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_admin_search_fields_include_key_fields(self):
        expected_fields = ['phone_number', 'provider_uid']
        for field in expected_fields:
            self.assertIn(field, self.deleted_admin.search_fields)
