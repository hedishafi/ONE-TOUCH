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
    RoleChangeRequest,
    ServiceCategory,
    SubService,
    User,
    UserRegistrationNotification,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('display_user', 'phone_number', 'provider_uid_display', 'role', 'verification_status_display', 'is_on_trial_display', 'date_joined')
    list_filter = ('role', 'verification_status', 'is_on_trial', 'is_staff')
    search_fields = ('phone_number', 'provider_uid', 'first_name', 'last_name', 'email')
    ordering = ('-date_joined',)
    actions = ['reset_phone_number']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('OneTouch Fields', {
            'fields': (
                'phone_number',
                'role',
                'verification_status',
                'provider_uid',
                'is_on_trial',
                'trial_ends_at',
            ),
            'description': 'Note: Verification status is automatically managed by Provider Manual Verification. To approve/reject providers, use the Provider Manual Verification admin.'
        }),
    )
    readonly_fields = ('provider_uid', 'verification_status')

    def display_user(self, obj):
        """Display user's full name or fallback to phone/email"""
        full_name = obj.get_full_name().strip()
        if full_name:
            return full_name
        if obj.phone_number:
            return obj.phone_number
        return obj.email or 'User'
    display_user.short_description = 'User'

    def provider_uid_display(self, obj):
        """Display clean 6-digit UID for providers only"""
        if obj.role == User.ROLE_PROVIDER:
            return obj.provider_uid or '—'
        return '—'
    provider_uid_display.short_description = 'Provider UID'

    def verification_status_display(self, obj):
        """Show verification status only for providers"""
        if obj.role == User.ROLE_CLIENT:
            return '—'
        return obj.verification_status
    verification_status_display.short_description = 'Verification status'

    def is_on_trial_display(self, obj):
        """Show trial status only for providers"""
        if obj.role == User.ROLE_CLIENT:
            return '—'
        return obj.is_on_trial
    is_on_trial_display.short_description = 'Is on trial'

    def reset_phone_number(self, request, queryset):
        """
        Admin action to reset phone numbers, allowing re-registration.
        This removes the phone number from deleted provider records.
        """
        count = 0
        for user in queryset:
            # Remove from deleted provider records if exists
            DeletedProviderRecord.objects.filter(phone_number=user.phone_number).delete()
            count += 1
        
        self.message_user(
            request,
            f'Successfully reset {count} phone number(s). These phone numbers can now be used for re-registration.',
            messages.SUCCESS
        )
    reset_phone_number.short_description = 'Reset phone number (allow re-registration)'


@admin.register(ProviderProfile)
class ProviderProfileAdmin(admin.ModelAdmin):
    list_display = ('provider_name_display', 'provider_uid_display', 'is_available', 'avg_rating', 'total_jobs', 'price_min', 'price_max', 'commission_amount_display', 'created_at')
    list_filter = ('is_available',)
    search_fields = ('user__username', 'user__phone_number', 'user__first_name', 'user__last_name', 'user__provider_uid', 'address')
    readonly_fields = ('avg_rating', 'total_reviews', 'total_jobs', 'created_at', 'updated_at')

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Ensure only providers appear in the user dropdown"""
        if db_field.name == 'user':
            kwargs['queryset'] = User.objects.filter(role=User.ROLE_PROVIDER)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def provider_name_display(self, obj):
        """Display provider's actual name"""
        full_name = obj.user.get_full_name().strip()
        if full_name:
            return full_name
        return obj.user.phone_number or obj.user.username
    provider_name_display.short_description = 'Provider Name'

    def provider_uid_display(self, obj):
        """Display clean 6-digit UID"""
        return obj.user.provider_uid or '—'
    provider_uid_display.short_description = 'Provider UID'

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
    list_display = ('provider_name_display', 'provider_uid_display', 'primary_service', 'subservice_count', 'created_at')
    list_filter = ('primary_service',)
    search_fields = ('provider__user__username', 'provider__user__phone_number', 'provider__user__first_name', 'provider__user__last_name', 'provider__user__provider_uid', 'primary_service__name')

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Ensure only providers appear in dropdowns"""
        if db_field.name == 'provider':
            # Filter to show only ProviderProfile instances (which are already provider-only)
            kwargs['queryset'] = ProviderProfile.objects.select_related('user').filter(user__role=User.ROLE_PROVIDER)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def provider_name_display(self, obj):
        """Display provider's actual name"""
        full_name = obj.provider.user.get_full_name().strip()
        if full_name:
            return full_name
        return obj.provider.user.phone_number or obj.provider.user.username
    provider_name_display.short_description = 'Provider Name'

    def provider_uid_display(self, obj):
        """Display clean 6-digit UID"""
        return obj.provider.user.provider_uid or '—'
    provider_uid_display.short_description = 'Provider UID'

    def subservice_count(self, obj):
        return obj.subservices.count()
    subservice_count.short_description = 'Subservices'


