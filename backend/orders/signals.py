from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from orders.models import Order, OrderAssignment, OrderMatch, OrderStatusLog


@receiver(pre_save, sender=Order)
def capture_previous_status(sender, instance, **kwargs):
	if not instance.pk:
		instance._previous_status = ''
		return
	previous = Order.objects.filter(pk=instance.pk).values_list('status', flat=True).first()
	instance._previous_status = previous or ''


@receiver(post_save, sender=Order)
def log_order_status_change(sender, instance, created, **kwargs):
	previous_status = getattr(instance, '_previous_status', '')
	if previous_status == instance.status:
		return

	OrderStatusLog.objects.create(
		order=instance,
		old_status=previous_status or '',
		new_status=instance.status,
		changed_by=getattr(instance, '_status_log_changed_by', None),
		note=getattr(instance, '_status_log_note', ''),
	)


@receiver(post_save, sender=OrderAssignment)
def set_provider_unavailable(sender, instance, created, **kwargs):
	if not created:
		return
	provider = instance.provider
	if provider.is_available:
		provider.is_available = False
		provider.save(update_fields=['is_available', 'updated_at'])


@receiver(post_save, sender=Order)
def set_provider_available_on_complete(sender, instance, **kwargs):
	if instance.status != Order.STATUS_COMPLETED:
		return
	previous_status = getattr(instance, '_previous_status', '')
	if previous_status == Order.STATUS_COMPLETED:
		return

	match = OrderMatch.objects.filter(
		order=instance,
		status=OrderMatch.STATUS_ACCEPTED,
	).select_related('provider').first()
	provider = match.provider if match else None
	if provider is None:
		assignment = OrderAssignment.objects.filter(order=instance).select_related('provider').first()
		provider = assignment.provider if assignment else None
	if provider is None:
		return

	provider.total_jobs = (provider.total_jobs or 0) + 1
	if provider.free_jobs_remaining > 0:
		provider.free_jobs_remaining -= 1
	if not provider.is_available:
		provider.is_available = True
	provider.save(update_fields=['is_available', 'total_jobs', 'free_jobs_remaining', 'updated_at'])
