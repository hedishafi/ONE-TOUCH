from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import random


# ─────────────────────────────────────────────────────────────────────────────
# USER  (single auth table — role field controls access)
# ─────────────────────────────────────────────────────────────────────────────
class User(AbstractUser):
    ROLE_CLIENT   = 'client'
    ROLE_PROVIDER = 'provider'
    ROLE_ADMIN    = 'admin'
    ROLE_CHOICES  = [
        (ROLE_CLIENT,   'Client'),
        (ROLE_PROVIDER, 'Service Provider'),
        (ROLE_ADMIN,    'Admin'),
    ]

    STATUS_PENDING  = 'pending'
    STATUS_VERIFIED = 'verified'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES  = [
        (STATUS_PENDING,  'Pending'),
        (STATUS_VERIFIED, 'Verified'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    phone_number        = models.CharField(max_length=30, unique=True)
    role                = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_CLIENT)
    verification_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    provider_uid        = models.CharField(max_length=6, unique=True, null=True, blank=True, db_index=True)

    # Free-trial support: providers get trial_ends_at set on signup
    is_on_trial    = models.BooleanField(default=False)
    trial_ends_at  = models.DateTimeField(null=True, blank=True)

    # Biometric verification — providers only (clients do NOT go through biometrics)
    # biometric_verified is set True by the automated verification task after
    # liveness check + ID OCR match passes the confidence threshold.
    biometric_verified = models.BooleanField(default=False)
    biometric_score    = models.FloatField(
        null=True, blank=True,
        help_text='Liveness/face-match confidence score (0.0–1.0). Set by automated check.'
    )

    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = ['phone_number']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    # ── Helpers ───────────────────────────────────────────────────────────────
    @property
    def is_provider(self):
        return self.role == self.ROLE_PROVIDER

    @property
    def is_client(self):
        return self.role == self.ROLE_CLIENT

    @property
    def trial_is_active(self):
        """True when the provider is still within their free-trial window."""
        if not self.is_on_trial or not self.trial_ends_at:
            return False
        return timezone.now() < self.trial_ends_at

    @classmethod
    def generate_provider_uid(cls) -> str:
        while True:
            candidate = f'{random.randint(0, 999_999):06d}'
            if not cls.objects.filter(provider_uid=candidate).exists():
                return candidate

    def save(self, *args, **kwargs):
        if self.role == self.ROLE_PROVIDER and not self.provider_uid:
            self.provider_uid = self.generate_provider_uid()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.username} ({self.role})'


class DeletedProviderRecord(models.Model):
    phone_number = models.CharField(max_length=30, unique=True, db_index=True)
    provider_uid = models.CharField(max_length=6, blank=True)
    deleted_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-deleted_at']
        verbose_name = 'Deleted Provider Record'
        verbose_name_plural = 'Deleted Provider Records'

    def __str__(self):
        return f'{self.phone_number} (deleted provider)'