@admin.register(ProviderManualVerification)
class ProviderManualVerificationAdmin(admin.ModelAdmin):
    change_list_template = 'admin/accounts/providermanualverification/change_list.html'
    change_form_template = 'admin/accounts/providermanualverification/change_form.html'
    list_display = ('provider_identity', 'provider_uid_display', 'status', 'submitted_at', 'reviewed_at')
    list_filter = ('status', 'submitted_at')
    search_fields = ('provider__phone_number', 'provider__provider_uid', 'provider__first_name', 'provider__last_name', 'provider__email')
    readonly_fields = ('reviewed_at', 'submitted_at', 'updated_at', 'id_front_preview', 'id_back_preview', 'selfie_preview')
    fields = (
        'provider',
        'status',
        'admin_hint',
        'rejection_reason',
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

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'provider':
            kwargs['queryset'] = User.objects.filter(role=User.ROLE_PROVIDER)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def save_model(self, request, obj, form, change):
        if obj.status in {ProviderManualVerification.STATUS_APPROVED, ProviderManualVerification.STATUS_REJECTED}:
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
            
            # If rejected, generate AI message if admin_hint provided
            if obj.status == ProviderManualVerification.STATUS_REJECTED:
                if obj.admin_hint and not obj.rejection_reason:
                    from .ai_service import generate_rejection_message
                    obj.rejection_reason = generate_rejection_message(obj.admin_hint, 'verification')
                
                if not obj.rejection_reason:
                    from .ai_service import get_default_message
                    obj.rejection_reason = get_default_message('verification')
        
        super().save_model(request, obj, form, change)

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
            path(
                'api/generate-rejection/',
                self.admin_site.admin_view(self.generate_rejection_api),
                name='accounts_providermanualverification_generate_rejection',
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
            # Get admin's input
            admin_input = (request.POST.get('admin_input') or '').strip()
            
            if not admin_input:
                return JsonResponse({'detail': 'Please provide a reason to expand.'}, status=400)
            
            # Generate multiple professional variations
            variations = self._generate_rejection_variations(admin_input)
            
            return JsonResponse({
                'variations': variations,
                'count': len(variations)
            }, status=200)

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

    def generate_rejection_api(self, request):
        """API endpoint for generating AI rejection message variations"""
        if request.method != 'POST':
            return JsonResponse({'detail': 'Method not allowed.'}, status=405)

        admin_input = (request.POST.get('admin_input') or '').strip()
        
        if not admin_input:
            return JsonResponse({'detail': 'Please provide a reason to expand.'}, status=400)
        
        from .ai_service import generate_multiple_variations
        variations = generate_multiple_variations(admin_input, context='verification', count=4)
        
        return JsonResponse({
            'variations': variations,
            'count': len(variations)
        }, status=200)

    def _generate_rejection_variations(self, admin_input: str) -> list:
        """
        Generate multiple professional variations of rejection reasons.
        Expands short admin input into formal, well-written explanations.
        """
        admin_lower = admin_input.lower()
        variations = []
        
        # Analyze the input to determine the issue type
        is_blurry = any(word in admin_lower for word in ['blur', 'blurry', 'unclear', 'not clear', 'quality'])
        is_lighting = any(word in admin_lower for word in ['dark', 'light', 'lighting', 'shadow', 'glare'])
        is_cropped = any(word in admin_lower for word in ['crop', 'cut', 'partial', 'incomplete', 'missing'])
        is_mismatch = any(word in admin_lower for word in ['match', 'different', 'mismatch', 'not same', 'inconsistent'])
        is_edited = any(word in admin_lower for word in ['edit', 'filter', 'photoshop', 'modified', 'altered'])
        is_expired = any(word in admin_lower for word in ['expire', 'old', 'outdated', 'invalid'])
        
        # Generate context-aware variations
        if is_blurry:
            variations.extend([
                f"{admin_input}. The submitted images are not clear enough for verification. Please capture new photos in good lighting with a steady hand, ensuring all text and details are sharp and readable.",
                f"{admin_input}. We cannot verify your identity due to image quality issues. Please retake the photos ensuring your camera is focused and all information on the ID is clearly visible.",
                f"{admin_input}. The image quality does not meet our verification standards. Please submit new, high-resolution photos where all text, dates, and facial features are crisp and legible."
            ])
        
        if is_lighting:
            variations.extend([
                f"{admin_input}. Poor lighting conditions make it difficult to verify your documents. Please retake the photos in a well-lit area, avoiding shadows, glare, or reflections on the ID.",
                f"{admin_input}. The lighting in your photos obscures important details. Please capture new images in natural daylight or bright indoor lighting, ensuring the entire ID is evenly lit.",
                f"{admin_input}. We cannot process your verification due to lighting issues. Please photograph your ID in good lighting conditions without flash glare or dark shadows."
            ])
        
        if is_cropped:
            variations.extend([
                f"{admin_input}. Parts of your ID are cut off or missing from the frame. Please retake the photos ensuring the entire ID card is visible within the frame, including all four corners.",
                f"{admin_input}. The submitted images are incomplete. Please capture new photos showing your full ID card from edge to edge, with no parts cropped out.",
                f"{admin_input}. We need to see your complete ID for verification. Please retake the photos ensuring the entire document is captured within the frame without any edges cut off."
            ])
        
        if is_mismatch:
            variations.extend([
                f"{admin_input}. The information or photo on your ID does not match your selfie. Please ensure you are submitting your own valid ID and a current selfie that clearly shows your face.",
                f"{admin_input}. We cannot verify the consistency between your ID and selfie. Please resubmit with a clear selfie that matches the photo on your identification document.",
                f"{admin_input}. There are discrepancies between your submitted documents. Please provide a valid ID and a well-lit selfie where your facial features clearly match the ID photo."
            ])
        
        if is_edited:
            variations.extend([
                f"{admin_input}. The submitted images appear to have been edited or filtered. Please provide original, unedited photos of your ID and selfie for verification.",
                f"{admin_input}. We detected modifications to your submitted images. Please resubmit original, unaltered photos taken directly with your camera without any editing or filters.",
                f"{admin_input}. Your documents cannot be verified due to suspected editing. Please capture new, authentic photos without using any photo editing tools or filters."
            ])
        
        if is_expired:
            variations.extend([
                f"{admin_input}. The ID you submitted has expired or is no longer valid. Please provide a current, valid government-issued identification document.",
                f"{admin_input}. We cannot accept expired identification. Please resubmit with a valid, unexpired ID that is currently recognized by government authorities.",
                f"{admin_input}. Your identification document is not current. Please provide a valid ID that has not passed its expiration date."
            ])
        
        # If no specific issue detected, generate general variations
        if not variations:
            variations = [
                f"{admin_input}. Please review the requirements and resubmit clear, unedited photos of both sides of your ID and a well-lit selfie that matches your ID photo.",
                f"{admin_input}. To proceed with verification, please provide high-quality images where all details are clearly visible and your selfie matches the photo on your ID.",
                f"{admin_input}. We need clearer documentation to verify your identity. Please capture new photos in good lighting, ensuring all information is readable and your selfie clearly shows your face."
            ]
        
        # Add a general professional variation
        variations.append(
            f"{admin_input}. For successful verification, please ensure: (1) All photos are clear and well-lit, (2) Your entire ID is visible in the frame, (3) Your selfie clearly shows your face and matches your ID photo, (4) No filters or editing have been applied."
        )
        
        # Return up to 4 variations
        return variations[:4]

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


@admin.register(UserRegistrationNotification)
class UserRegistrationNotificationAdmin(admin.ModelAdmin):
    list_display = ('user_name_display', 'phone_number', 'role_display', 'provider_uid_display', 'registration_time', 'reviewed_status')
    list_filter = ('role', 'reviewed', 'registration_time')
    search_fields = ('user_name', 'phone_number', 'provider_uid', 'user__first_name', 'user__last_name')
    readonly_fields = ('user', 'user_name', 'phone_number', 'role', 'provider_uid', 'registration_time')
    ordering = ('-registration_time',)
    actions = ['mark_as_reviewed']

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'api/unreviewed/',
                self.admin_site.admin_view(self.unreviewed_notifications_api),
                name='accounts_userregistrationnotification_api_unreviewed',
            ),
        ]
        return custom_urls + urls

    def unreviewed_notifications_api(self, request):
        """API endpoint for fetching unreviewed notifications"""
        from django.utils.timesince import timesince
        
        notifications = UserRegistrationNotification.objects.filter(
            reviewed=False
        ).select_related('user').order_by('-registration_time')[:10]
        
        data = {
            'count': UserRegistrationNotification.objects.filter(reviewed=False).count(),
            'notifications': [
                {
                    'id': notif.id,
                    'user_name': notif.user_name,
                    'phone_number': notif.phone_number,
                    'role': notif.role,
                    'provider_uid': notif.provider_uid,
                    'time_ago': timesince(notif.registration_time) + ' ago',
                }
                for notif in notifications
            ]
        }
        
        return JsonResponse(data)

    fieldsets = (
        ('User Information', {
            'fields': ('user', 'user_name', 'phone_number', 'role', 'provider_uid', 'registration_time')
        }),
        ('Review Status', {
            'fields': ('reviewed', 'reviewed_at', 'reviewed_by', 'notes')
        }),
    )

    def user_name_display(self, obj):
        """Display user's name or phone number"""
        return obj.user_name or obj.phone_number
    user_name_display.short_description = 'User Name'

    def role_display(self, obj):
        """Display role in a user-friendly format"""
        role_map = {
            'client': 'Client',
            'provider': 'Provider',
            'admin': 'Admin',
        }
        return role_map.get(obj.role, obj.role)
    role_display.short_description = 'Role'

    def provider_uid_display(self, obj):
        """Display provider UID or N/A for clients"""
        if obj.role == 'provider' and obj.provider_uid:
            return obj.provider_uid
        return '—'
    provider_uid_display.short_description = 'Provider UID'

    def reviewed_status(self, obj):
        """Display reviewed status with icon"""
        if obj.reviewed:
            return format_html('<span style="color: green;">✓ Reviewed</span>')
        return format_html('<span style="color: orange;">⏳ Pending</span>')
    reviewed_status.short_description = 'Status'

    def save_model(self, request, obj, form, change):
        """Auto-set reviewed_by and reviewed_at when marking as reviewed"""
        if obj.reviewed and not obj.reviewed_at:
            obj.reviewed_at = timezone.now()
            obj.reviewed_by = request.user
        super().save_model(request, obj, form, change)

    def mark_as_reviewed(self, request, queryset):
        """Bulk action to mark notifications as reviewed"""
        updated = queryset.update(
            reviewed=True,
            reviewed_at=timezone.now(),
            reviewed_by=request.user
        )
        self.message_user(request, f'{updated} notification(s) marked as reviewed.')
    mark_as_reviewed.short_description = 'Mark selected as reviewed'


