from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    # ── Roles ────────────────────────────────────────────────────────────────
    ROLE_CLIENT   = 'client'
    ROLE_PROVIDER = 'provider'
    ROLE_ADMIN    = 'admin'
    ROLE_CHOICES  = [
        (ROLE_CLIENT,   'Client'),
        (ROLE_PROVIDER, 'Service Provider'),
        (ROLE_ADMIN,    'Admin'),
    ]

    # ── Verification ─────────────────────────────────────────────────────────
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

    # phone_number is required — make username auto-derived
    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = ['email', 'phone_number']

    @property
    def is_provider(self):
        return self.role == self.ROLE_PROVIDER

    @property
    def is_client(self):
        return self.role == self.ROLE_CLIENT

    def __str__(self):
        return f'{self.username} ({self.role})'


class ClientProfile(models.Model):
    TIER_BRONZE = 'bronze'
    TIER_SILVER = 'silver'
    TIER_GOLD   = 'gold'
    TIER_CHOICES = [(TIER_BRONZE, 'Bronze'), (TIER_SILVER, 'Silver'), (TIER_GOLD, 'Gold')]

    user           = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client_profile')
    full_name      = models.CharField(max_length=120)
    wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    loyalty_tier   = models.CharField(max_length=10, choices=TIER_CHOICES, default=TIER_BRONZE)
    total_bookings = models.PositiveIntegerField(default=0)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'ClientProfile({self.full_name})'


class ProviderProfile(models.Model):
    TIER_RISING  = 'rising_pro'
    TIER_TRUSTED = 'trusted_pro'
    TIER_ELITE   = 'elite_pro'
    TIER_CHOICES = [
        (TIER_RISING,  'Rising Pro'),
        (TIER_TRUSTED, 'Trusted Pro'),
        (TIER_ELITE,   'Elite Pro'),
    ]

    PRICING_HOURLY = 'hourly'
    PRICING_FIXED  = 'fixed'
    PRICING_CUSTOM = 'custom'
    PRICING_CHOICES = [
        (PRICING_HOURLY, 'Hourly'),
        (PRICING_FIXED,  'Fixed'),
        (PRICING_CUSTOM, 'Custom'),
    ]

    user                 = models.OneToOneField(User, on_delete=models.CASCADE, related_name='provider_profile')
    full_name            = models.CharField(max_length=120)
    bio                  = models.TextField(blank=True)
    category_id          = models.CharField(max_length=50, blank=True)   # FK to services.Category (string id)
    subcategory_id       = models.CharField(max_length=50, blank=True)
    pricing_model        = models.CharField(max_length=10, choices=PRICING_CHOICES, default=PRICING_HOURLY)
    hourly_rate          = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fixed_rate           = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    coverage_radius_km   = models.IntegerField(default=20)
    lat                  = models.FloatField(null=True, blank=True)
    lng                  = models.FloatField(null=True, blank=True)
    is_online            = models.BooleanField(default=False)
    wallet_balance       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    rating               = models.FloatField(default=0)
    total_jobs_completed = models.PositiveIntegerField(default=0)
    response_rate        = models.FloatField(default=0)
    completion_rate      = models.FloatField(default=0)
    loyalty_tier         = models.CharField(max_length=15, choices=TIER_CHOICES, default=TIER_RISING)
    selfie_url           = models.ImageField(upload_to='provider/selfies/', blank=True, null=True)
    id_document_url      = models.ImageField(upload_to='provider/documents/', blank=True, null=True)
    created_at           = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'ProviderProfile({self.full_name})'
