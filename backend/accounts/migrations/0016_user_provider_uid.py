from django.db import migrations, models
import random


def backfill_provider_uid(apps, schema_editor):
    User = apps.get_model('accounts', 'User')

    used_uids = set(
        User.objects.exclude(provider_uid__isnull=True)
        .exclude(provider_uid='')
        .values_list('provider_uid', flat=True)
    )

    for user in User.objects.filter(role='provider').filter(provider_uid__isnull=True):
        candidate = f'{random.randint(0, 999_999):06d}'
        while candidate in used_uids:
            candidate = f'{random.randint(0, 999_999):06d}'
        used_uids.add(candidate)
        user.provider_uid = candidate
        user.save(update_fields=['provider_uid'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_providerprofile_profile_picture'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='provider_uid',
            field=models.CharField(blank=True, db_index=True, max_length=6, null=True, unique=True),
        ),
        migrations.RunPython(backfill_provider_uid, migrations.RunPython.noop),
    ]
