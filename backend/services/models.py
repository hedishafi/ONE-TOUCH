from decimal import Decimal

from django.db import models
from django.utils.text import slugify
from django.core.exceptions import ValidationError


# ─────────────────────────────────────────────────────────────────────────────
# SERVICE CATEGORY  (e.g. Plumbing, Electrical, Cleaning)
# ─────────────────────────────────────────────────────────────────────────────
class ServiceCategory(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    slug        = models.SlugField(max_length=120, unique=True, blank=True)
    icon        = models.CharField(max_length=100, blank=True, help_text='Icon name or URL')
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Service Category'
        verbose_name_plural = 'Service Categories'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────────────────────────────────────
# SUB SERVICE  (sub-services under each category)
# ─────────────────────────────────────────────────────────────────────────────
class SubService(models.Model):
    category    = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE, related_name='subservices')
    name        = models.CharField(max_length=100)
    slug        = models.SlugField()
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('category', 'slug')
        ordering = ['category', 'name']

    def __str__(self):
        return f'{self.category.name} - {self.name}'


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER SERVICE  (provider's chosen services)
# ─────────────────────────────────────────────────────────────────────────────
class ProviderService(models.Model):
    provider        = models.OneToOneField('accounts.ProviderProfile', on_delete=models.CASCADE, related_name='service_offering')
    primary_service = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL, null=True)
    subservices     = models.ManyToManyField(SubService, help_text='Sub-services provider offers (can be multiple)')
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Provider Services'

    def __str__(self):
        primary = self.primary_service.name if self.primary_service else 'Unassigned'
        return f'{self.provider.user.username} — {primary}'


# ─────────────────────────────────────────────────────────────────────────────
# SKILL  (lookup table — e.g. "Pipe Repair", "AC Installation")
# ─────────────────────────────────────────────────────────────────────────────
class Skill(models.Model):
    name       = models.CharField(max_length=100, unique=True)
    slug       = models.SlugField(max_length=120, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER SKILL  (M2M junction — provider ↔ skill)
# ─────────────────────────────────────────────────────────────────────────────
class ProviderSkill(models.Model):
    provider   = models.ForeignKey('accounts.ProviderProfile', on_delete=models.CASCADE, related_name='provider_skills')
    skill      = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='provider_skills')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('provider', 'skill')
        verbose_name = 'Provider Skill'
 
    def __str__(self):
        return f'{self.provider.user.username} — {self.skill.name}'


# ─────────────────────────────────────────────────────────────────────────────
# SERVICE  (a specific offering listed by a provider)
# ─────────────────────────────────────────────────────────────────────────────
class Service(models.Model):
    providers   = models.ManyToManyField('accounts.ProviderProfile', related_name='services')
    category    = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT, related_name='services')
    title       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    base_price  = models.DecimalField(max_digits=10, decimal_places=2)
    # is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title}'


# ─────────────────────────────────────────────────────────────────────────────
# PROVIDER CATEGORY PRICING  (provider sets price range per category)
# ─────────────────────────────────────────────────────────────────────────────
class ProviderCategoryPricing(models.Model):
    provider    = models.ForeignKey('accounts.ProviderProfile', on_delete=models.CASCADE, related_name='category_pricings')
    category    = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE, related_name='provider_pricings')
    min_price   = models.DecimalField(max_digits=10, decimal_places=2, help_text='Minimum price for services in this category')
    max_price   = models.DecimalField(max_digits=10, decimal_places=2, help_text='Maximum price for services in this category')
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('provider', 'category')
        verbose_name = 'Provider Category Pricing'
        verbose_name_plural = 'Provider Category Pricings'
        ordering = ['provider', 'category']

    def clean(self):
        if self.min_price >= self.max_price:
            raise ValidationError('Minimum price must be less than maximum price.')
        # Ensure reasonable gap for comparison (max price no more than 500% above min price)
        if self.max_price > self.min_price * Decimal('6.0'):
            raise ValidationError('Price range gap is too large for reasonable comparison. Maximum price cannot exceed 500% above minimum price.')

    def __str__(self):
        return f'{self.provider.user.username} — {self.category.name}: {self.min_price} - {self.max_price} ETB'


