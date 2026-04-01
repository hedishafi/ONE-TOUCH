from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import DeletedProviderRecord, User


@receiver(pre_delete, sender=User)
def create_deleted_provider_record(sender, instance: User, **kwargs):
	if instance.role != User.ROLE_PROVIDER:
		return

	DeletedProviderRecord.objects.update_or_create(
		phone_number=instance.phone_number,
		defaults={
			'provider_uid': instance.provider_uid or '',
		},
	)