@admin.register(RoleChangeRequest)
class RoleChangeRequestAdmin(admin.ModelAdmin):
    change_form_template = 'admin/accounts/rolechangerequest/change_form.html'
    list_display = ('user_display', 'phone_number_display', 'current_role', 'requested_role', 'status_badge', 'created_at', 'reviewed_at')
    list_filter = ('status', 'current_role', 'requested_role', 'created_at')
    search_fields = ('user__phone_number', 'user__first_name', 'user__last_name', 'user__email', 'reason', 'admin_notes')
    readonly_fields = ('user', 'current_role', 'requested_role', 'reason', 'created_at', 'updated_at', 'reviewed_by', 'reviewed_at')
    ordering = ('-created_at',)
    actions = ['approve_role_change', 'reject_role_change']

    fieldsets = (
        ('Request Information', {
            'fields': ('user', 'current_role', 'requested_role', 'reason', 'created_at')
        }),
        ('Review', {
            'fields': ('status', 'admin_notes', 'admin_hint', 'rejection_message', 'reviewed_by', 'reviewed_at', 'updated_at')
        }),
    )

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'api/generate-rejection/',
                self.admin_site.admin_view(self.generate_rejection_api),
                name='accounts_rolechangerequest_generate_rejection',
            ),
        ]
        return custom_urls + urls

    def generate_rejection_api(self, request):
        """API endpoint for generating AI rejection message variations"""
        if request.method != 'POST':
            return JsonResponse({'detail': 'Method not allowed.'}, status=405)

        admin_input = (request.POST.get('admin_input') or '').strip()
        
        if not admin_input:
            return JsonResponse({'detail': 'Please provide a reason to expand.'}, status=400)
        
        from .ai_service import generate_multiple_variations
        variations = generate_multiple_variations(admin_input, context='role_change', count=4)
        
        return JsonResponse({
            'variations': variations,
            'count': len(variations)
        }, status=200)

    def user_display(self, obj):
        """Display user's name or phone"""
        full_name = obj.user.get_full_name().strip()
        if full_name:
            return full_name
        return obj.user.phone_number or obj.user.username
    user_display.short_description = 'User'

    def phone_number_display(self, obj):
        """Display phone number"""
        return obj.user.phone_number
    phone_number_display.short_description = 'Phone Number'

    def status_badge(self, obj):
        """Display status with color coding"""
        colors = {
            'pending': 'orange',
            'approved': 'green',
            'rejected': 'red',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">● {}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def save_model(self, request, obj, form, change):
        """Auto-set reviewed_by and reviewed_at when status changes"""
        if change and 'status' in form.changed_data:
            if obj.status in [RoleChangeRequest.STATUS_APPROVED, RoleChangeRequest.STATUS_REJECTED]:
                obj.reviewed_by = request.user
                obj.reviewed_at = timezone.now()
                
                # If approved, add the requested role to approved_roles
                if obj.status == RoleChangeRequest.STATUS_APPROVED:
                    user = obj.user
                    requested_role = obj.requested_role
                    
                    # Add the requested role to approved_roles
                    if requested_role not in user.approved_roles:
                        user.approved_roles.append(requested_role)
                    
                    # If changing to provider, set up provider-specific fields
                    if requested_role == User.ROLE_PROVIDER:
                        if not user.provider_uid:
                            user.provider_uid = User.generate_provider_uid()
                        
                        # Only set trial if user doesn't already have provider role active
                        if user.role != User.ROLE_PROVIDER:
                            user.is_on_trial = True
                            from datetime import timedelta
                            user.trial_ends_at = timezone.now() + timedelta(days=14)
                        
                        # Reset provider profile if it exists
                        try:
                            profile = user.provider_profile
                            profile.profile_completed = False
                            profile.save(update_fields=['profile_completed'])
                        except ProviderProfile.DoesNotExist:
                            pass
                    
                    user.save()
                    
                    messages.success(
                        request,
                        f'Role change approved. User {user.phone_number} now has access to {obj.get_requested_role_display()} role. '
                        f'They can switch between roles using the role switcher in the sidebar.'
                    )
                
                # If rejected, generate AI message if admin_hint provided
                elif obj.status == RoleChangeRequest.STATUS_REJECTED:
                    if obj.admin_hint and not obj.rejection_message:
                        from .ai_service import generate_rejection_message
                        obj.rejection_message = generate_rejection_message(obj.admin_hint, 'role_change')
                    
                    if not obj.rejection_message:
                        from .ai_service import get_default_message
                        obj.rejection_message = get_default_message('role_change')
                    
                    messages.warning(
                        request,
                        f'Role change rejected for user {obj.user.phone_number}.'
                    )
        
        super().save_model(request, obj, form, change)

    def approve_role_change(self, request, queryset):
        """Bulk action to approve role change requests"""
        count = 0
        for role_request in queryset.filter(status=RoleChangeRequest.STATUS_PENDING):
            role_request.status = RoleChangeRequest.STATUS_APPROVED
            role_request.reviewed_by = request.user
            role_request.reviewed_at = timezone.now()
            role_request.save()
            
            user = role_request.user
            requested_role = role_request.requested_role
            
            # Add the requested role to approved_roles (don't change current role)
            if requested_role not in user.approved_roles:
                user.approved_roles.append(requested_role)
            
            # If changing to provider, set up provider-specific fields
            if requested_role == User.ROLE_PROVIDER:
                if not user.provider_uid:
                    user.provider_uid = User.generate_provider_uid()
                
                # Only set trial if user doesn't already have provider role active
                if user.role != User.ROLE_PROVIDER:
                    user.is_on_trial = True
                    from datetime import timedelta
                    user.trial_ends_at = timezone.now() + timedelta(days=14)
                
                # Reset provider profile if it exists
                try:
                    profile = user.provider_profile
                    profile.profile_completed = False
                    profile.save(update_fields=['profile_completed'])
                except ProviderProfile.DoesNotExist:
                    pass
            
            user.save()
            count += 1
        
        self.message_user(
            request,
            f'{count} role change request(s) approved. Users can now switch to their new roles using the role switcher.',
            messages.SUCCESS
        )
    approve_role_change.short_description = 'Approve selected role change requests'

    def reject_role_change(self, request, queryset):
        """Bulk action to reject role change requests"""
        count = queryset.filter(status=RoleChangeRequest.STATUS_PENDING).update(
            status=RoleChangeRequest.STATUS_REJECTED,
            reviewed_by=request.user,
            reviewed_at=timezone.now()
        )
        self.message_user(request, f'{count} role change request(s) rejected.', messages.WARNING)
    reject_role_change.short_description = 'Reject selected role change requests'
