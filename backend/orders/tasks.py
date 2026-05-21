from celery import shared_task
from django.utils import timezone

from orders.models import Order, OrderMatch


@shared_task
def expire_pending_orders():
	now = timezone.now()
	orders = Order.objects.filter(status=Order.STATUS_MATCHING, expires_at__lt=now)
	for order in orders:
		order.status = Order.STATUS_EXPIRED
		order._status_log_note = 'Order expired after provider matching timeout.'
		order.save(update_fields=['status', 'updated_at'])
		OrderMatch.objects.filter(order=order, status=OrderMatch.STATUS_NOTIFIED).update(
			status=OrderMatch.STATUS_EXPIRED,
			responded_at=now,
		)
