from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

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
    list_display = ('username', 'phone_number', 'provider_uid', 'role', 'verification_status', 'is_on_trial', 'date_joined')
    list_filter = ('role', 'verification_status', 'is_on_trial', 'is_staff')
    search_fields = ('username', 'phone_number', 'provider_uid', 'first_name', 'last_name')
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


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(SubService)
class SubServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'slug', 'is_active', 'created_at')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


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
    list_display = ('provider', 'status', 'submitted_at', 'reviewed_by', 'reviewed_at')
    list_filter = ('status', 'submitted_at')
    search_fields = ('provider__username', 'provider__phone_number')
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
