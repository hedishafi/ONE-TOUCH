from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


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

    def __str__(self):
        return f'{self.username} ({self.role})'


# ─────────────────────────────────────────────────────────────────────────────
# IDENTITY DOCUMENT  (one user may upload multiple verification docs)
# ─────────────────────────────────────────────────────────────────────────────
class IdentityDocument(models.Model):
    DOC_PASSPORT   = 'passport'
    DOC_NATIONAL   = 'national_id'
    DOC_COMPANY    = 'company_id'
    DOC_DRIVER     = 'drivers_license'
    DOC_CHOICES    = [
        (DOC_PASSPORT, 'Passport'),
        (DOC_NATIONAL, 'National ID'),
        (DOC_COMPANY,  'Company ID'),
        (DOC_DRIVER,   "Driver's License"),
    ]

    STATUS_PENDING  = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES  = [
        (STATUS_PENDING,  'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
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
    bio                = models.TextField(blank=True)
    address            = models.CharField(max_length=255, blank=True)
    latitude           = models.FloatField(null=True, blank=True)
    longitude          = models.FloatField(null=True, blank=True)
    is_available       = models.BooleanField(default=True)
    years_of_experience = models.PositiveSmallIntegerField(default=0)

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
# PHONE OTP  (for phone-only auth: register/login verification)
# ─────────────────────────────────────────────────────────────────────────────
class PhoneOTP(models.Model):
    PURPOSE_REGISTER = 'register'
    PURPOSE_LOGIN = 'login'
    PURPOSE_CHOICES = [
        (PURPOSE_REGISTER, 'Register'),
        (PURPOSE_LOGIN, 'Login'),
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