# ─────────────────────────────────────────────────────────────────────────────
# IDENTITY DOCUMENT  (one user may upload multiple verification docs)
# ─────────────────────────────────────────────────────────────────────────────
class IdentityDocument(models.Model):
    DOC_NATIONAL   = 'national_id'
    DOC_DRIVER     = 'drivers_license'
    DOC_KEBELE     = 'kebele_id'
    DOC_CHOICES    = [
        (DOC_NATIONAL, 'National ID'),
        (DOC_DRIVER,   "Driver's License"),
        (DOC_KEBELE,   'Kebele ID'),
    ]
    
    # Supported document types whitelist
    SUPPORTED_TYPES = {DOC_NATIONAL, DOC_DRIVER, DOC_KEBELE}

    STATUS_PENDING  = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_FLAGGED  = 'flagged'   # auto-scored below threshold; awaits admin review
    STATUS_CHOICES  = [
        (STATUS_PENDING,  'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_FLAGGED,  'Flagged – Needs Review'),
    ]

    user          = models.ForeignKey(User, on_delete=models.CASCADE, related_name='identity_documents')
    doc_type      = models.CharField(max_length=20, choices=DOC_CHOICES)
    document_url  = models.FileField(upload_to='identity_documents/')
    # Biometric selfie uploaded alongside the ID document (provider only)
    biometric_selfie = models.FileField(
        upload_to='biometric_selfies/', null=True, blank=True,
        help_text='Liveness selfie photo submitted by the provider during onboarding.'
    )
    status        = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)

    # ── Automated verification fields ─────────────────────────────────────────
    # auto_verified = True when OCR + liveness both pass the confidence threshold
    # without any human intervention.
    auto_verified   = models.BooleanField(default=False)
    ocr_confidence  = models.FloatField(
        null=True, blank=True,
        help_text='OCR match confidence score (0.0–1.0). Set by automated verification task.'
    )
    ocr_extracted   = models.JSONField(
        null=True, blank=True,
        help_text='Raw fields extracted by OCR (name, DOB, ID number) for audit purposes.'
    )
    # ── Canonical extracted fields (normalized from OCR) ────────────────────────
    extracted_name     = models.CharField(max_length=255, blank=True, help_text='Full name extracted by OCR.')
    extracted_id_number= models.CharField(
        max_length=128, blank=True, db_index=True,
        help_text='ID number extracted by OCR. Indexed for deduplication.'
    )
    extracted_dob      = models.DateField(null=True, blank=True, help_text='Date of birth from OCR.')
    extracted_gender   = models.CharField(
        max_length=20, blank=True,
        help_text='Gender extracted by OCR (e.g., "Male", "Female").'
    )
    extracted_nationality = models.CharField(max_length=100, blank=True, help_text='Nationality from OCR.')
    extracted_region   = models.CharField(
        max_length=100, blank=True,
        help_text='Region or Sub-City extracted by OCR (e.g., "Addis Ababa").'
    )
    extracted_wereda   = models.CharField(max_length=100, blank=True, help_text='District (wereda) extracted from OCR.')
    extracted_kebele   = models.CharField(max_length=100, blank=True, help_text='Sub-district (kebele) extracted from OCR.')
    extracted_home_address = models.TextField(blank=True, help_text='Home address extracted from OCR.')
    extracted_issue_date = models.DateField(null=True, blank=True, help_text='Document issue date from OCR.')
    extracted_expiry   = models.DateField(null=True, blank=True, help_text='Document expiry date from OCR.')
    extracted_phone    = models.CharField(max_length=30, blank=True, help_text='Phone number extracted from OCR.')
    ocr_language       = models.CharField(
        max_length=10, choices=[('am', 'Amharic'), ('en', 'English'), ('auto', 'Auto-detect')],
        null=True, blank=True,
        help_text='Language detected by OCR engine.'
    )
    # ─────────────────────────────────────────────────────────────────────────

    # Admin/staff who reviewed this document (only used for flagged/manual cases)
    reviewed_by   = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_documents'
    )
    reviewed_at   = models.DateTimeField(null=True, blank=True)
    rejection_note = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Identity Document'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} — {self.get_doc_type_display()} ({self.status})'


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER PROFILE  (created only when user.role == 'provider')
# ─────────────────────────────────────────────────────────────────────────────
class ProviderProfile(models.Model):
    user               = models.OneToOneField(User, on_delete=models.CASCADE, related_name='provider_profile')
    profile_completed  = models.BooleanField(default=False)
    profile_picture    = models.ImageField(upload_to='provider/profile_pictures/', null=True, blank=True)
    bio                = models.TextField(blank=True)
    address            = models.CharField(max_length=255, blank=True, help_text='Service area description (e.g., "Addis Ababa")')
    
    # ── Online/Offline Mode with Dynamic Location ──────────────────────────────
    # When provider is ONLINE, their current location is captured via GPS/mobile.
    # When provider is OFFLINE, location is not tracked.
    is_online          = models.BooleanField(default=False, help_text='True when provider is actively accepting jobs.')
    current_latitude   = models.FloatField(null=True, blank=True, help_text='Current GPS latitude (updated when online).')
    current_longitude  = models.FloatField(null=True, blank=True, help_text='Current GPS longitude (updated when online).')
    last_location_update = models.DateTimeField(null=True, blank=True, help_text='Timestamp of last location update.')
    
    is_available       = models.BooleanField(default=True)
    years_of_experience = models.PositiveSmallIntegerField(default=0)


    """"
    # Price range set by the provider — used to calculate commission.
    # Commission = (price_min + price_max) / 2  ×  2%
    price_min = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Minimum service price in ETB.'
    )
    price_max = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Maximum service price in ETB.'
    )
    """ 
    # Denormalized cache — updated by signals after each Review
    avg_rating         = models.FloatField(default=0.0)
    total_reviews      = models.PositiveIntegerField(default=0)
    total_jobs         = models.PositiveIntegerField(default=0)
    created_at         = models.DateTimeField(auto_now_add=True)
    updated_at         = models.DateTimeField(auto_now=True)

    @property
    def commission_amount(self):
        """Calculate the 2% commission based on the average of the price range."""
        if self.price_min is not None and self.price_max is not None:
            average = (self.price_min + self.price_max) / 2
            return round(average * 2 / 100, 2)
        return None

    class Meta:
        verbose_name = 'Provider Profile'

    def __str__(self):
        return f'ProviderProfile({self.user.username})'


