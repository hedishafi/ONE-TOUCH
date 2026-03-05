from django.db import models
from django.utils.text import slugify
from accounts.models import ProviderProfile


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
    provider   = models.ForeignKey(ProviderProfile, on_delete=models.CASCADE, related_name='provider_skills')
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
    provider    = models.ForeignKey(ProviderProfile, on_delete=models.CASCADE, related_name='services')
    category    = models.ForeignKey(ServiceCategory, on_delete=models.PROTECT, related_name='services')
    title       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    base_price  = models.DecimalField(max_digits=10, decimal_places=2)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} by {self.provider.user.username}'


# ─────────────────────────────────────────────────────────────────────────────
# COMMISSION RULE  (policy-driven — edit rows, not code)
#
# Admin sets commission per category, with optional flat fee OR percentage.
# effective_from/to allows time-boxed promotions without code changes.
# is_trial_exempt = True means trial providers pay 0 commission for this rule.
# ─────────────────────────────────────────────────────────────────────────────
class CommissionRule(models.Model):
    # Null category = global default rule (fallback)
    category        = models.ForeignKey(
        ServiceCategory, on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='commission_rules',
        help_text='Leave blank for a global default rule'
    )
    percentage      = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text='Commission as a percentage of service_amount (e.g. 10.00 = 10%)'
    )
    flat_fee        = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text='Fixed fee in ETB applied on top of percentage'
    )
    is_trial_exempt = models.BooleanField(
        default=True,
        help_text='If True, providers on active trial pay 0 commission'
    )
    effective_from  = models.DateTimeField(null=True, blank=True)
    effective_to    = models.DateTimeField(null=True, blank=True)
    description     = models.CharField(max_length=255, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Commission Rule'
        ordering = ['-effective_from']

    def __str__(self):
        cat = self.category.name if self.category else 'Global'
        return f'CommissionRule [{cat}] — {self.percentage}% + {self.flat_fee} ETB'
