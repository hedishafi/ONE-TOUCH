from django.db import models
from accounts.models import User, ProviderProfile
from services.models import Service


# ─────────────────────────────────────────────────────────────────────────────
# AI SESSION  (groups a full AI chat or voice conversation)
# ─────────────────────────────────────────────────────────────────────────────
class AISession(models.Model):
    SESSION_CHAT  = 'chat'
    SESSION_VOICE = 'voice'
    SESSION_CHOICES = [
        (SESSION_CHAT,  'Chat'),
        (SESSION_VOICE, 'Voice'),
    ]

    user          = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_sessions')
    session_type  = models.CharField(max_length=10, choices=SESSION_CHOICES, default=SESSION_CHAT)
    started_at    = models.DateTimeField(auto_now_add=True)
    ended_at      = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'AI Session'
        ordering = ['-started_at']

    def __str__(self):
        return f'AISession({self.user.username}, {self.session_type}, {self.started_at:%Y-%m-%d})'


# ─────────────────────────────────────────────────────────────────────────────
# AI MESSAGE  (individual turn within a session)
# ─────────────────────────────────────────────────────────────────────────────
class AIMessage(models.Model):
    SENDER_USER = 'user'
    SENDER_AI   = 'ai'
    SENDER_CHOICES = [
        (SENDER_USER, 'User'),
        (SENDER_AI,   'AI'),
    ]

    session    = models.ForeignKey(AISession, on_delete=models.CASCADE, related_name='messages')
    sender     = models.CharField(max_length=5, choices=SENDER_CHOICES)
    content    = models.TextField()
    # Structured intent extracted by the AI (e.g. "book_service", "get_price")
    intent_tag = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'AI Message'
        ordering = ['created_at']

    def __str__(self):
        return f'[{self.sender}] {self.content[:60]}'


# ─────────────────────────────────────────────────────────────────────────────
# ORDER  (central business entity — tracks the full job lifecycle)
#
# State machine:
#   pending → accepted → commission_pending → commission_paid
#          → in_progress → completed | cancelled
#
# client_phone_visible is set True only after CommissionPayment succeeds.
# ─────────────────────────────────────────────────────────────────────────────
class Order(models.Model):
    STATUS_PENDING            = 'pending'
    STATUS_ACCEPTED           = 'accepted'
    STATUS_COMMISSION_PENDING = 'commission_pending'
    STATUS_COMMISSION_PAID    = 'commission_paid'
    STATUS_IN_PROGRESS        = 'in_progress'
    STATUS_COMPLETED          = 'completed'
    STATUS_CANCELLED          = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PENDING,            'Pending'),
        (STATUS_ACCEPTED,           'Accepted'),
        (STATUS_COMMISSION_PENDING, 'Commission Pending'),
        (STATUS_COMMISSION_PAID,    'Commission Paid'),
        (STATUS_IN_PROGRESS,        'In Progress'),
        (STATUS_COMPLETED,          'Completed'),
        (STATUS_CANCELLED,          'Cancelled'),
    ]

    client      = models.ForeignKey(User, on_delete=models.PROTECT, related_name='orders_as_client')
    provider    = models.ForeignKey(
        ProviderProfile, on_delete=models.PROTECT,
        related_name='orders_as_provider',
        null=True, blank=True,           # null until a provider is matched/accepted
    )
    service     = models.ForeignKey(Service, on_delete=models.PROTECT, related_name='orders')
    # Optional: link back to the AI session that created this order
    ai_session  = models.ForeignKey(
        AISession, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='orders'
    )

    status               = models.CharField(max_length=25, choices=STATUS_CHOICES, default=STATUS_PENDING)

    # Problem context captured from client (via UI or AI)
    problem_description  = models.TextField(blank=True)
    budget_min           = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    budget_max           = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Job location (client's site, not provider's home)
    address              = models.CharField(max_length=255, blank=True)
    client_latitude      = models.FloatField(null=True, blank=True)
    client_longitude     = models.FloatField(null=True, blank=True)

    # KEY BUSINESS RULE: flipped to True only when CommissionPayment succeeds
    client_phone_visible = models.BooleanField(default=False)

    scheduled_at         = models.DateTimeField(null=True, blank=True)
    cancellation_reason  = models.TextField(blank=True)
    notes                = models.TextField(blank=True)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order#{self.pk} [{self.status}] {self.client.username} → {self.service.title}'


# ─────────────────────────────────────────────────────────────────────────────
# REVIEW  (one per completed order — supports two-way ratings)
#
# reviewer = person leaving the review (client or provider)
# reviewee = person being reviewed     (provider or client)
# This design supports client→provider AND provider→client reviews
# without any schema change.
# Rating is updated to ProviderProfile.avg_rating via a post-save signal.
# ─────────────────────────────────────────────────────────────────────────────
class Review(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]  # 1–5 stars

    order    = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='review')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    reviewee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    rating   = models.PositiveSmallIntegerField(choices=RATING_CHOICES)
    comment  = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Review'
        ordering = ['-created_at']

    def __str__(self):
        return f'Review#{self.pk} — {self.rating}★ by {self.reviewer.username}'


# ─────────────────────────────────────────────────────────────────────────────
# REWARD TRANSACTION  (append-only points ledger — never mutate rows)
#
# Balance = SUM(points WHERE type='earned') - SUM(points WHERE type='redeemed')
# ─────────────────────────────────────────────────────────────────────────────
class RewardTransaction(models.Model):
    TYPE_EARNED   = 'earned'
    TYPE_REDEEMED = 'redeemed'
    TYPE_CHOICES  = [
        (TYPE_EARNED,   'Earned'),
        (TYPE_REDEEMED, 'Redeemed'),
    ]

    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reward_transactions')
    # null=True: rewards can be granted manually (e.g. sign-up bonus) without an order
    order       = models.ForeignKey(
        Order, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reward_transactions'
    )
    points      = models.IntegerField(help_text='Positive = earned, Negative = redeemed')
    type        = models.CharField(max_length=10, choices=TYPE_CHOICES)
    description = models.CharField(max_length=255, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Reward Transaction'
        ordering = ['-created_at']

    def __str__(self):
        return f'Reward({self.user.username}, {self.type}, {self.points}pts)'
