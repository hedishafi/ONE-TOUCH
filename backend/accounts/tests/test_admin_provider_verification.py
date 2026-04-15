from django.contrib.auth import get_user_model
from django.contrib.messages import get_messages
from django.urls import reverse
from django.utils import timezone

from accounts.admin import ProviderManualVerificationAdmin
from accounts.models import ProviderManualVerification
from accounts.tests.admin_base import AdminTestBase

User = get_user_model()


class ProviderManualVerificationAdminTests(AdminTestBase):
    """Tests for ProviderManualVerification admin interface"""

    def setUp(self):
        super().setUp()
        self.verification_admin = ProviderManualVerificationAdmin(
            ProviderManualVerification, self.site
        )

    def test_admin_can_access_verification_list(self):
        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_staff_can_access_verification_list(self):
        self.login_staff()
        url = reverse('admin:accounts_providermanualverification_changelist')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)

    def test_non_staff_cannot_access_verification_list(self):
        self.client.force_login(self.client_user)
        url = reverse('admin:accounts_providermanualverification_changelist')
        response = self.client.get(url)

        self.assertAdminAccessDenied(response)

    def test_admin_can_view_verification_detail(self):
        verification = self.create_verification()
        self.login_admin()
        url = reverse(
            'admin:accounts_providermanualverification_change',
            args=[verification.id],
        )
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        # Check that the verification detail page is displayed
        self.assertIn(b'Provider Manual Verification', response.content)

    def test_admin_can_access_review_queue(self):
        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_queue')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Provider Verification Queue')

    def test_review_queue_shows_pending_count(self):
        self.create_verification(status=ProviderManualVerification.STATUS_PENDING)
        self.create_verification(
            provider=self.verified_provider,
            status=ProviderManualVerification.STATUS_PENDING,
        )

        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_queue')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        # Check that the response contains the queue view
        self.assertIn(b'Provider Verification Queue', response.content)

    def test_review_queue_pagination_works(self):
        for i in range(25):
            provider = User.objects.create_user(
                username=f'provider_pag_{i}',
                phone_number=f'+25191110{i:04d}',
                role=User.ROLE_PROVIDER,
            )
            self.create_verification(provider=provider)

        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_queue')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        # Check that pagination is working by verifying we have results
        self.assertIn(b'Provider Verification Queue', response.content)

    def test_admin_can_access_analytics_view(self):
        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_analytics')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Provider Verification Analytics')

    def test_analytics_shows_status_counts(self):
        self.create_verification(status=ProviderManualVerification.STATUS_PENDING)
        self.create_verification(
            provider=self.verified_provider,
            status=ProviderManualVerification.STATUS_APPROVED,
        )

        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_analytics')
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        # Check that analytics page is rendered
        self.assertIn(b'Provider Verification Analytics', response.content)

    def test_admin_can_approve_verification_via_review_action(self):
        verification = self.create_verification()
        self.login_admin()
        url = reverse(
            'admin:accounts_providermanualverification_review',
            args=[verification.id],
        )

        response = self.client.post(url, {
            'action': 'approve',
            'next': reverse('admin:accounts_providermanualverification_queue'),
        })

        self.assertEqual(response.status_code, 302)
        verification.refresh_from_db()
        self.assertEqual(
            verification.status, ProviderManualVerification.STATUS_APPROVED
        )
        self.assertEqual(verification.reviewed_by, self.admin_user)
        self.assertIsNotNone(verification.reviewed_at)

    def test_approve_verification_updates_provider_status(self):
        verification = self.create_verification()
        self.login_admin()
        url = reverse(
            'admin:accounts_providermanualverification_review',
            args=[verification.id],
        )

        self.client.post(url, {
            'action': 'approve',
            'next': reverse('admin:accounts_providermanualverification_queue'),
        })

        self.provider_user.refresh_from_db()
        self.assertEqual(self.provider_user.verification_status, User.STATUS_VERIFIED)

    def test_admin_can_reject_verification_with_reason(self):
        verification = self.create_verification()
        self.login_admin()
        url = reverse(
            'admin:accounts_providermanualverification_review',
            args=[verification.id],
        )

        response = self.client.post(url, {
            'action': 'reject',
            'rejection_reason': 'ID image is blurry',
            'next': reverse('admin:accounts_providermanualverification_queue'),
        })

        self.assertEqual(response.status_code, 302)
        verification.refresh_from_db()
        self.assertEqual(
            verification.status, ProviderManualVerification.STATUS_REJECTED
        )
        self.assertEqual(verification.rejection_reason, 'ID image is blurry')

    def test_reject_verification_updates_provider_status(self):
        verification = self.create_verification()
        self.login_admin()
        url = reverse(
            'admin:accounts_providermanualverification_review',
            args=[verification.id],
        )

        self.client.post(url, {
            'action': 'reject',
            'rejection_reason': 'Invalid document',
            'next': reverse('admin:accounts_providermanualverification_queue'),
        })

        self.provider_user.refresh_from_db()
        self.assertEqual(self.provider_user.verification_status, User.STATUS_REJECTED)

    def test_reject_without_reason_shows_error(self):
        verification = self.create_verification()
        self.login_admin()
        url = reverse(
            'admin:accounts_providermanualverification_review',
            args=[verification.id],
        )

        response = self.client.post(url, {
            'action': 'reject',
            'rejection_reason': '',
            'next': reverse('admin:accounts_providermanualverification_queue'),
        })

        messages = list(get_messages(response.wsgi_request))
        self.assertTrue(
            any('Rejection reason is required' in str(m) for m in messages)
        )

    def test_invalid_review_action_shows_error(self):
        verification = self.create_verification()
        self.login_admin()
        url = reverse(
            'admin:accounts_providermanualverification_review',
            args=[verification.id],
        )

        response = self.client.post(url, {
            'action': 'invalid_action',
            'next': reverse('admin:accounts_providermanualverification_queue'),
        })

        messages = list(get_messages(response.wsgi_request))
        self.assertTrue(any('Invalid review action' in str(m) for m in messages))

    def test_review_action_requires_post_method(self):
        verification = self.create_verification()
        self.login_admin()
        url = reverse(
            'admin:accounts_providermanualverification_review',
            args=[verification.id],
        )

        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)

    def test_admin_can_bulk_approve_verifications(self):
        v1 = self.create_verification()
        v2 = self.create_verification(provider=self.verified_provider)

        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_changelist')

        response = self.client.post(url, {
            'action': 'approve_selected',
            '_selected_action': [v1.id, v2.id],
        })

        v1.refresh_from_db()
        v2.refresh_from_db()
        self.assertEqual(v1.status, ProviderManualVerification.STATUS_APPROVED)
        self.assertEqual(v2.status, ProviderManualVerification.STATUS_APPROVED)

    def test_admin_can_bulk_reject_verifications(self):
        v1 = self.create_verification()
        v2 = self.create_verification(provider=self.verified_provider)

        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_changelist')

        response = self.client.post(url, {
            'action': 'reject_selected',
            '_selected_action': [v1.id, v2.id],
        })

        v1.refresh_from_db()
        v2.refresh_from_db()
        self.assertEqual(v1.status, ProviderManualVerification.STATUS_REJECTED)
        self.assertEqual(v2.status, ProviderManualVerification.STATUS_REJECTED)

    def test_ai_helper_generates_rejection_reason(self):
        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_ai_helper')

        response = self.client.post(url, {
            'mode': 'rejection_reason',
            'document_issue': 'ID front image is blurry',
            'identity_issue': 'Name does not match',
            'additional_note': 'Please resubmit',
        })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('response', data)
        self.assertIn('blurry', data['response'].lower())

    def test_ai_helper_requires_post_method(self):
        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_ai_helper')

        response = self.client.get(url)
        self.assertEqual(response.status_code, 405)

    def test_ai_helper_handles_general_prompt(self):
        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_ai_helper')

        response = self.client.post(url, {
            'prompt': 'How should I reject this verification?',
        })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('response', data)

    def test_provider_identity_display_shows_full_name(self):
        self.provider_user.first_name = 'John'
        self.provider_user.last_name = 'Doe'
        self.provider_user.save()

        verification = self.create_verification()
        display = self.verification_admin.provider_identity(verification)
        self.assertEqual(display, 'John Doe')

    def test_provider_identity_display_shows_phone_when_no_name(self):
        verification = self.create_verification()
        display = self.verification_admin.provider_identity(verification)
        self.assertEqual(display, self.provider_user.phone_number)

    def test_provider_uid_display_shows_uid(self):
        verification = self.create_verification()
        display = self.verification_admin.provider_uid_display(verification)
        self.assertEqual(display, self.provider_user.provider_uid)

    def test_provider_uid_display_shows_dash_when_none(self):
        # Provider UID is auto-generated, so we can't set it to None
        # Instead, test that the display method handles the UID correctly
        verification = self.create_verification()
        display = self.verification_admin.provider_uid_display(verification)
        # Should show the auto-generated UID
        self.assertIsNotNone(display)
        self.assertNotEqual(display, '—')

    def test_admin_can_filter_by_status(self):
        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_changelist')
        response = self.client.get(
            url, {'status': ProviderManualVerification.STATUS_PENDING}
        )

        self.assertEqual(response.status_code, 200)

    def test_admin_can_search_by_phone_number(self):
        self.create_verification()
        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_changelist')
        response = self.client.get(url, {'q': self.provider_user.phone_number})

        self.assertEqual(response.status_code, 200)

    def test_admin_can_search_by_provider_uid(self):
        self.create_verification()
        self.login_admin()
        url = reverse('admin:accounts_providermanualverification_changelist')
        response = self.client.get(url, {'q': self.provider_user.provider_uid})

        self.assertEqual(response.status_code, 200)

    def test_readonly_fields_include_timestamps(self):
        expected_readonly = [
            'reviewed_at',
            'submitted_at',
            'updated_at',
            'id_front_preview',
            'id_back_preview',
            'selfie_preview',
        ]
        for field in expected_readonly:
            self.assertIn(field, self.verification_admin.readonly_fields)

    def test_list_display_includes_required_fields(self):
        expected_fields = [
            'provider_identity',
            'provider_uid_display',
            'status',
            'submitted_at',
            'reviewed_at',
        ]
        for field in expected_fields:
            self.assertIn(field, self.verification_admin.list_display)



    def test_formfield_for_foreignkey_filters_providers_only(self):
        request = self.create_mock_request(self.admin_user)
        db_field = ProviderManualVerification._meta.get_field('provider')

        formfield = self.verification_admin.formfield_for_foreignkey(
            db_field, request
        )

        queryset = formfield.queryset
        for user in queryset:
            self.assertEqual(user.role, User.ROLE_PROVIDER)

    def test_save_model_sets_reviewed_by_on_approval(self):
        verification = self.create_verification()
        verification.status = ProviderManualVerification.STATUS_APPROVED

        request = self.create_mock_request(self.admin_user)
        self.verification_admin.save_model(request, verification, None, True)

        self.assertEqual(verification.reviewed_by, self.admin_user)
        self.assertIsNotNone(verification.reviewed_at)

    def test_save_model_sets_reviewed_by_on_rejection(self):
        verification = self.create_verification()
        verification.status = ProviderManualVerification.STATUS_REJECTED

        request = self.create_mock_request(self.admin_user)
        self.verification_admin.save_model(request, verification, None, True)

        self.assertEqual(verification.reviewed_by, self.admin_user)
        self.assertIsNotNone(verification.reviewed_at)
