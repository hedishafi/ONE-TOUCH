from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

from .models import IdentityDocument, PhoneOTP, ProviderProfile, User


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
