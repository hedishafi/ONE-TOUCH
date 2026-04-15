from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from .models import DeletedProviderRecord, User, UserRegistrationNotification


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


@receiver(post_save, sender=User)
def notify_admin_on_user_registration(sender, instance: User, created, **kwargs):
	"""
	Send notification to admin when a new user registers.
	This allows admin to review and approve the user before activation.
	"""
	if not created:
		return

	# Create notification record for admin review
	try:
		UserRegistrationNotification.objects.create(
			user=instance,
			user_name=instance.get_full_name() or '',
			phone_number=instance.phone_number,
			role=instance.role,
			provider_uid=instance.provider_uid or '',
		)
	except Exception:
		# Fail silently to avoid breaking user registration
		pass

	# Create admin log entry for new user registration
	try:
		from django.contrib.admin.models import LogEntry, ADDITION
		from django.contrib.contenttypes.models import ContentType
		from django.utils import timezone

		content_type = ContentType.objects.get_for_model(User)
		
		# Get the first superuser as the actor (or None if no superuser exists)
		admin_user = User.objects.filter(is_superuser=True).first()
		
		if admin_user:
			LogEntry.objects.create(
				user_id=admin_user.id,
				content_type_id=content_type.id,
				object_id=instance.id,
				object_repr=str(instance),
				action_flag=ADDITION,
				change_message=f'New {instance.get_role_display()} registered: {instance.get_full_name() or instance.phone_number} at {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}'
			)
	except Exception:
		# Fail silently to avoid breaking user registration
		pass

	# Optional: Send email notification to admin
	# This can be enabled if email service is configured
	try:
		from django.conf import settings
		from django.core.mail import send_mail
		from django.utils import timezone
		
		# Only send email if admin email is configured
		admin_emails = getattr(settings, 'ADMIN_NOTIFICATION_EMAILS', [])
		if admin_emails and getattr(settings, 'EMAIL_BACKEND', None):
			user_name = instance.get_full_name() or instance.phone_number or instance.username
			role = instance.get_role_display()
			registration_time = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
			
			subject = f'New User Registration: {role}'
			message = f"""
A new user has registered on OneTouch:

Name: {user_name}
Phone: {instance.phone_number}
Role: {role}
Registration Time: {registration_time}
Provider UID: {instance.provider_uid if instance.role == User.ROLE_PROVIDER else 'N/A'}

Please review and approve this user in the admin panel.
"""
			
			send_mail(
				subject=subject,
				message=message,
				from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@onetouch.local'),
				recipient_list=admin_emails,
				fail_silently=True,
			)
	except Exception:
		# Fail silently to avoid breaking user registration
		pass