# ─────────────────────────────────────────────────────────────────────────────
# CLIENT PROFILE  (for client dashboard and account data)
# ─────────────────────────────────────────────────────────────────────────────
class ClientProfile(models.Model):
    """
    Stores client-specific data: wallet, loyalty tier, booking history.
    Auto-created when a client account is created.
    """
    LOYALTY_BRONZE = 'bronze'
    LOYALTY_SILVER = 'silver'
    LOYALTY_GOLD = 'gold'
    LOYALTY_PLATINUM = 'platinum'
    LOYALTY_CHOICES = [
        (LOYALTY_BRONZE, 'Bronze'),
        (LOYALTY_SILVER, 'Silver'),
        (LOYALTY_GOLD, 'Gold'),
        (LOYALTY_PLATINUM, 'Platinum'),
    ]

    CLIENT_TYPE_INDIVIDUAL = 'individual'
    CLIENT_TYPE_BUSINESS = 'business'
    CLIENT_TYPE_CHOICES = [
        (CLIENT_TYPE_INDIVIDUAL, 'Individual'),
        (CLIENT_TYPE_BUSINESS, 'Business'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client_profile')
    client_type = models.CharField(
        max_length=20, choices=CLIENT_TYPE_CHOICES, default=CLIENT_TYPE_INDIVIDUAL,
        help_text='Individual or Business client'
    )
    full_name = models.CharField(max_length=255, blank=True)

    # Business-specific fields
    business_name = models.CharField(max_length=255, blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    business_address = models.CharField(max_length=500, blank=True)

    # Document uploads
    selfie_url = models.URLField(max_length=500, blank=True)
    id_document_url = models.URLField(max_length=500, blank=True)

    # Loyalty / rewards
    loyalty_tier = models.CharField(
        max_length=20, choices=LOYALTY_CHOICES, default=LOYALTY_BRONZE,
        help_text='Client loyalty tier for reward tracking'
    )

    # Wallet
    wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # Statistics
    total_bookings = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    avg_rating = models.FloatField(default=0.0, help_text='Average rating given to providers')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Client Profile'
        verbose_name_plural = 'Client Profiles'

    def __str__(self):
        return f'ClientProfile({self.user.phone_number}, {self.loyalty_tier})'


# ─────────────────────────────────────────────────────────────────────────────
# PHONE OTP  (for phone-only auth: register/login verification)
# ─────────────────────────────────────────────────────────────────────────────
class PhoneOTP(models.Model):
    PURPOSE_REGISTER = 'register'
    PURPOSE_LOGIN = 'login'
    PURPOSE_PROVIDER_ONBOARDING = 'provider_onboarding'
    PURPOSE_CHOICES = [
        (PURPOSE_REGISTER, 'Signup Registration'),
        (PURPOSE_LOGIN, 'Login'),
        (PURPOSE_PROVIDER_ONBOARDING, 'Provider Onboarding'),
    ]

    phone_number = models.CharField(max_length=30, db_index=True)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    # Persist optional metadata captured during OTP request (e.g. OCR extraction)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    username = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=User.ROLE_CHOICES, null=True, blank=True)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone_number', 'purpose', 'is_used']),
        ]

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f'OTP({self.phone_number}, {self.purpose}, used={self.is_used})'


# ─────────────────────────────────────────────────────────────────────────────
# FACE BIOMETRIC VERIFICATION (provider-only, post identity-doc upload)
# ─────────────────────────────────────────────────────────────────────────────
class FaceBiometricVerification(models.Model):
    STATUS_PENDING   = 'pending'
    STATUS_APPROVED  = 'approved'
    STATUS_FLAGGED   = 'flagged'
    STATUS_REJECTED  = 'rejected'
    STATUS_CHOICES   = [
        (STATUS_PENDING,  'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_FLAGGED,  'Flagged – Needs Review'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    identity_document  = models.OneToOneField(IdentityDocument, on_delete=models.CASCADE, related_name='face_verification')
    selfie_image       = models.FileField(upload_to='face_verification/')
    liveness_score     = models.FloatField(help_text='Liveness check score (0.0–1.0).')
    face_match_score   = models.FloatField(help_text='Face comparison score (0.0–1.0): selfie vs ID photo.')
    status             = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    auto_verified      = models.BooleanField(default=False)

    # Admin review
    reviewed_by        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_face_verifications')
    reviewed_at        = models.DateTimeField(null=True, blank=True)
    rejection_reason   = models.TextField(blank=True)
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Face Biometric Verification'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.identity_document.user.username} — Face verification ({self.status})'


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER MANUAL VERIFICATION (provider-only manual review by admin)
# ─────────────────────────────────────────────────────────────────────────────
class ProviderManualVerification(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    provider = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='manual_verifications',
        help_text='Service provider who submitted this verification package.',
    )
    id_front_image = models.FileField(upload_to='provider_verification/id_front/')
    id_back_image = models.FileField(upload_to='provider_verification/id_back/')
    selfie_image = models.FileField(upload_to='provider_verification/selfie/')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    rejection_reason = models.TextField(blank=True)

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_manual_verifications',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = 'Provider Manual Verification'
        verbose_name_plural = 'Provider Manual Verifications'

    def __str__(self):
        return f'{self.provider.username} — Manual verification ({self.status})'


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER ONBOARDING SESSION  (tracks multi-step signup progress)
# ─────────────────────────────────────────────────────────────────────────────
class ProviderOnboardingSession(models.Model):
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED   = 'completed'
    STATUS_ABANDONED   = 'abandoned'
    STATUS_CHOICES     = [
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_ABANDONED, 'Abandoned'),
    ]

    session_id        = models.CharField(max_length=64, unique=True, db_index=True)  # UUID
    step              = models.PositiveSmallIntegerField(default=1, help_text='Current step (1-5)')
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_IN_PROGRESS)

    # ── Step 1: Document Upload ───────────────────────────────────────────────
    front_image       = models.FileField(upload_to='onboarding_temp/', null=True, blank=True)
    back_image        = models.FileField(upload_to='onboarding_temp/', null=True, blank=True)
    document_type     = models.CharField(
        max_length=20,
        choices=IdentityDocument.DOC_CHOICES,
        null=True, blank=True
    )
    image_quality     = models.FloatField(
        null=True, blank=True,
        help_text='Image quality score (0-1): detects blurriness, lighting issues'
    )
    quality_warnings  = models.JSONField(
        default=list, blank=True,
        help_text='List of quality issues: ["blurry", "poor_lighting", "partial_text"]'
    )

    # ── Step 2: OCR Extraction & Confirmation ─────────────────────────────────
    extracted_data    = models.JSONField(
        null=True, blank=True,
        help_text='OCR extracted fields: {name, phone, id_number, dob, nationality}'
    )
    ocr_confidence    = models.FloatField(
        null=True, blank=True,
        help_text='Overall OCR confidence (0-1)'
    )
    confirmed_data    = models.JSONField(
        null=True, blank=True,
        help_text='User-confirmed data after reviewing OCR extraction'
    )

    # ── Step 3: Phone Verification ────────────────────────────────────────────
    phone_for_verification = models.CharField(
        max_length=30, null=True, blank=True,
        help_text='Phone number to send OTP (extracted or manually entered)'
    )
    phone_verified    = models.BooleanField(default=False)
    otp_code          = models.CharField(max_length=6, blank=True)

    # ── Step 4: Face Verification ────────────────────────────────────────────
    selfie_file       = models.FileField(upload_to='onboarding_temp/', null=True, blank=True)
    liveness_score    = models.FloatField(null=True, blank=True)
    face_match_score  = models.FloatField(null=True, blank=True)
    face_verified     = models.BooleanField(default=False)

    # ── Step 5: Profile Setup ────────────────────────────────────────────────
    bio               = models.TextField(blank=True)
    address           = models.CharField(max_length=255, blank=True)
    years_of_experience = models.PositiveSmallIntegerField(default=0)
    price_min         = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_max         = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    service_category  = models.ForeignKey(
        'services.ServiceCategory', on_delete=models.SET_NULL, null=True, blank=True,
        help_text='Primary service category (1 only)'
    )
    service_ids       = models.JSONField(
        default=list, blank=True,
        help_text='IDs of selected sub-services (multiple allowed)'
    )

    # ── Session Metadata ──────────────────────────────────────────────────────
    created_at        = models.DateTimeField(auto_now_add=True)
    expires_at        = models.DateTimeField(help_text='Session expires after 12 hours')
    completed_at      = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'OnboardingSession({self.session_id}, step {self.step})'

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at


# ─────────────────────────────────────────────────────────────────────────────
# CLIENT ONBOARDING SESSION  (simple: phone OTP + optional OCR for profile)
# ─────────────────────────────────────────────────────────────────────────────
class ClientOnboardingSession(models.Model):
    """
    Lightweight client onboarding: phone OTP verification + optional document upload.
    Unlike providers, clients don't need face verification or service selection.
    """
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED   = 'completed'
    STATUS_ABANDONED   = 'abandoned'
    STATUS_CHOICES     = [
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_ABANDONED, 'Abandoned'),
    ]

    session_id        = models.CharField(max_length=64, unique=True, db_index=True)  # UUID
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_IN_PROGRESS)

    # ── Step 1: Phone OTP Verification ────────────────────────────────────────
    phone_number      = models.CharField(max_length=30, db_index=True)
    phone_verified    = models.BooleanField(default=False)
    otp_code          = models.CharField(max_length=6, blank=True)

    # ── Step 2: Optional Document Upload + OCR ───────────────────────────────
    document_file     = models.FileField(upload_to='client_onboarding_temp/', null=True, blank=True)
    document_type     = models.CharField(
        max_length=20,
        choices=IdentityDocument.DOC_CHOICES,
        null=True, blank=True
    )
    
    # OCR Extraction results
    extracted_data    = models.JSONField(
        null=True, blank=True,
        help_text='OCR extracted fields: {name, phone, address, id_number}'
    )
    ocr_confidence    = models.FloatField(null=True, blank=True, help_text='OCR confidence (0-1)')
    image_quality     = models.FloatField(null=True, blank=True, help_text='Image quality (0-1)')
    quality_warnings  = models.JSONField(
        default=list, blank=True,
        help_text='Quality issues: ["blurry", "poor_lighting", "partial_text"]'
    )

    # ── Profile Fields (auto-filled from OCR or manual entry) ──────────────────
    first_name        = models.CharField(max_length=150, blank=True, help_text='Auto-filled from OCR or manually entered')
    last_name         = models.CharField(max_length=150, blank=True)
    address           = models.CharField(max_length=255, blank=True)

    # ── Session Metadata ──────────────────────────────────────────────────────
    created_at        = models.DateTimeField(auto_now_add=True)
    expires_at        = models.DateTimeField(help_text='Session expires after 6 hours')
    completed_at      = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'ClientOnboarding({self.phone_number}, {self.status})'

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at