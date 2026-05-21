from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from orders.models import Order, OrderAssignment, OrderStatusLog


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
	assignment = OrderAssignment.objects.filter(order=instance).first()
	if assignment is None:
		return
	provider = assignment.provider
	if not provider.is_available:
		provider.is_available = True
		provider.save(update_fields=['is_available', 'updated_at'])
