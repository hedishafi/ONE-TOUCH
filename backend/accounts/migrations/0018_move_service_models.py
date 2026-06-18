from django.db import migrations


def noop(apps, schema_editor):
    """
    This migration is now a no-op because:
    1. ProviderOnboardingSession was removed in migration 0018_remove_legacy_ocr_biometric_flow
    2. Service models are now in the services app
    3. For fresh databases, the services app models are created directly
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0017_deletedproviderrecord'),
        ('services', '0002_service_catalog_move'),
    ]

    operations = [
        migrations.RunPython(noop, migrations.RunPython.noop),
    ]
