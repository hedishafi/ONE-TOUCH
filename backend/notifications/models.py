from django.db import models
from accounts.models import User


# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATION  (in-app / push alerts for all events)
#
# related_object_type + related_object_id = generic FK pattern.
# This lets the frontend deep-link to any object (order, payment, review)
# without adding a new FK column for every future feature.
#
# e.g. related_object_type='order', related_object_id=42
# ─────────────────────────────────────────────────────────────────────────────
class Notification(models.Model):
    TYPE_ORDER      = 'order'
    TYPE_COMMISSION = 'commission'
    TYPE_REVIEW     = 'review'
    TYPE_SYSTEM     = 'system'
    TYPE_CHOICES    = [
        (TYPE_ORDER,      'Order'),
        (TYPE_COMMISSION, 'Commission'),
        (TYPE_REVIEW,     'Review'),
        (TYPE_SYSTEM,     'System'),
    ]

    user                = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title               = models.CharField(max_length=200)
    body                = models.TextField()
    type                = models.CharField(max_length=15, choices=TYPE_CHOICES, default=TYPE_SYSTEM)

    # Generic pointer to the related object (order, payment, etc.)
    related_object_type = models.CharField(max_length=50, blank=True)
    related_object_id   = models.PositiveIntegerField(null=True, blank=True)

    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notification'
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.type}] {self.title} → {self.user.username}'
