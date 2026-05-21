from django.conf import settings
from django.db import models
from django.utils import timezone

from accounts.models import User, ProviderProfile
from services.models import ServiceCategory, SubService


class Order(models.Model):
    INPUT_VOICE = 'voice'
    INPUT_TEXT = 'text'
    INPUT_TYPE_CHOICES = [
        (INPUT_VOICE, 'Voice'),
        (INPUT_TEXT, 'Text'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_MATCHING = 'matching'
    STATUS_ACCEPTED = 'accepted'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_EXPIRED = 'expired'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_MATCHING, 'Matching'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_EXPIRED, 'Expired'),
    ]

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
        limit_choices_to={'role': User.ROLE_CLIENT},
    )
    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
    )
    sub_service = models.ForeignKey(
        SubService,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
    )
    input_type = models.CharField(max_length=10, choices=INPUT_TYPE_CHOICES)
    voice_file = models.FileField(upload_to='orders/voice/', null=True, blank=True)
    transcription = models.TextField(blank=True)
    description = models.TextField(blank=True)
    client_latitude = models.FloatField()
    client_longitude = models.FloatField()
    client_address = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order#{self.pk} ({self.status})'


class OrderMatch(models.Model):
    STATUS_NOTIFIED = 'notified'
    STATUS_ACCEPTED = 'accepted'
    STATUS_DECLINED = 'declined'
    STATUS_EXPIRED = 'expired'
    STATUS_CHOICES = [
        (STATUS_NOTIFIED, 'Notified'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_DECLINED, 'Declined'),
        (STATUS_EXPIRED, 'Expired'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='matches')
    provider = models.ForeignKey(ProviderProfile, on_delete=models.CASCADE, related_name='order_matches')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NOTIFIED)
    notified_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('order', 'provider')
        ordering = ['notified_at']

    def __str__(self):
        return f'OrderMatch(order={self.order_id}, provider={self.provider_id}, status={self.status})'


class OrderAssignment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='assignment')
    provider = models.ForeignKey(ProviderProfile, on_delete=models.CASCADE, related_name='assignments')
    commission_fee = models.DecimalField(max_digits=10, decimal_places=2)
    commission_paid = models.BooleanField(default=False)
    commission_paid_at = models.DateTimeField(null=True, blank=True)
    client_contact_released = models.BooleanField(default=False)
    contact_released_at = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def release_contact(self):
        self.client_contact_released = True
        self.contact_released_at = timezone.now()
        self.save(update_fields=['client_contact_released', 'contact_released_at'])

    def __str__(self):
        return f'OrderAssignment(order={self.order_id}, provider={self.provider_id})'


class OrderStatusLog(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_logs')
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'OrderStatusLog(order={self.order_id}, {self.old_status} -> {self.new_status})'
