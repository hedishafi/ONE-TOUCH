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

    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = ['email', 'phone_number']

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
    status        = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    # Admin/staff who reviewed this document
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
    # Denormalized cache — updated by signals after each Review
    avg_rating         = models.FloatField(default=0.0)
    total_reviews      = models.PositiveIntegerField(default=0)
    total_jobs         = models.PositiveIntegerField(default=0)
    created_at         = models.DateTimeField(auto_now_add=True)
    updated_at         = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Provider Profile'

    def __str__(self):
        return f'ProviderProfile({self.user.username})'
