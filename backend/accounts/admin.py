from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

from .models import (
    IdentityDocument, PhoneOTP, ProviderProfile, User, FaceBiometricVerification,
    ServiceCategory, SubService, ProviderService, ProviderOnboardingSession,
    ClientOnboardingSession
)


# ─────────────────────────────────────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ('username', 'phone_number', 'role', 'verification_status', 'biometric_verified', 'is_on_trial', 'date_joined')
    list_filter   = ('role', 'verification_status', 'biometric_verified', 'is_on_trial', 'is_staff')
    search_fields = ('username', 'phone_number', 'first_name', 'last_name')
    ordering      = ('-date_joined',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('OneTouch Fields', {
            'fields': (
                'phone_number', 'role', 'verification_status',
                'biometric_verified', 'biometric_score',
                'is_on_trial', 'trial_ends_at',
            )
        }),
    )
    readonly_fields = ('biometric_score',)


# ─────────────────────────────────────────────────────────────────────────────
# IDENTITY DOCUMENT
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(IdentityDocument)
class IdentityDocumentAdmin(admin.ModelAdmin):
    list_display  = ('user', 'doc_type', 'status', 'auto_verified', 'ocr_confidence', 'created_at')
    list_filter   = ('status', 'doc_type', 'auto_verified')
    search_fields = ('user__username', 'user__phone_number')
    readonly_fields = (
        'auto_verified', 'ocr_confidence', 'ocr_extracted',
        'created_at', 'document_preview', 'selfie_preview',
    )

    def document_preview(self, obj):
        if obj.document_url:
            return format_html('<a href="{}" target="_blank">View Document</a>', obj.document_url.url)
        return '—'
    document_preview.short_description = 'Document'

    def selfie_preview(self, obj):
        if obj.biometric_selfie:
            return format_html('<img src="{}" style="max-height:150px;" />', obj.biometric_selfie.url)
        return '—'
    selfie_preview.short_description = 'Biometric Selfie'

    actions = ['approve_documents', 'reject_documents']

    def approve_documents(self, request, queryset):
        from django.utils import timezone
        queryset.update(status=IdentityDocument.STATUS_APPROVED, reviewed_by=request.user, reviewed_at=timezone.now())
        # Also update user verification status
        for doc in queryset:
            doc.user.verification_status = User.STATUS_VERIFIED
            doc.user.save(update_fields=['verification_status'])
        self.message_user(request, f'{queryset.count()} document(s) approved.')
    approve_documents.short_description = 'Approve selected documents'

    def reject_documents(self, request, queryset):
        from django.utils import timezone
        queryset.update(status=IdentityDocument.STATUS_REJECTED, reviewed_by=request.user, reviewed_at=timezone.now())
        self.message_user(request, f'{queryset.count()} document(s) rejected.')
    reject_documents.short_description = 'Reject selected documents'


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER PROFILE
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(ProviderProfile)
class ProviderProfileAdmin(admin.ModelAdmin):
    list_display  = ('user', 'is_available', 'avg_rating', 'total_jobs', 'price_min', 'price_max', 'commission_amount_display', 'created_at')
    list_filter   = ('is_available',)
    search_fields = ('user__username', 'user__phone_number', 'address')
    readonly_fields = ('avg_rating', 'total_reviews', 'total_jobs', 'created_at', 'updated_at')

    def commission_amount_display(self, obj):
        val = obj.commission_amount
        return f'{val} ETB' if val is not None else '—'
    commission_amount_display.short_description = '2% Commission'


# ─────────────────────────────────────────────────────────────────────────────
# PHONE OTP
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(PhoneOTP)
class PhoneOTPAdmin(admin.ModelAdmin):
    list_display  = ('phone_number', 'purpose', 'role', 'is_used', 'attempts', 'expires_at', 'created_at')
    list_filter   = ('purpose', 'is_used', 'role')
    search_fields = ('phone_number',)
    readonly_fields = ('code', 'created_at')

# ─────────────────────────────────────────────────────────────────────────────
# FACE BIOMETRIC VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(FaceBiometricVerification)
class FaceBiometricVerificationAdmin(admin.ModelAdmin):
    list_display = ('user_name', 'status', 'auto_verified', 'liveness_score', 'face_match_score', 'created_at')
    list_filter = ('status', 'auto_verified')
    search_fields = ('identity_document__user__username', 'identity_document__user__phone_number')
    readonly_fields = (
        'liveness_score', 'face_match_score', 'auto_verified',
        'created_at', 'selfie_preview',
    )

    def user_name(self, obj):
        return obj.identity_document.user.username
    user_name.short_description = 'User'

    def selfie_preview(self, obj):
        if obj.selfie_image:
            return format_html('<img src="{}" style="max-height:200px;" />', obj.selfie_image.url)
        return '—'
    selfie_preview.short_description = 'Selfie'

    actions = ['approve_verifications', 'reject_verifications']

    def approve_verifications(self, request, queryset):
        from django.utils import timezone
        queryset.update(status=FaceBiometricVerification.STATUS_APPROVED, reviewed_by=request.user, reviewed_at=timezone.now())
        # Also update user biometric verification status
        for verification in queryset:
            user = verification.identity_document.user
            user.biometric_verified = True
            user.verification_status = User.STATUS_VERIFIED
            user.save(update_fields=['biometric_verified', 'verification_status'])
        self.message_user(request, f'{queryset.count()} face verification(s) approved.')
    approve_verifications.short_description = 'Approve selected verifications'

    def reject_verifications(self, request, queryset):
        from django.utils import timezone
        queryset.update(status=FaceBiometricVerification.STATUS_REJECTED, reviewed_by=request.user, reviewed_at=timezone.now())
        self.message_user(request, f'{queryset.count()} face verification(s) rejected.')
    reject_verifications.short_description = 'Reject selected verifications'


# ─────────────────────────────────────────────────────────────────────────────
# SERVICE MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

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


@admin.register(ProviderOnboardingSession)
class ProviderOnboardingSessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'step', 'status', 'phone_for_verification', 'phone_verified', 'expires_at', 'created_at')
    list_filter = ('status', 'step', 'phone_verified')
    search_fields = ('session_id', 'phone_for_verification')
    readonly_fields = ('session_id', 'created_at', 'expires_at')


@admin.register(ClientOnboardingSession)
class ClientOnboardingSessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'phone_number', 'status', 'phone_verified', 'ocr_confidence', 'expires_at', 'created_at')
    list_filter = ('status', 'phone_verified')
    search_fields = ('session_id', 'phone_number')
    readonly_fields = ('session_id', 'created_at', 'expires_at', 'ocr_confidence', 'image_quality')