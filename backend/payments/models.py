from django.db import models
from accounts.models import ProviderProfile
from orders.models import Order
from services.models import CommissionRule


# ─────────────────────────────────────────────────────────────────────────────
# COMMISSION PAYMENT
#
# The SERVICE PROVIDER pays a platform commission via TeleBirr/Chapa.
# Only when status = 'success' does Order.client_phone_visible become True.
#
# attempt_no supports retries: each failed attempt creates a new row
# with attempt_no = previous + 1, keeping full audit history.
# ─────────────────────────────────────────────────────────────────────────────
class CommissionPayment(models.Model):
    METHOD_TELEBIRR = 'telebirr'
    METHOD_CHAPA    = 'chapa'
    METHOD_CHOICES  = [
        (METHOD_TELEBIRR, 'TeleBirr'),
        (METHOD_CHAPA,    'Chapa'),
    ]

    STATUS_PENDING  = 'pending'
    STATUS_SUCCESS  = 'success'
    STATUS_FAILED   = 'failed'
    STATUS_REFUNDED = 'refunded'
    STATUS_CHOICES  = [
        (STATUS_PENDING,  'Pending'),
        (STATUS_SUCCESS,  'Success'),
        (STATUS_FAILED,   'Failed'),
        (STATUS_REFUNDED, 'Refunded'),
    ]

    order           = models.ForeignKey(Order, on_delete=models.PROTECT, related_name='commission_payments')
    provider        = models.ForeignKey(ProviderProfile, on_delete=models.PROTECT, related_name='commission_payments')
    # Snapshot the rule used at the time of payment (rule may change later)
    commission_rule = models.ForeignKey(CommissionRule, on_delete=models.SET_NULL, null=True, related_name='payments')

    # Amounts stored separately for full auditability
    service_amount     = models.DecimalField(max_digits=10, decimal_places=2)
    commission_amount  = models.DecimalField(max_digits=10, decimal_places=2)

    method            = models.CharField(max_length=10, choices=METHOD_CHOICES, default=METHOD_TELEBIRR)
    status            = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)

    # Unique reference from TeleBirr/Chapa gateway — used for reconciliation
    transaction_ref   = models.CharField(max_length=255, unique=True)

    # Retry tracking: attempt_no=1 is first try, increments on each retry
    attempt_no        = models.PositiveSmallIntegerField(default=1)
    failure_reason    = models.TextField(blank=True)

    paid_at    = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Commission Payment'
        ordering = ['-created_at']

    def __str__(self):
        return f'CommissionPayment#{self.pk} [{self.status}] {self.provider.user.username} — {self.commission_amount} ETB'
