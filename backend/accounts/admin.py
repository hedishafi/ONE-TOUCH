from django.contrib import admin
from django.contrib import messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.core.paginator import Paginator
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html
import json

from .models import (
    DeletedProviderRecord,
    PhoneOTP,
    ProviderProfile,
    ProviderManualVerification,
    ProviderService,
    ServiceCategory,
    SubService,
    User,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('display_user', 'phone_number', 'provider_uid', 'role', 'verification_status', 'is_on_trial', 'date_joined')
    list_filter = ('role', 'verification_status', 'is_on_trial', 'is_staff')
    search_fields = ('phone_number', 'provider_uid', 'first_name', 'last_name', 'email')
    ordering = ('-date_joined',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('OneTouch Fields', {
            'fields': (
                'phone_number',
                'role',
                'verification_status',
                'provider_uid',
                'is_on_trial',
                'trial_ends_at',
            )
        }),
    )
    readonly_fields = ('provider_uid',)

    def display_user(self, obj):
        full_name = obj.get_full_name().strip()
        if full_name:
            return full_name
        if obj.phone_number:
            return obj.phone_number
        return obj.email or 'User'
    display_user.short_description = 'User'


@admin.register(ProviderProfile)
class ProviderProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_available', 'avg_rating', 'total_jobs', 'price_min', 'price_max', 'commission_amount_display', 'created_at')
    list_filter = ('is_available',)
    search_fields = ('user__username', 'user__phone_number', 'address')
    readonly_fields = ('avg_rating', 'total_reviews', 'total_jobs', 'created_at', 'updated_at')

    def commission_amount_display(self, obj):
        val = obj.commission_amount
        return f'{val} ETB' if val is not None else '—'
    commission_amount_display.short_description = '2% Commission'


@admin.register(PhoneOTP)
class PhoneOTPAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'purpose', 'role', 'is_used', 'attempts', 'expires_at', 'created_at')
    list_filter = ('purpose', 'is_used', 'role')
    search_fields = ('phone_number',)
    readonly_fields = ('code', 'created_at')


class SubServiceInline(admin.TabularInline):
    model = SubService
    fields = ('name', 'slug', 'description', 'is_active')
    extra = 1


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug')
    # Allow manual editing of slug in admin — remove automatic prepopulation
    inlines = [SubServiceInline]


@admin.register(SubService)
class SubServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'slug', 'is_active', 'created_at')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'slug')
    # Allow manual editing of slug in admin — remove automatic prepopulation


@admin.register(ProviderService)
class ProviderServiceAdmin(admin.ModelAdmin):
    list_display = ('provider', 'primary_service', 'subservice_count', 'created_at')
    list_filter = ('primary_service',)
    search_fields = ('provider__user__username', 'primary_service__name')

    def subservice_count(self, obj):
        return obj.subservices.count()
    subservice_count.short_description = 'Subservices'


