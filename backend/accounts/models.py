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

    # Multi-role system fields
    has_provider_role = models.BooleanField(default=False, help_text='True if user has provider role')
    provider_onboarding_completed = models.BooleanField(default=False, help_text='True if provider onboarding is complete')

    # Free-trial support: providers get trial_ends_at set on signup
    is_on_trial    = models.BooleanField(default=False)
    trial_ends_at  = models.DateTimeField(null=True, blank=True)

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
        # Set has_provider_role based on role
        self.has_provider_role = (self.role == self.ROLE_PROVIDER)
        
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


class UserRegistrationNotification(models.Model):
    """
    Track new user registrations for admin review.
    Provides a dedicated admin interface for reviewing new signups.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='registration_notification')
    user_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=30)
    role = models.CharField(max_length=20)
    provider_uid = models.CharField(max_length=6, blank=True)
    registration_time = models.DateTimeField(auto_now_add=True)
    reviewed = models.BooleanField(default=False, help_text='Mark as reviewed after admin checks the user')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_registrations'
    )
    notes = models.TextField(blank=True, help_text='Admin notes about this registration')

    class Meta:
        ordering = ['-registration_time']
        verbose_name = 'User Registration Notification'
        verbose_name_plural = 'User Registration Notifications'

    def __str__(self):
        return f'{self.user_name or self.phone_number} ({self.role}) - {self.registration_time.strftime("%Y-%m-%d %H:%M")}'


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
# SERVICE CATEGORIES & SUB-SERVICES
# ─────────────────────────────────────────────────────────────────────────────
class ServiceCategory(models.Model):
    """Main service categories (e.g., Plumbing, Electrical, Cleaning)"""
    name          = models.CharField(max_length=100, unique=True)
    slug          = models.SlugField(unique=True)
    description   = models.TextField(blank=True)
    icon_url      = models.URLField(blank=True, help_text='URL to category icon')
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Service Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class SubService(models.Model):
    """Sub-services under each category (e.g., Fix Faucet, Unclog Pipe)"""
    category      = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE, related_name='subservices')
    name          = models.CharField(max_length=100)
    slug          = models.SlugField()
    description   = models.TextField(blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('category', 'slug')
        ordering = ['category', 'name']

    def __str__(self):
        return f'{self.category.name} - {self.name}'


class ProviderService(models.Model):
    """Provider's chosen services (many-to-many with sub-services)"""
    provider      = models.OneToOneField(
        ProviderProfile, 
        on_delete=models.CASCADE, 
        related_name='service_offering'
    )
    primary_service = models.ForeignKey(
        ServiceCategory,
        on_delete=models.SET_NULL,
        null=True,
        help_text='Primary service category (the one they specialize in)'
    )
    subservices   = models.ManyToManyField(
        SubService,
        help_text='Sub-services provider offers (can be multiple)'
    )
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Provider Services'

    def __str__(self):
        return f'{self.provider.user.username} — {self.primary_service.name}'