@admin.register(ProviderManualVerification)
class ProviderManualVerificationAdmin(admin.ModelAdmin):
    change_list_template = 'admin/accounts/providermanualverification/change_list.html'
    list_display = ('provider_identity', 'provider_uid_display', 'status', 'submitted_at', 'reviewed_by', 'reviewed_at')
    list_filter = ('status', 'submitted_at')
    search_fields = ('provider__phone_number', 'provider__provider_uid', 'provider__first_name', 'provider__last_name', 'provider__email')
    readonly_fields = ('submitted_at', 'updated_at', 'id_front_preview', 'id_back_preview', 'selfie_preview')
    fields = (
        'provider',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
        'id_front_image',
        'id_front_preview',
        'id_back_image',
        'id_back_preview',
        'selfie_image',
        'selfie_preview',
        'submitted_at',
        'updated_at',
    )
    actions = ['approve_selected', 'reject_selected']

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'queue/',
                self.admin_site.admin_view(self.review_queue_view),
                name='accounts_providermanualverification_queue',
            ),
            path(
                'analytics/',
                self.admin_site.admin_view(self.analytics_view),
                name='accounts_providermanualverification_analytics',
            ),
            path(
                '<int:verification_id>/review/',
                self.admin_site.admin_view(self.review_submission_view),
                name='accounts_providermanualverification_review',
            ),
            path(
                'ai-helper/',
                self.admin_site.admin_view(self.ai_helper_view),
                name='accounts_providermanualverification_ai_helper',
            ),
        ]
        return custom_urls + urls

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['verification_queue_url'] = reverse('admin:accounts_providermanualverification_queue')
        extra_context['verification_analytics_url'] = reverse('admin:accounts_providermanualverification_analytics')
        return super().changelist_view(request, extra_context=extra_context)

    def review_queue_view(self, request):
        queryset = (
            ProviderManualVerification.objects
            .select_related('provider', 'reviewed_by')
            .order_by('-submitted_at')
        )
        pending_count = queryset.filter(status=ProviderManualVerification.STATUS_PENDING).count()
        approved_count = queryset.filter(status=ProviderManualVerification.STATUS_APPROVED).count()
        rejected_count = queryset.filter(status=ProviderManualVerification.STATUS_REJECTED).count()
        paginator = Paginator(queryset, 20)
        page_obj = paginator.get_page(request.GET.get('page'))
        context = {
            **self.admin_site.each_context(request),
            'opts': self.model._meta,
            'title': 'Provider Verification Queue',
            'page_obj': page_obj,
            'queue_url': reverse('admin:accounts_providermanualverification_queue'),
            'analytics_url': reverse('admin:accounts_providermanualverification_analytics'),
            'review_action_base_url': reverse('admin:accounts_providermanualverification_changelist'),
            'ai_helper_url': reverse('admin:accounts_providermanualverification_ai_helper'),
            'pending_count': pending_count,
            'approved_count': approved_count,
            'rejected_count': rejected_count,
        }
        return TemplateResponse(request, 'admin/accounts/provider_manual_verification/queue.html', context)

    def analytics_view(self, request):
        queryset = ProviderManualVerification.objects.all()
        status_counts = {
            row['status']: row['total']
            for row in queryset.values('status').annotate(total=Count('id'))
        }
        daily = (
            queryset
            .annotate(day=TruncDate('submitted_at'))
            .values('day')
            .annotate(total=Count('id'))
            .order_by('day')
        )
        labels = [row['day'].strftime('%Y-%m-%d') for row in daily if row['day']]
        totals = [row['total'] for row in daily if row['day']]

        context = {
            **self.admin_site.each_context(request),
            'opts': self.model._meta,
            'title': 'Provider Verification Analytics',
            'queue_url': reverse('admin:accounts_providermanualverification_queue'),
            'analytics_url': reverse('admin:accounts_providermanualverification_analytics'),
            'total_submissions': queryset.count(),
            'pending_count': status_counts.get(ProviderManualVerification.STATUS_PENDING, 0),
            'approved_count': status_counts.get(ProviderManualVerification.STATUS_APPROVED, 0),
            'rejected_count': status_counts.get(ProviderManualVerification.STATUS_REJECTED, 0),
            'chart_labels_json': json.dumps(labels),
            'chart_data_json': json.dumps(totals),
        }
        return TemplateResponse(request, 'admin/accounts/provider_manual_verification/analytics.html', context)

    def review_submission_view(self, request, verification_id):
        verification = get_object_or_404(ProviderManualVerification.objects.select_related('provider'), pk=verification_id)
        next_url = request.POST.get('next') or reverse('admin:accounts_providermanualverification_queue')

        if request.method != 'POST':
            return redirect(next_url)

        action = request.POST.get('action', '').strip()
        rejection_reason = request.POST.get('rejection_reason', '').strip()

        if action not in {'approve', 'reject'}:
            messages.error(request, 'Invalid review action.')
            return redirect(next_url)

        verification.reviewed_by = request.user
        verification.reviewed_at = timezone.now()

        provider = verification.provider

        if action == 'approve':
            verification.status = ProviderManualVerification.STATUS_APPROVED
            verification.rejection_reason = ''
            provider.verification_status = User.STATUS_VERIFIED
            message = f'Approved verification for {provider.phone_number}.'
        else:
            if not rejection_reason:
                messages.error(request, 'Rejection reason is required.')
                return redirect(next_url)
            verification.status = ProviderManualVerification.STATUS_REJECTED
            verification.rejection_reason = rejection_reason
            provider.verification_status = User.STATUS_REJECTED
            message = f'Rejected verification for {provider.phone_number}.'

        verification.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'updated_at'])
        provider.save(update_fields=['verification_status'])
        self._notify_provider(verification, approved=(action == 'approve'))
        messages.success(request, message)
        return redirect(next_url)

    def ai_helper_view(self, request):
        if request.method != 'POST':
            return JsonResponse({'detail': 'Method not allowed.'}, status=405)

        mode = (request.POST.get('mode') or '').strip().lower()
        if mode == 'rejection_reason':
            document_issue = (request.POST.get('document_issue') or '').strip()
            identity_issue = (request.POST.get('identity_issue') or '').strip()
            additional_note = (request.POST.get('additional_note') or '').strip()

            reason_parts = []
            if document_issue:
                reason_parts.append(f'{document_issue}.')
            else:
                reason_parts.append('The submitted identity documents are not clear enough for verification.')

            if identity_issue:
                reason_parts.append(f'{identity_issue}.')

            reason_parts.append('Please upload clear, unedited photos of both sides of your ID and a well-lit selfie that matches the ID details.')
            if additional_note:
                reason_parts.append(additional_note)

            return JsonResponse({'response': ' '.join(reason_parts)}, status=200)

        prompt = (request.POST.get('prompt') or '').strip()
        if not prompt:
            return JsonResponse({'detail': 'Prompt is required.'}, status=400)

        prompt_lower = prompt.lower()
        if 'reject' in prompt_lower and 'reason' in prompt_lower:
            suggestion = 'Use a clear, specific reason: e.g. "ID front image is blurry and DOB is unreadable. Please upload a clear photo in good lighting."'
        elif 'approve' in prompt_lower:
            suggestion = 'Approve when all three files are clear, identity details match, and selfie plausibly matches the ID portrait.'
        else:
            suggestion = 'AI helper suggestion: prioritize image clarity, identity consistency across documents, and complete rejection reasons for faster re-submission.'

        return JsonResponse({'response': suggestion}, status=200)

    def provider_identity(self, obj):
        full_name = obj.provider.get_full_name().strip()
        if full_name:
            return full_name
        if obj.provider.phone_number:
            return obj.provider.phone_number
        return obj.provider.email or 'User'
    provider_identity.short_description = 'User'

    def provider_uid_display(self, obj):
        return obj.provider.provider_uid or '—'
    provider_uid_display.short_description = 'UID'

    def id_front_preview(self, obj):
        if obj.id_front_image:
            return format_html('<img src="{}" style="max-height:160px;" />', obj.id_front_image.url)
        return '—'

    def id_back_preview(self, obj):
        if obj.id_back_image:
            return format_html('<img src="{}" style="max-height:160px;" />', obj.id_back_image.url)
        return '—'

    def selfie_preview(self, obj):
        if obj.selfie_image:
            return format_html('<img src="{}" style="max-height:160px;" />', obj.selfie_image.url)
        return '—'

    def _notify_provider(self, verification, approved: bool):
        if not verification.provider.email:
            return

        from django.conf import settings
        from django.core.mail import send_mail

        subject = 'Provider verification approved' if approved else 'Provider verification rejected'
        message = (
            'Your service provider verification has been approved. You can now continue using provider features.'
            if approved
            else f'Your service provider verification was rejected. Reason: {verification.rejection_reason or "Not provided."}'
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@onetouch.local'),
                recipient_list=[verification.provider.email],
                fail_silently=True,
            )
        except Exception:
            pass

    def approve_selected(self, request, queryset):
        from django.utils import timezone

        for verification in queryset.select_related('provider'):
            verification.status = ProviderManualVerification.STATUS_APPROVED
            verification.reviewed_by = request.user
            verification.reviewed_at = timezone.now()
            verification.rejection_reason = ''
            verification.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'updated_at'])

            provider = verification.provider
            provider.verification_status = User.STATUS_VERIFIED
            provider.save(update_fields=['verification_status'])

            self._notify_provider(verification, approved=True)

        self.message_user(request, f'{queryset.count()} provider manual verification(s) approved.')

    approve_selected.short_description = 'Approve selected provider verifications'

    def reject_selected(self, request, queryset):
        from django.utils import timezone

        for verification in queryset.select_related('provider'):
            verification.status = ProviderManualVerification.STATUS_REJECTED
            verification.reviewed_by = request.user
            verification.reviewed_at = timezone.now()
            verification.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])

            provider = verification.provider
            provider.verification_status = User.STATUS_REJECTED
            provider.save(update_fields=['verification_status'])

            self._notify_provider(verification, approved=False)

        self.message_user(request, f'{queryset.count()} provider manual verification(s) rejected.')

    reject_selected.short_description = 'Reject selected provider verifications'


@admin.register(DeletedProviderRecord)
class DeletedProviderRecordAdmin(admin.ModelAdmin):
    list_display = ('phone_number', 'provider_uid', 'deleted_at')
    search_fields = ('phone_number', 'provider_uid')
    ordering = ('-deleted_at',)
